package fr.corpusmots.comptes.service;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.comptes.persistance.StatutEnseignant;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.text.Collator;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Administration › Comptes (FR-1, FR-32) : liste de l'équipe, invitation d'un collègue, renvoi de l'invitation,
 * désactivation, réactivation et rôle d'administrateur. Jamais de transaction autour : la base se lit ou s'écrit par
 * {@link ComptesService}, Keycloak s'appelle hors transaction (AD-17, AD-18), sauf sous le verrou des administrateurs
 * ({@link ComptesService#sousVerrouAdministrateurs}).
 */
@ApplicationScoped
public class ComptesAdministration {

    static final String CODE_EMAIL_DEJA_UTILISE = "compte.email_deja_utilise";
    static final String CODE_REQUETE_INVALIDE = "requete.invalide";
    static final String CODE_DERNIER_ADMINISTRATEUR = "compte.dernier_administrateur";
    static final String CODE_AUTO_DESACTIVATION = "compte.auto_desactivation";

    /**
     * Une partie locale, un {@code @}, un domaine avec au moins un point ; sans espace, caractère de contrôle ni
     * caractère que Keycloak refuse ({@code <>()[],;:"'}).
     */
    private static final Pattern EMAIL = Pattern.compile(
            "[^@\\s\\p{Cntrl}<>()\\[\\],;:\"']+@[^@\\s\\p{Cntrl}<>()\\[\\],;:\"'.]+(\\.[^@\\s\\p{Cntrl}<>()\\[\\],;:\"'.]+)+");
    /** Longueur maximale d'une adresse (RFC 5321), au-delà de laquelle Keycloak refuse l'utilisateur. */
    static final int LONGUEUR_MAX_EMAIL = 254;

    @Inject
    ComptesService comptes;

    @Inject
    Identites identites;

    @Inject
    InvitationService invitations;

    /**
     * Comptes de l'équipe (hors {@code supprime}) : invités d'abord, par e-mail ; puis par nom affiché, dans l'ordre
     * alphabétique français, sans tenir compte de la casse ni des accents.
     */
    public List<CompteVue> lister() {
        List<ComptesService.EnseignantLu> equipe = comptes.enseignantsDeLEquipe();
        Map<UUID, IdentiteVue> parId = identites.lister().stream()
                .collect(Collectors.toMap(IdentiteVue::id, Function.identity(), (premiere, seconde) -> premiere));
        return equipe.stream()
                .map(enseignant -> {
                    IdentiteVue identite = parId.get(enseignant.id());
                    return new CompteVue(enseignant.id(), enseignant.nomAffiche(),
                            identite == null || identite.email() == null ? "" : identite.email(),
                            enseignant.statut(), identite != null && identite.administrateur());
                })
                .sorted(ordre())
                .toList();
    }

    /**
     * Invite un collègue comme enseignant (le rôle d'administrateur se donne ensuite, story 1.6).
     *
     * @return le compte créé, au statut {@code invite}
     * @throws ErreurMetier {@code 400 requete.invalide} si l'e-mail n'en est pas un (aucun appel Keycloak),
     *         {@code 409 compte.email_deja_utilise} s'il appartient déjà à un utilisateur Keycloak
     */
    public CompteVue inviter(String email) {
        String adresse = normaliser(email);
        try {
            UUID id = invitations.inviter(adresse, false);
            return new CompteVue(id, null, adresse, StatutEnseignant.INVITE.valeur(), false);
        } catch (IdentiteDejaExistante dejaExistante) {
            throw new ErreurMetier(409, CODE_EMAIL_DEJA_UTILISE, "Cet e-mail est déjà associé à un compte");
        }
    }

    /**
     * Renvoie l'e-mail « Créer mon mot de passe » (nouveau lien de 7 jours) : vérification en base, puis Keycloak.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable}, {@code 409 compte.invitation_inutile}
     */
    public void renvoyerInvitation(UUID id) {
        comptes.verifierInvite(id);
        identites.envoyerInvitation(id);
    }

    /**
     * Désactive un compte (FR-32) : Keycloak {@code enabled=false} et sessions révoquées, puis {@code statut =
     * desactive} (AD-18) ; aucune donnée effacée.
     *
     * @param acteur l'administrateur qui agit, qui ne peut pas se désactiver lui-même
     * @throws ErreurMetier {@code 404 ressource.introuvable}, {@code 409 compte.auto_desactivation},
     *         {@code 409 compte.statut_incompatible} s'il n'est ni invité ni actif,
     *         {@code 409 compte.dernier_administrateur} s'il est le seul administrateur actif
     */
    public void desactiver(UUID id, UUID acteur) {
        if (id.equals(acteur)) {
            throw new ErreurMetier(409, CODE_AUTO_DESACTIVATION, "Un administrateur ne se désactive pas lui-même");
        }
        comptes.verifierDesactivable(id);
        comptes.sousVerrouAdministrateurs(() -> {
            exigerUnAutreAdministrateurActif(id);
            identites.desactiver(id);
        });
        comptes.desactiver(id);
    }

    /**
     * Réactive un compte désactivé : Keycloak {@code enabled=true}, puis {@code statut = actif}, ou {@code invite} s'il
     * n'a jamais été activé (AD-18).
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable}, {@code 409 compte.statut_incompatible} s'il n'est pas
     *         désactivé
     */
    public void reactiver(UUID id) {
        comptes.verifierReactivable(id);
        identites.reactiver(id);
        comptes.reactiver(id);
    }

    /**
     * Donne ou retire le rôle d'administrateur, dans Keycloak seulement (jamais copié en base, AD-6) ; il s'applique
     * au prochain jeton de l'enseignant.
     *
     * @throws ErreurMetier {@code 404 ressource.introuvable}, {@code 409 compte.statut_incompatible} pour un compte en
     *         cours de suppression, {@code 409 compte.dernier_administrateur} pour retirer le rôle du seul
     *         administrateur actif
     */
    public void changerRoleAdministrateur(UUID id, boolean administrateur) {
        comptes.verifierRoleModifiable(id);
        if (administrateur) {
            identites.donnerRoleAdministrateur(id);
        } else {
            comptes.sousVerrouAdministrateurs(() -> {
                exigerUnAutreAdministrateurActif(id);
                identites.retirerRoleAdministrateur(id);
            });
        }
    }

    /**
     * Refuse l'action s'il ne resterait aucun autre administrateur actif : membre activé du rôle {@code admin} dans
     * Keycloak et Enseignant {@code actif} en base (un invité ou un désactivé ne peut pas administrer). Lu sous
     * verrou ; une lecture vide ou incomplète refuse (fermé par défaut).
     */
    private void exigerUnAutreAdministrateurActif(UUID id) {
        Set<UUID> autres = new HashSet<>(comptes.actifsParmi(identites.administrateursActives()));
        autres.remove(id);
        if (autres.isEmpty()) {
            throw new ErreurMetier(409, CODE_DERNIER_ADMINISTRATEUR, "Il doit rester au moins un administrateur actif");
        }
    }

    /** E-mail sans espaces autour et en minuscules ; refusé s'il garde un espace ou n'a pas la forme d'une adresse. */
    static String normaliser(String email) {
        String adresse = email == null ? "" : email.strip().toLowerCase(Locale.ROOT);
        if (adresse.length() > LONGUEUR_MAX_EMAIL || !EMAIL.matcher(adresse).matches()) {
            throw new ErreurMetier(400, CODE_REQUETE_INVALIDE, "Adresse e-mail invalide");
        }
        return adresse;
    }

    private static Comparator<CompteVue> ordre() {
        Collator francais = Collator.getInstance(Locale.FRENCH);
        // PRIMARY : « élodie », « Elodie » et « elodie » sont égaux.
        francais.setStrength(Collator.PRIMARY);
        Comparator<CompteVue> invitesDAbord = Comparator.comparing(
                compte -> !StatutEnseignant.INVITE.valeur().equals(compte.statut()));
        Comparator<CompteVue> parNom = Comparator.comparing(
                compte -> compte.nomAffiche() == null ? "" : compte.nomAffiche(), francais);
        return invitesDAbord.thenComparing(parNom).thenComparing(CompteVue::email, francais);
    }
}

package fr.corpusmots.comptes.service;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.comptes.persistance.StatutEnseignant;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.text.Collator;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Administration › Comptes (FR-1) : liste de l'équipe, invitation d'un collègue, renvoi de l'invitation. Jamais de
 * transaction autour : la base se lit ou s'écrit par {@link ComptesService}, Keycloak s'appelle hors transaction
 * (AD-17, AD-18).
 */
@ApplicationScoped
public class ComptesAdministration {

    static final String CODE_EMAIL_DEJA_UTILISE = "compte.email_deja_utilise";
    static final String CODE_REQUETE_INVALIDE = "requete.invalide";

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

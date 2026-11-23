package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.vocabulaire.persistance.Mot;
import fr.corpusmots.vocabulaire.persistance.MotRepository;
import fr.corpusmots.vocabulaire.persistance.Sens;
import fr.corpusmots.vocabulaire.persistance.SensRepository;
import fr.corpusmots.vocabulaire.persistance.SensRetenuRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.text.Normalizer;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Lexique de l'école (AD-10, AD-19) : seule normalisation des Mots, et seule porte de création des Mots et des Sens.
 *
 * <p>{@link #normaliser} sert à la saisie, à l'import et à la recherche : espaces réduites et rognées, apostrophe
 * {@code ’} unifiée en {@code '}, forme NFC, article initial ({@code le|la|les|un|une|des} suivi d'une espace, ou
 * {@code l'}) retiré, sans tenir compte de la casse ; un article seul est gardé. La clé d'un Mot est sa forme normalisée
 * en minuscules, accents gardés : « côte » et « côté » sont deux Mots, « Lapin » et « lapin » un seul.
 *
 * <p>{@link #obtenirOuCreerMot} et {@link #obtenirOuCreerSens} sont idempotentes ({@code INSERT … ON CONFLICT DO
 * NOTHING} puis relecture) : elles ne lèvent jamais d'erreur de doublon, même appelées en parallèle. Elles rejoignent la
 * transaction de l'appelant (AD-17).
 */
@ApplicationScoped
public class Lexique {

    /** Longueur maximale de la forme d'un Mot, une fois normalisée. */
    public static final int LONGUEUR_MAX_FORME = 100;

    /** Longueur maximale du libellé d'un Sens créé par un enseignant, une fois nettoyé. */
    public static final int LONGUEUR_MAX_LIBELLE_SENS = 40;

    static final String CODE_LIBELLE_SENS_INVALIDE = "sens.libelle_invalide";

    private static final Pattern ESPACES = Pattern.compile("[\\s\\p{Z}\\x{FEFF}]+");
    private static final Pattern ARTICLE_INITIAL = Pattern.compile("^(?:(?:le|la|les|un|une|des) |l')",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    @Inject
    MotRepository mots;

    @Inject
    SensRepository sens;

    @Inject
    SensRetenuRepository sensRetenus;

    /** Forme normalisée de {@code saisie} (voir la classe) ; chaîne vide pour {@code null} ou une saisie blanche. */
    public static String normaliser(String saisie) {
        String texte = nettoyer(saisie);
        String sansArticle = ARTICLE_INITIAL.matcher(texte).replaceFirst("").strip();
        return sansArticle.isEmpty() ? texte : sansArticle;
    }

    /**
     * Clé d'une saisie de recherche (filtre Mot de la Banque, FR-15) : {@link #cle} de {@code normaliser(saisie)},
     * à comparer à {@code mot.forme_recherche} par {@code unaccent}, comme la détection. Vide si la saisie est vide ou
     * réduite à un article seul ({@code la}, {@code l'}…), même après retrait d'un article initial ({@code les la}) :
     * elle ne cherche alors aucun Mot.
     */
    static Optional<String> cleDeRecherche(String saisie) {
        String texte = nettoyer(saisie);
        if (texte.isEmpty() || articleSeul(texte)) {
            return Optional.empty();
        }
        String forme = normaliser(texte);
        return articleSeul(forme) ? Optional.empty() : Optional.of(cle(forme));
    }

    /** Vrai si {@code texte}, déjà nettoyé, n'est qu'un article ({@code la}, {@code l'}…). */
    private static boolean articleSeul(String texte) {
        return ARTICLE_INITIAL.matcher(texte + " ").replaceFirst("").isBlank();
    }

    /** Clé d'unicité d'une forme déjà normalisée : minuscules NFC, accents gardés ({@code mot.forme_cle}). */
    static String cle(String forme) {
        return Normalizer.normalize(forme.toLowerCase(Locale.ROOT), Normalizer.Form.NFC);
    }

    /** Espaces réduites et rognées, apostrophe unifiée, forme NFC ; chaîne vide pour {@code null}. */
    private static String nettoyer(String texte) {
        if (texte == null) {
            return "";
        }
        String nettoye = ESPACES.matcher(texte.replace('’', '\'')).replaceAll(" ").strip();
        return Normalizer.normalize(nettoye, Normalizer.Form.NFC);
    }

    /**
     * Mot de forme {@code normaliser(saisie)}, créé s'il n'existe pas encore. Un Mot existant garde sa première forme :
     * « Lapin » saisi après « lapin » renvoie le Mot « lapin ».
     *
     * @throws IllegalArgumentException si la forme normalisée est vide ou dépasse {@link #LONGUEUR_MAX_FORME}
     *         caractères : l'appelant vérifie la saisie avant
     */
    @Transactional
    public MotVue obtenirOuCreerMot(String saisie) {
        String forme = normaliser(saisie);
        if (forme.isEmpty() || forme.length() > LONGUEUR_MAX_FORME) {
            throw new IllegalArgumentException("Forme de Mot vide ou de plus de " + LONGUEUR_MAX_FORME + " caractères");
        }
        String cle = cle(forme);
        mots.insererSiAbsent(forme, cle);
        return vue(mots.parCle(cle)
                .orElseThrow(() -> new IllegalStateException("Mot « " + cle + " » introuvable après son insertion")));
    }

    /**
     * Sens de libellé {@code libelle} du Mot {@code motId}, créé s'il n'existe pas encore ; un Sens dont le libellé
     * normalisé est le même est réutilisé en silence, avec sa catégorie.
     *
     * @param categorie catégorie grammaticale, {@code null} pour un Sens « à compléter »
     * @throws IllegalArgumentException si le libellé est vide
     */
    @Transactional
    public SensVue obtenirOuCreerSens(UUID motId, String libelle, String categorie) {
        String nettoye = nettoyer(libelle);
        if (nettoye.isEmpty()) {
            throw new IllegalArgumentException("Libellé de Sens vide");
        }
        String cle = cle(nettoye);
        sens.insererSiAbsent(motId, nettoye, cle, categorie);
        return vue(sens.parCle(motId, cle)
                .orElseThrow(() -> new IllegalStateException("Sens « " + cle + " » introuvable après son insertion")));
    }

    /**
     * Sens que l'enseignant vient de taper dans la Création de Sens (story 2.8) : libellé nettoyé de 1 à
     * {@value #LONGUEUR_MAX_LIBELLE_SENS} caractères, autre que « à compléter » (réservé au Sens par défaut), puis
     * {@link #obtenirOuCreerSens}. Un libellé déjà connu pour ce Mot (même forme normalisée) réutilise ce Sens, avec sa
     * catégorie (AD-19).
     *
     * @throws ErreurMetier {@code 400 sens.libelle_invalide} si le libellé est vide, trop long ou réservé
     * @throws IllegalArgumentException si la catégorie manque : l'appelant la vérifie avant
     */
    @Transactional
    public SensVue obtenirOuCreerSensSaisi(UUID motId, String libelle, CategorieGrammaticale categorie) {
        if (categorie == null) {
            throw new IllegalArgumentException("Catégorie grammaticale absente");
        }
        String nettoye = nettoyer(libelle);
        if (nettoye.isEmpty() || nettoye.length() > LONGUEUR_MAX_LIBELLE_SENS
                || cle(nettoye).equals(cle(Usages.LIBELLE_A_COMPLETER))) {
            throw new ErreurMetier(400, CODE_LIBELLE_SENS_INVALIDE, "Le libellé du sens doit compter de 1 à "
                    + LONGUEUR_MAX_LIBELLE_SENS + " caractères et ne pas valoir « " + Usages.LIBELLE_A_COMPLETER
                    + " »");
        }
        return obtenirOuCreerSens(motId, nettoye, categorie.valeur());
    }

    /** Mots de ces identifiants, par identifiant ; les identifiants inconnus sont absents. */
    @Transactional
    public Map<UUID, MotVue> mots(Collection<UUID> ids) {
        return mots.lire(ids).stream().map(Lexique::vue)
                .collect(Collectors.toMap(MotVue::id, Function.identity()));
    }

    /**
     * Sens retenu de chacun de ces Mots de Préparation ({@code preparation_mot.id}), par identifiant ; ceux qui n'en ont
     * pas sont absents. L'appelant a vérifié que ces Mots sont ceux d'une Préparation de l'enseignant courant.
     */
    @Transactional
    public Map<UUID, SensVue> sensRetenus(Collection<UUID> preparationMotIds) {
        return sensRetenus.sensDe(preparationMotIds).entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, entree -> vue(entree.getValue())));
    }

    /** Sens {@code sensId}, vide s'il n'existe pas. */
    @Transactional
    public Optional<SensVue> sens(UUID sensId) {
        return sensId == null ? Optional.empty() : sens.findByIdOptional(sensId).map(Lexique::vue);
    }

    /** Sens {@code sensId} s'il est un Sens du Mot {@code motId} ; vide s'il n'existe pas ou appartient à un autre Mot. */
    @Transactional
    public Optional<SensVue> sensDuMot(UUID motId, UUID sensId) {
        if (motId == null || sensId == null) {
            return Optional.empty();
        }
        return sens.findByIdOptional(sensId).filter(trouve -> trouve.motId().equals(motId)).map(Lexique::vue);
    }

    /**
     * Tous les Sens du Mot {@code motId}, de tous les enseignants : l'appelant ne révèle que ceux qui sont visibles de
     * l'enseignant courant (AD-2).
     */
    @Transactional
    public List<SensVue> sensDe(UUID motId) {
        return motId == null ? List.of() : sens.duMot(motId).stream().map(Lexique::vue).toList();
    }

    private static MotVue vue(Mot mot) {
        return new MotVue(mot.id(), mot.forme());
    }

    static SensVue vue(Sens sens) {
        return new SensVue(sens.id(), sens.motId(), sens.libelle(), sens.categorie());
    }
}

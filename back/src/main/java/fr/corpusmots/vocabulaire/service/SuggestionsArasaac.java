package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.api.ErreurMetier;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.jboss.logging.Logger;

/**
 * Suggestions de pictogrammes ARASAAC pour un Mot, fichier d'un pictogramme et téléchargement d'un pictogramme choisi
 * (FR-12, story 2.4, AD-9). Sans transaction : ces appels sortants ne s'exécutent jamais dans une transaction ouverte
 * (AD-17), et rien n'est enregistré ici.
 */
@ApplicationScoped
public class SuggestionsArasaac {

    /** Nombre maximal de suggestions montrées sur une Carte « à illustrer ». */
    public static final int NOMBRE_MAX = 3;

    static final String CODE_INDISPONIBLE = "arasaac.indisponible";
    static final String CODE_PICTOGRAMME_INTROUVABLE = "arasaac.pictogramme_introuvable";

    private static final Logger LOG = Logger.getLogger(SuggestionsArasaac.class);

    /** Auteur d'un pictogramme ARASAAC, mention exigée par sa licence. */
    public static final String AUTEUR_PICTOGRAMME = "Sergio Palao, propriété du Gouvernement d'Aragon";

    @Inject
    SourceArasaac source;

    @Inject
    ReductionImages reduction;

    /**
     * Au plus {@link #NOMBRE_MAX} pictogrammes pour {@code mot} (normalisé par le {@link Lexique}, donc sans article),
     * dans l'ordre d'ARASAAC et sans doublon, avec leur premier mot-clé français (à défaut, la forme cherchée) ; liste
     * vide si ARASAAC ne trouve rien.
     *
     * @throws ErreurMetier {@code 400 requete.invalide} pour un Mot absent, vide ou de plus de 100 caractères ;
     *         {@code 503 arasaac.indisponible} si ARASAAC ne répond pas
     */
    public List<SuggestionArasaacVue> suggestions(String mot) {
        String forme = Lexique.normaliser(mot);
        if (forme.isEmpty() || forme.length() > Lexique.LONGUEUR_MAX_FORME) {
            throw new ErreurMetier(400, "requete.invalide", "Mot de 1 à 100 caractères attendu");
        }
        try {
            Set<Long> vus = new HashSet<>();
            return source.rechercher(forme).stream()
                    .filter(pictogramme -> vus.add(pictogramme.id()))
                    .limit(NOMBRE_MAX)
                    .map(pictogramme -> new SuggestionArasaacVue(pictogramme.id(),
                            pictogramme.motsCles().isEmpty() ? forme : pictogramme.motsCles().getFirst()))
                    .toList();
        } catch (ArasaacIndisponible erreur) {
            throw indisponible(erreur);
        }
    }

    /**
     * Fichier PNG du pictogramme {@code idArasaac}, sans copie (ni en base ni sur disque).
     *
     * @throws ErreurMetier {@code 404 arasaac.pictogramme_introuvable} si ARASAAC ne le connaît pas, ou sans appel pour un
     *         identifiant nul ou négatif ; {@code 503 arasaac.indisponible} si ARASAAC ne répond pas
     */
    public byte[] pictogramme(long idArasaac) {
        if (idArasaac <= 0) {
            throw new ErreurMetier(404, CODE_PICTOGRAMME_INTROUVABLE, "Pictogramme ARASAAC inconnu : " + idArasaac);
        }
        try {
            return source.pictogramme(idArasaac)
                    .orElseThrow(() -> new ErreurMetier(404, CODE_PICTOGRAMME_INTROUVABLE,
                            "Pictogramme ARASAAC inconnu : " + idArasaac));
        } catch (ArasaacIndisponible erreur) {
            throw indisponible(erreur);
        }
    }

    /**
     * Télécharge le pictogramme {@code idArasaac} et le réduit par {@link ReductionImages}, hors transaction (AD-9,
     * AD-17), pour en faire une Image : type {@code image_libre}, licence {@code arasaac_cc_by_nc_sa}, source et auteur
     * selon les mentions de la licence ARASAAC (story 2.4, partie 2). Rien n'est enregistré.
     *
     * @throws ErreurMetier {@code 400 requete.invalide} sans appel pour un identifiant nul ou négatif ;
     *         {@code 404 arasaac.pictogramme_introuvable} si ARASAAC ne connaît pas ce pictogramme ;
     *         {@code 503 arasaac.indisponible} si ARASAAC ne répond pas ou renvoie un fichier illisible
     */
    public PictogrammeTelechargeVue telecharger(long idArasaac) {
        if (idArasaac <= 0) {
            throw new ErreurMetier(400, "requete.invalide", "Identifiant ARASAAC positif attendu");
        }
        byte[] octets;
        try {
            octets = source.pictogramme(idArasaac)
                    .orElseThrow(() -> new ErreurMetier(404, CODE_PICTOGRAMME_INTROUVABLE,
                            "Pictogramme ARASAAC inconnu : " + idArasaac));
        } catch (ArasaacIndisponible erreur) {
            throw indisponible(erreur);
        }
        ImageReduiteVue fichier;
        try {
            fichier = reduction.reduire(octets, TypeImage.IMAGE_LIBRE);
        } catch (RuntimeException erreur) {
            // Fichier d'ARASAAC illisible ou réduction en échec : jamais un 500.
            throw indisponible(new ArasaacIndisponible("pictogramme " + idArasaac + " illisible", erreur));
        }
        return new PictogrammeTelechargeVue(fichier, TypeImage.IMAGE_LIBRE, Licence.ARASAAC_CC_BY_NC_SA,
                sourcePictogramme(idArasaac), AUTEUR_PICTOGRAMME);
    }

    /** Source d'un pictogramme ARASAAC, mention exigée par sa licence. */
    public static String sourcePictogramme(long idArasaac) {
        return "ARASAAC (https://arasaac.org), pictogramme n° " + idArasaac;
    }

    private static ErreurMetier indisponible(ArasaacIndisponible erreur) {
        LOG.warn("ARASAAC indisponible : " + erreur.getMessage());
        return new ErreurMetier(503, CODE_INDISPONIBLE, "ARASAAC ne répond pas");
    }
}

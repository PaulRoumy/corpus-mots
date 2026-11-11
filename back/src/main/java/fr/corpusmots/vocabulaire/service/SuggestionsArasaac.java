package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.api.ErreurMetier;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.jboss.logging.Logger;

/**
 * Suggestions de pictogrammes ARASAAC pour un Mot et fichier d'un pictogramme (FR-12, story 2.4, AD-9). Sans
 * transaction : ces appels sortants ne s'exécutent jamais dans une transaction ouverte (AD-17), et rien n'est
 * enregistré.
 */
@ApplicationScoped
public class SuggestionsArasaac {

    /** Nombre maximal de suggestions montrées sur une Carte « à illustrer ». */
    public static final int NOMBRE_MAX = 3;

    static final String CODE_INDISPONIBLE = "arasaac.indisponible";

    private static final Logger LOG = Logger.getLogger(SuggestionsArasaac.class);

    @Inject
    SourceArasaac source;

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
     * @throws ErreurMetier {@code 404 ressource.introuvable} si ARASAAC ne le connaît pas, ou sans appel pour un
     *         identifiant nul ou négatif ; {@code 503 arasaac.indisponible} si ARASAAC ne répond pas
     */
    public byte[] pictogramme(long idArasaac) {
        if (idArasaac <= 0) {
            throw new ErreurMetier(404, "ressource.introuvable", "Pictogramme ARASAAC inconnu : " + idArasaac);
        }
        try {
            return source.pictogramme(idArasaac)
                    .orElseThrow(() -> new ErreurMetier(404, "ressource.introuvable",
                            "Pictogramme ARASAAC inconnu : " + idArasaac));
        } catch (ArasaacIndisponible erreur) {
            throw indisponible(erreur);
        }
    }

    private static ErreurMetier indisponible(ArasaacIndisponible erreur) {
        LOG.warn("ARASAAC indisponible : " + erreur.getMessage());
        return new ErreurMetier(503, CODE_INDISPONIBLE, "ARASAAC ne répond pas");
    }
}

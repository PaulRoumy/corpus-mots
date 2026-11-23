package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.service.Section;
import java.util.UUID;

/**
 * Filtres de la Banque (FR-15), chacun facultatif ({@code null} : ne filtre pas) et à une seule valeur, combinés en
 * ET entre eux et avec la provenance. Ils ne font que restreindre ce que la provenance montre (AD-2).
 *
 * @param mot saisie libre, comparée au Mot exact avec la tolérance de la détection (casse, accents, article
 *        initial) ; vide ou réduite à un article seul, elle ne filtre pas
 * @param sensId Sens de l'Image
 * @param section Section cochée ; sous Mes mots, aussi Section d'une Préparation de l'enseignant qui lie l'Image
 * @param albumId Album d'origine (image d'album seulement)
 * @param moduleId Module de l'Image
 * @param themeId Thème parmi ceux de l'Image
 * @param categorie catégorie grammaticale du Sens de l'Image
 * @param typeImage type de l'Image
 * @param proprietaireId propriétaire de l'Image ; ne fait que restreindre la provenance, sans jamais montrer une
 *        Image privée d'un collègue
 */
public record FiltresBanqueCommande(String mot, UUID sensId, Section section, UUID albumId, UUID moduleId,
        UUID themeId, CategorieGrammaticale categorie, TypeImage typeImage, UUID proprietaireId) {

    /** Aucun filtre. */
    public static final FiltresBanqueCommande AUCUN = new FiltresBanqueCommande(null, null, null, null, null, null,
            null, null, null);
}

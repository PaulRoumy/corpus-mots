package fr.corpusmots.vocabulaire.api;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Sens tapé par le propriétaire dans la Création de Sens de la Carte d'identité, à créer (ou réutiliser) pour l'Image. */
public record NouveauSensImageDto(
        @Schema(required = true, maxLength = 40, description = "Libellé court du Sens, autre que « à compléter » ; un"
                + " libellé déjà connu pour le Mot de l'Image réutilise ce Sens, avec sa catégorie")
        String libelle,
        @Schema(required = true, description = "Catégorie grammaticale du Sens",
                enumeration = { "nom", "verbe", "adjectif", "adverbe", "autre" })
        String categorie) {
}

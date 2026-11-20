package fr.corpusmots.preparations.api;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Sens tapé dans la Création de Sens du Panneau de choix d'Image, à créer (ou réutiliser) et retenir pour le Mot. */
public record NouveauSensMotPreparationDto(
        @Schema(required = true, maxLength = 40, description = "Libellé court du Sens, autre que « à compléter » ; un"
                + " libellé déjà connu pour ce Mot réutilise ce Sens, avec sa catégorie")
        String libelle,
        @Schema(required = true, description = "Catégorie grammaticale du Sens",
                enumeration = { "nom", "verbe", "adjectif", "adverbe", "autre" })
        String categorie) {
}

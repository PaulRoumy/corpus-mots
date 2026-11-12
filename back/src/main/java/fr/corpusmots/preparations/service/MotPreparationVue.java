package fr.corpusmots.preparations.service;

import fr.corpusmots.vocabulaire.service.ImageVue;
import java.util.UUID;

/**
 * Mot d'une Préparation de l'enseignant courant, à sa place {@code ordre} : {@code forme} du Mot (première forme saisie
 * dans l'école), Sens retenu par l'enseignant ({@code categorieSens} absente pour un Sens « à compléter »), Thème
 * {@code themeId} ({@code null} : sans thème) et Image liée ({@code null} : Mot « à illustrer »).
 */
public record MotPreparationVue(UUID id, UUID motId, String forme, int ordre, UUID sensId, String libelleSens,
        String categorieSens, UUID themeId, ImageVue image) {

    /** Vrai si une Image est liée au Mot dans cette Préparation. */
    public boolean illustre() {
        return image != null;
    }
}

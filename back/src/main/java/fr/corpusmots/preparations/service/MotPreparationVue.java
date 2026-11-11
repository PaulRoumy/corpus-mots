package fr.corpusmots.preparations.service;

import java.util.UUID;

/**
 * Mot d'une Préparation de l'enseignant courant, à sa place {@code ordre} : {@code forme} du Mot (première forme saisie
 * dans l'école), Sens retenu par l'enseignant ({@code categorieSens} absente pour un Sens « à compléter ») et
 * {@code illustre}, vrai si une Image lui est liée (toujours faux avant la story 2.4).
 */
public record MotPreparationVue(UUID id, UUID motId, String forme, int ordre, UUID sensId, String libelleSens,
        String categorieSens, boolean illustre) {
}

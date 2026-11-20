package fr.corpusmots.preparations.api;

import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/**
 * Mot tapé dans le Champ de saisie rapide, tel quel : le back le normalise (espaces, apostrophes, article). Le Sens
 * choisi ({@code sensId}) ou créé ({@code nouveauSens}) dans le Panneau de détection est facultatif ; jamais les deux.
 * La saisie est ignorée quand {@code motId} est donné, et quand {@code sensId} est donné (Mot du Sens) ;
 * {@code motId} seul est refusé.
 */
public record NouveauMotPreparationDto(
        @Schema(required = true, description = "De 1 à 100 caractères une fois normalisé ; ignorée quand motId est"
                + " donné, ou quand sensId est donné (le Mot est alors celui du Sens)")
        String saisie,
        @Schema(description = "Mot détecté auquel s'applique sensId ou nouveauSens, jamais seul ; sans lui, le Mot du"
                + " Sens choisi, ou celui de la saisie pour un nouveau Sens")
        UUID motId,
        @Schema(description = "Sens visible du Mot, à retenir pour lui") UUID sensId,
        @Schema(description = "Sens tapé dans la Création de Sens, obtenu ou créé pour le Mot et retenu")
        NouveauSensMotPreparationDto nouveauSens) {
}

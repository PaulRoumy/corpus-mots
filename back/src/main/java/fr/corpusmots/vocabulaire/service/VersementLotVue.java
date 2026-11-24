package fr.corpusmots.vocabulaire.service;

import java.util.List;
import java.util.UUID;

/**
 * Résultat d'un versement en lot ({@link Versements#verserLot}), dans l'ordre de la demande : les Images versées par
 * cet appel ({@code privee → versee}), celles qui l'étaient déjà (inchangées), et les refusées avec leur code.
 */
public record VersementLotVue(List<UUID> versees, List<UUID> dejaVersees, List<RefusVersementVue> refusees) {
}

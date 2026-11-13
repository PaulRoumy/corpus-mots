package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.service.Section;
import java.util.List;
import java.util.UUID;

/**
 * Nouveau classement d'une Image par son propriétaire (FR-14) : ses Sections, son Module ({@code null} : aucun) et
 * ses Thèmes. Les trois valeurs remplacent ensemble celles de l'Image ; les doublons sont ignorés.
 */
public record ClasserImageCommande(List<Section> sections, UUID moduleId, List<UUID> themeIds) {
}

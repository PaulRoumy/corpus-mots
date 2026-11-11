package fr.corpusmots.vocabulaire.service;

import java.util.UUID;

/** Sens d'un Mot ; {@code categorie} (catégorie grammaticale) est {@code null} pour un Sens « à compléter ». */
public record SensVue(UUID id, UUID motId, String libelle, String categorie) {
}

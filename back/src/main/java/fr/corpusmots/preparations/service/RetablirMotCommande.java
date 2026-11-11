package fr.corpusmots.preparations.service;

import java.util.UUID;

/**
 * Rétablissement d'un Mot retiré d'une Préparation : le Mot {@code motId}, avec le Sens {@code sensId} qu'il avait, à
 * sa place {@code ordre} si elle est libre, sinon en fin ({@code ordre} absent compris), avec le Thème {@code themeId}
 * qu'il avait ({@code null} : sans thème ; un Thème qui n'existe plus est ignoré).
 */
public record RetablirMotCommande(UUID motId, UUID sensId, Integer ordre, UUID themeId) {
}

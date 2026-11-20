package fr.corpusmots.vocabulaire.service;

import java.util.UUID;

/**
 * Création de Sens pour le Mot de Préparation {@code preparationMotId} d'une Préparation de l'enseignant courant : le
 * Sens de libellé {@code libelle} et de catégorie {@code categorie}, obtenu ou créé, devient le Sens retenu (Panneau de
 * choix d'Image, story 2.8).
 */
public record CreerSensCommande(UUID preparationMotId, String libelle, CategorieGrammaticale categorie) {
}

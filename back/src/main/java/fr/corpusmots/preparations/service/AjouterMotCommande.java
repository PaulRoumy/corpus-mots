package fr.corpusmots.preparations.service;

import fr.corpusmots.vocabulaire.service.CategorieGrammaticale;
import java.util.UUID;

/**
 * Mot ajouté par le Champ de saisie rapide (stories 2.3 et 2.8). Sans {@code sensId} ni {@code nouveauSens}, le Mot de
 * {@code saisie} est obtenu ou créé et reçoit son Sens habituel. Avec {@code sensId}, le Mot {@code motId} (ou, à
 * défaut, celui du Sens) est ajouté avec ce Sens visible. Avec {@code nouveauSens}, le Mot {@code motId} (ou, à défaut,
 * celui de {@code saisie}, obtenu ou créé) est ajouté avec le Sens tapé, obtenu ou créé (AD-19).
 */
public record AjouterMotCommande(String saisie, UUID motId, UUID sensId, NouveauSens nouveauSens) {

    /** Commande de la seule saisie : le Mot reçoit son Sens habituel. */
    public AjouterMotCommande(String saisie) {
        this(saisie, null, null, null);
    }

    /** Sens tapé dans la Création de Sens du Panneau de détection ; la catégorie est déjà vérifiée. */
    public record NouveauSens(String libelle, CategorieGrammaticale categorie) {
    }
}

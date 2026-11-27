package fr.corpusmots.preparations.service;

import java.util.UUID;

/**
 * « Utiliser dans une préparation » depuis la Banque (story 3.4) : l'Image {@code imageId} est liée au Mot qu'elle
 * illustre dans la Préparation, ajouté au besoin ; {@code remplacer} autorise à délier l'Image qu'il a déjà.
 */
public record UtiliserImageCommande(UUID imageId, boolean remplacer) {
}

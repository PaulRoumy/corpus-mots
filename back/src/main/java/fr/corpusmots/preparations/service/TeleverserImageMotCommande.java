package fr.corpusmots.preparations.service;

import fr.corpusmots.vocabulaire.service.ImageReduiteVue;
import fr.corpusmots.vocabulaire.service.Licence;
import fr.corpusmots.vocabulaire.service.TypeImage;

/**
 * Image téléversée depuis la Carte d'un Mot de Préparation : le fichier, déjà réduit pour ce type par
 * {@code ReductionImages#reduire} avant la transaction, son type, sa licence ({@code null} : non renseignée), sa source et son auteur
 * (facultatifs). L'Album d'origine est celui de la Préparation.
 */
public record TeleverserImageMotCommande(ImageReduiteVue fichier, TypeImage typeImage, Licence licence, String source,
        String auteur) {
}

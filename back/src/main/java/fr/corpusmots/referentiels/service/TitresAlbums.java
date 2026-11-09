package fr.corpusmots.referentiels.service;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Forme de recherche d'un titre d'Album, stockée dans {@code album.titre_recherche} et appliquée au texte cherché :
 * espaces réduites et rognées, apostrophe {@code ’} unifiée en {@code '}, minuscules, accents retirés, article
 * initial ({@code le|la|les|un|une|des} suivi d'une espace, ou {@code l'}) retiré. Un article seul est conservé.
 *
 * <p>Propre à {@code referentiels} : {@code vocabulaire.service.Lexique}, qui normalise les Mots, appartient à un
 * module que {@code referentiels} n'a pas le droit d'appeler (AD-1).
 */
public final class TitresAlbums {

    private static final Pattern ESPACES = Pattern.compile("[\\s\\p{Z}\\x{FEFF}]+");
    private static final Pattern DIACRITIQUES = Pattern.compile("\\p{M}+");
    private static final Pattern ARTICLE_INITIAL = Pattern.compile("^(?:(?:le|la|les|un|une|des) |l')");

    private TitresAlbums() {
    }

    /** {@code texte} aux espaces réduites et rognées, tel qu'il est enregistré ; chaîne vide pour {@code null}. */
    public static String nettoyer(String texte) {
        return texte == null ? "" : ESPACES.matcher(texte).replaceAll(" ").strip();
    }

    /** Forme de recherche de {@code titre} ; chaîne vide pour {@code null}. */
    public static String normaliser(String titre) {
        if (titre == null) {
            return "";
        }
        String texte = nettoyer(titre)
                .replace('’', '\'')
                .toLowerCase(Locale.ROOT);
        texte = DIACRITIQUES.matcher(Normalizer.normalize(texte, Normalizer.Form.NFD)).replaceAll("");
        texte = Normalizer.normalize(texte, Normalizer.Form.NFC);
        String sansArticle = ARTICLE_INITIAL.matcher(texte).replaceFirst("").strip();
        return sansArticle.isEmpty() ? texte : sansArticle;
    }
}

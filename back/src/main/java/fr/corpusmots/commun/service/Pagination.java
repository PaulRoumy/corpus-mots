package fr.corpusmots.commun.service;

import fr.corpusmots.commun.api.ErreurMetier;

/**
 * Pagination d'une liste (conventions de l'architecture) : {@code ?page=&taille=}, page à partir de 0, taille de 1 à
 * {@value #TAILLE_MAX} ; la réponse porte {@code { elements, total }}.
 */
public record Pagination(int page, int taille) {

    public static final int TAILLE_MAX = 100;
    public static final int TAILLE_PAR_DEFAUT = 20;

    static final String CODE_REQUETE_INVALIDE = "requete.invalide";

    /**
     * Pagination demandée, {@code 0} et {@value #TAILLE_PAR_DEFAUT} par défaut.
     *
     * @throws ErreurMetier {@code 400 requete.invalide} si la page est négative ou la taille hors de 1 à
     *         {@value #TAILLE_MAX}
     */
    public static Pagination de(Integer page, Integer taille) {
        int numero = page == null ? 0 : page;
        int nombre = taille == null ? TAILLE_PAR_DEFAUT : taille;
        if (numero < 0 || nombre < 1 || nombre > TAILLE_MAX || (long) numero * nombre + nombre > Integer.MAX_VALUE) {
            throw new ErreurMetier(400, CODE_REQUETE_INVALIDE,
                    "page doit être positive ou nulle, taille comprise entre 1 et " + TAILLE_MAX);
        }
        return new Pagination(numero, nombre);
    }

    /** Rang du premier élément de la page. */
    public int decalage() {
        return page * taille;
    }
}

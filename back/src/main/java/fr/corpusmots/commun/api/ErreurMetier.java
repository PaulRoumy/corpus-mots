package fr.corpusmots.commun.api;

/**
 * Erreur métier levée par un service ou une ressource : elle porte le statut HTTP et le {@code code} stable
 * renvoyés au front dans une réponse RFC 9457 ({@code application/problem+json}).
 *
 * <p>Le {@code code} (par exemple {@code image.versement.licence_non_versable}) est traduit en message français
 * par le front ; le message de l'exception n'est qu'un détail destiné aux développeurs.
 */
public class ErreurMetier extends RuntimeException {

    private final int status;
    private final String code;

    public ErreurMetier(int status, String code, String detail) {
        super(detail);
        if (status < 400 || status > 599) {
            throw new IllegalArgumentException("Statut HTTP d'erreur attendu (4xx ou 5xx) : " + status);
        }
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Le code d'erreur est obligatoire");
        }
        this.status = status;
        this.code = code;
    }

    public int status() {
        return status;
    }

    public String code() {
        return code;
    }
}

package fr.corpusmots.commun.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.exc.MismatchedInputException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.Response;
import org.jboss.logging.Logger;
import org.jboss.resteasy.reactive.server.ServerExceptionMapper;

/**
 * Transforme toute erreur levée sous {@code /api} en réponse RFC 9457 ({@code application/problem+json})
 * portant un {@code code} stable.
 */
public class ErreursMappers {

    static final String CODE_INTROUVABLE = "ressource.introuvable";
    static final String CODE_INTERNE = "erreur.interne";

    private static final Logger LOG = Logger.getLogger(ErreursMappers.class);

    @ServerExceptionMapper
    public Response erreurMetier(ErreurMetier erreur) {
        return ProblemeDto.de(erreur.status(), erreur.code(), erreur.getMessage()).enReponse();
    }

    @ServerExceptionMapper
    public Response erreurHttp(WebApplicationException erreur) {
        Response origine = erreur.getResponse();
        int status = origine.getStatus();
        String code = codeHttp(status);
        if (status >= 500) {
            LOG.error("Erreur HTTP " + status + " sous /api", erreur);
            code = CODE_INTERNE;
        }
        Response.ResponseBuilder reponse = ProblemeDto.de(status, code, null).constructeurDeReponse();
        // En-têtes porteurs de sens (Allow, WWW-Authenticate, Retry-After…) conservés ; le corps est remplacé.
        origine.getHeaders().forEach((nom, valeurs) -> {
            if (!nom.equalsIgnoreCase(HttpHeaders.CONTENT_TYPE) && !nom.equalsIgnoreCase(HttpHeaders.CONTENT_LENGTH)) {
                valeurs.forEach(valeur -> reponse.header(nom, valeur));
            }
        });
        return reponse.build();
    }

    @ServerExceptionMapper
    public Response jsonIllisible(JsonProcessingException erreur) {
        return ProblemeDto.de(400, codeHttp(400), null).enReponse();
    }

    // Déclaré à part : sinon le mapper intégré de quarkus-rest-jackson, plus précis, l'emporterait.
    @ServerExceptionMapper
    public Response jsonDeMauvaisType(MismatchedInputException erreur) {
        return jsonIllisible(erreur);
    }

    @ServerExceptionMapper
    public Response erreurInattendue(Exception erreur) {
        // Ni trace ni message interne dans la réponse : seulement dans le journal du serveur.
        LOG.error("Erreur inattendue sous /api", erreur);
        return ProblemeDto.de(500, CODE_INTERNE, null).enReponse();
    }

    static String codeHttp(int status) {
        return switch (status) {
            case 400 -> "requete.invalide";
            case 401 -> "authentification.requise";
            case 403 -> "acces.refuse";
            case 404 -> CODE_INTROUVABLE;
            case 405 -> "methode.non_autorisee";
            case 406 -> "format.non_acceptable";
            case 413 -> "requete.trop_volumineuse";
            case 415 -> "format.non_supporte";
            default -> "http." + status;
        };
    }
}

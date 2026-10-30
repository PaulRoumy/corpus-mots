package fr.corpusmots.commun.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

/**
 * Corps d'une réponse d'erreur RFC 9457 ({@code application/problem+json}), complété du champ {@code code}
 * stable que le front traduit en message français.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProblemeDto(String type, String title, int status, String detail, String code) {

    public static final String MEDIA_TYPE = "application/problem+json";

    private static final String TYPE_PAR_DEFAUT = "about:blank";

    public static ProblemeDto de(int status, String code, String detail) {
        Response.Status.Family famille = Response.Status.Family.familyOf(status);
        Response.StatusType statut = Response.Status.fromStatusCode(status);
        String titre = statut != null ? statut.getReasonPhrase()
                : famille == Response.Status.Family.CLIENT_ERROR ? "Client Error" : "Server Error";
        return new ProblemeDto(TYPE_PAR_DEFAUT, titre, status, detail, code);
    }

    public Response enReponse() {
        return constructeurDeReponse().build();
    }

    public Response.ResponseBuilder constructeurDeReponse() {
        return Response.status(status).type(MediaType.valueOf(MEDIA_TYPE)).entity(this);
    }
}

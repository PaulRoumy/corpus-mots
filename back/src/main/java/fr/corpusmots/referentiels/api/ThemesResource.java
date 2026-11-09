package fr.corpusmots.referentiels.api;

import fr.corpusmots.referentiels.service.ReferentielsService;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.Operation;

/** Thèmes de l'école (FR-5), ouverts à tout enseignant actif. */
@Path("/themes")
@Produces(MediaType.APPLICATION_JSON)
public class ThemesResource {

    @Inject
    ReferentielsService referentiels;

    @GET
    @Operation(operationId = "listerThemes", summary = "Thèmes de l'école, par nom")
    public List<ThemeDto> lister() {
        return referentiels.themes().stream().map(ThemeDto::de).toList();
    }
}

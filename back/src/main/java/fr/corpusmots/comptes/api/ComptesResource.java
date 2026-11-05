package fr.corpusmots.comptes.api;

import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.commun.service.EnseignantCourant;
import fr.corpusmots.comptes.service.ComptesAdministration;
import fr.corpusmots.comptes.service.ComptesService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.jboss.resteasy.reactive.ResponseStatus;

/** Administration › Comptes (FR-1, FR-32), réservée aux administrateurs : un autre rôle reçoit {@code 403 acces.refuse}. */
@Path("/comptes")
@Produces(MediaType.APPLICATION_JSON)
@RolesAllowed(ComptesService.ROLE_ADMINISTRATEUR)
public class ComptesResource {

    @Inject
    ComptesAdministration administration;

    @Inject
    EnseignantCourant enseignantCourant;

    @GET
    @Operation(operationId = "listerComptes", summary = "Comptes de l'équipe, invités d'abord")
    public List<CompteDto> lister() {
        return administration.lister().stream().map(CompteDto::de).toList();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @ResponseStatus(201)
    @Operation(operationId = "inviter", summary = "Inviter un collègue par e-mail")
    @APIResponse(responseCode = "201", description = "Compte créé au statut invite, e-mail envoyé",
            content = @Content(mediaType = MediaType.APPLICATION_JSON, schema = @Schema(implementation = CompteDto.class)))
    public CompteDto inviter(InvitationDto invitation) {
        return CompteDto.de(administration.inviter(invitation == null ? null : invitation.email()));
    }

    @POST
    @Path("/{id}/invitation")
    @Operation(operationId = "renvoyerInvitation", summary = "Renvoyer l'e-mail d'invitation (nouveau lien de 7 jours)")
    @APIResponse(responseCode = "204", description = "Invitation renvoyée")
    public void renvoyerInvitation(@PathParam("id") UUID id) {
        administration.renvoyerInvitation(id);
    }

    @POST
    @Path("/{id}/desactivation")
    @Operation(operationId = "desactiverCompte",
            summary = "Désactiver un compte : connexion et API refusées, sessions révoquées, rien n'est effacé")
    @APIResponse(responseCode = "204", description = "Compte désactivé")
    public void desactiver(@PathParam("id") UUID id) {
        administration.desactiver(id, enseignantCourant.id());
    }

    @POST
    @Path("/{id}/reactivation")
    @Operation(operationId = "reactiverCompte", summary = "Réactiver un compte désactivé")
    @APIResponse(responseCode = "204", description = "Compte réactivé")
    public void reactiver(@PathParam("id") UUID id) {
        administration.reactiver(id);
    }

    @PUT
    @Path("/{id}/administrateur")
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(operationId = "changerRoleAdministrateur",
            summary = "Donner ou retirer le rôle d'administrateur (appliqué au prochain jeton du compte)")
    @APIResponse(responseCode = "204", description = "Rôle modifié")
    public void changerRoleAdministrateur(@PathParam("id") UUID id, RoleAdministrateurDto role) {
        if (role == null || role.administrateur() == null) {
            throw new ErreurMetier(400, "requete.invalide", "Le champ administrateur est obligatoire");
        }
        administration.changerRoleAdministrateur(id, role.administrateur());
    }
}

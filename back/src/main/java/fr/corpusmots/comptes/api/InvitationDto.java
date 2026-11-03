package fr.corpusmots.comptes.api;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Invitation d'un collègue : son e-mail, normalisé et validé par le back. */
public record InvitationDto(@Schema(required = true) String email) {
}

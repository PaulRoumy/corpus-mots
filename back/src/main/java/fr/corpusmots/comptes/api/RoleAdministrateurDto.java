package fr.corpusmots.comptes.api;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Rôle d'administrateur voulu pour un compte : {@code true} le donne, {@code false} le retire. */
public record RoleAdministrateurDto(@Schema(required = true) Boolean administrateur) {
}

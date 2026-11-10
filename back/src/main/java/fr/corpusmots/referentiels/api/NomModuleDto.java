package fr.corpusmots.referentiels.api;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** Nom d'un Module, à la création comme au renommage : 1 à 200 caractères, espaces superflues retirées. */
public record NomModuleDto(@Schema(required = true, maxLength = 200) String nom) {
}

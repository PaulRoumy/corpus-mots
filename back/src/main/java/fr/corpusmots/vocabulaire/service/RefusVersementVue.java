package fr.corpusmots.vocabulaire.service;

import java.util.UUID;

/**
 * Image refusée d'un versement en lot, avec le code de son refus : {@code image.indisponible},
 * {@code image.reservee_au_proprietaire} ou un motif de {@link Versabilite}. {@code licence} est la valeur de la
 * licence de l'Image pour le motif {@code image.versement.licence_non_versable} ({@code null} si elle est absente :
 * licence à préciser), et {@code null} pour tout autre code.
 */
public record RefusVersementVue(UUID imageId, String code, String licence) {
}

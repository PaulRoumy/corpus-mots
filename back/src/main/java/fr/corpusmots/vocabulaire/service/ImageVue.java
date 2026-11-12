package fr.corpusmots.vocabulaire.service;

import java.util.UUID;

/**
 * Image vue par l'enseignant courant (AD-16) : {@code aRemplacer} ({@code null}, {@code retiree} ou
 * {@code supprimee}) est calculé à la lecture et toujours {@code null} avant l'Epic 3 ; {@code reutilisable} vaut
 * {@link VisibiliteImages#proposable} pour l'enseignant courant ; {@code aCompleter} est vrai pour une image libre sans
 * source ou sans licence.
 */
public record ImageVue(UUID id, UUID proprietaireId, EtatImage etat, String aRemplacer, boolean reutilisable,
        TypeImage typeImage, boolean aCompleter) {
}

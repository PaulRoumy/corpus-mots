package fr.corpusmots.vocabulaire.service;

import java.util.UUID;

/**
 * Image vue par l'enseignant courant (AD-16) : {@code aRemplacer} ({@code null}, {@code retiree} ou
 * {@code supprimee}) est calculé à la lecture, jamais stocké :
 * {@code retiree} pour une Image {@code privee} lue par un autre que son propriétaire (il ne la voit que par son propre
 * lien, après « Ne plus verser »), {@code null} sinon ; {@code reutilisable} vaut
 * {@link VisibiliteImages#proposable} pour l'enseignant courant ; {@code aCompleter} est vrai pour une image libre sans
 * source ou sans licence ; {@code versabilite} ({@link Versabilite#de}) n'est donnée qu'au propriétaire d'une Image
 * {@code privee}, {@code null} sinon (lecteur non propriétaire, Image déjà versée).
 */
public record ImageVue(UUID id, UUID proprietaireId, EtatImage etat, String aRemplacer, boolean reutilisable,
        TypeImage typeImage, boolean aCompleter, Versabilite versabilite) {
}

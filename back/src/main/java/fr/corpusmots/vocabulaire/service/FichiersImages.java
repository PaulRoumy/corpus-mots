package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.vocabulaire.persistance.FichierLu;
import fr.corpusmots.vocabulaire.persistance.ImageFichierRepository;
import fr.corpusmots.vocabulaire.persistance.ImageRepository;
import fr.corpusmots.vocabulaire.persistance.LienImageRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.Optional;
import java.util.UUID;

/**
 * Seule sortie des octets d'une Image (AD-16, AD-23) : une Image que l'enseignant ne peut pas consulter
 * ({@link VisibiliteImages#consultable}) est traitée comme inexistante.
 */
@ApplicationScoped
public class FichiersImages {

    @Inject
    ImageRepository images;

    @Inject
    ImageFichierRepository fichiers;

    @Inject
    LienImageRepository liens;

    @Inject
    VisibiliteImages visibilite;

    /**
     * Fichier de l'Image {@code imageId}, à la taille {@code usage}, si l'enseignant {@code enseignantId} peut la
     * consulter ; vide si elle n'existe pas, n'a plus de fichier, ou ne lui est pas consultable.
     */
    @Transactional
    public Optional<FichierImageVue> lire(UUID imageId, UUID enseignantId, UsageFichierImage usage) {
        if (imageId == null || enseignantId == null) {
            return Optional.empty();
        }
        return images.findByIdOptional(imageId)
                .filter(image -> visibilite.consultable(image, enseignantId, liens.existe(image.id(), enseignantId)))
                .flatMap(image -> {
                    Optional<FichierLu> lu = usage == UsageFichierImage.MINIATURE ? fichiers.miniature(image.id())
                            : fichiers.octets(image.id());
                    return lu.map(fichier -> new FichierImageVue(fichier.octets(), fichier.typeMime(),
                            image.version()));
                });
    }
}

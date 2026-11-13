package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.referentiels.service.UtilisationThemes;
import fr.corpusmots.vocabulaire.persistance.ImageRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import java.util.UUID;

/**
 * Thèmes portés par les Images (FR-5, AD-15) : un Thème porté par au moins une Image, de n'importe quel enseignant et
 * à n'importe quel état, est utilisé et ne se supprime pas ({@code 409 theme.utilise}). Appelée par
 * {@code referentiels} dans la transaction de la suppression, après le verrou du Thème : une affectation en cours
 * ({@link Images#classer}) s'est terminée avant et compte.
 */
@ApplicationScoped
public class ThemesDesImages implements UtilisationThemes {

    @Inject
    ImageRepository images;

    @Override
    @Transactional(Transactional.TxType.MANDATORY)
    public boolean utilise(UUID themeId) {
        return images.porteTheme(themeId);
    }
}

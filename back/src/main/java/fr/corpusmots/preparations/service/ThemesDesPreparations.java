package fr.corpusmots.preparations.service;

import fr.corpusmots.preparations.persistance.PreparationRepository;
import fr.corpusmots.referentiels.service.ThemeSupprime;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

/**
 * Suit la suppression d'un Thème de {@code referentiels} (FR-5) : les Préparations qui l'avaient pour Thème par défaut,
 * chez tous les enseignants, n'en ont plus. Observateur synchrone, dans la transaction de l'émetteur (AD-15) : la
 * suppression et ce retrait réussissent ou échouent ensemble.
 */
@ApplicationScoped
public class ThemesDesPreparations {

    @Inject
    PreparationRepository preparations;

    @Transactional(Transactional.TxType.MANDATORY)
    void themeSupprime(@Observes ThemeSupprime suppression) {
        preparations.retirerThemeDefaut(suppression.themeId());
    }
}

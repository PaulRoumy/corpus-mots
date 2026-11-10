package fr.corpusmots.preparations.service;

import fr.corpusmots.preparations.persistance.PreparationRepository;
import fr.corpusmots.referentiels.service.ModuleSupprime;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

/**
 * Suit la suppression d'un Module de {@code referentiels} (FR-5) : les Préparations qui l'avaient, chez tous les
 * enseignants, n'ont plus de Module. Observateur synchrone, dans la transaction de l'émetteur (AD-15) : la
 * suppression et ce retrait réussissent ou échouent ensemble.
 */
@ApplicationScoped
public class ModulesDesPreparations {

    @Inject
    PreparationRepository preparations;

    @Transactional(Transactional.TxType.MANDATORY)
    void moduleSupprime(@Observes ModuleSupprime suppression) {
        preparations.retirerModule(suppression.moduleId());
    }
}

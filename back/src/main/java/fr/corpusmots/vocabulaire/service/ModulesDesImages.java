package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.referentiels.service.ModuleSupprime;
import fr.corpusmots.vocabulaire.persistance.ImageRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

/**
 * Suit la suppression d'un Module de {@code referentiels} (FR-14) : les Images qui l'avaient, chez tous les
 * enseignants, n'ont plus de Module, et leur version est incrémentée ; leur état ne change pas (AD-3). Observateur synchrone, dans la transaction de
 * l'émetteur (AD-15) : la suppression et ce retrait réussissent ou échouent ensemble.
 */
@ApplicationScoped
public class ModulesDesImages {

    @Inject
    ImageRepository images;

    @Transactional(Transactional.TxType.MANDATORY)
    void moduleSupprime(@Observes ModuleSupprime suppression) {
        images.retirerModule(suppression.moduleId());
    }
}

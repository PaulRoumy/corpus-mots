package fr.corpusmots.architecture.fixtures.commun.service;

import fr.corpusmots.architecture.fixtures.referentiels.service.ReferentielsFixture;

/** Violation d'AD-1 : commun ne dépend d'aucun module. */
public class CommunAppelleReferentiels {
    public void agir(ReferentielsFixture referentiels) {
        referentiels.agir();
    }
}

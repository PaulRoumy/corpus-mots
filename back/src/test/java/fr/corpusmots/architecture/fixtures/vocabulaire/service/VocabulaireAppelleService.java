package fr.corpusmots.architecture.fixtures.vocabulaire.service;

import fr.corpusmots.architecture.fixtures.commun.api.CommunFixture;
import fr.corpusmots.architecture.fixtures.referentiels.service.ReferentielsFixture;

/** Conforme à AD-1 : vocabulaire appelle la couche service de referentiels et commun. */
public class VocabulaireAppelleService {
    public void agir(ReferentielsFixture referentiels) {
        referentiels.agir();
        new CommunFixture();
    }
}

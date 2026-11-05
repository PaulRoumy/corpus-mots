package fr.corpusmots.architecture.fixtures.preparations.service;

import fr.corpusmots.architecture.fixtures.commun.service.EnseignantCourantFixture;
import jakarta.inject.Inject;
import java.util.UUID;

/** Conforme à AD-1 : preparations connaît l'enseignant courant par l'interface de commun.service. */
public class PreparationsConnaitEnseignantCourant {

    @Inject
    EnseignantCourantFixture enseignantCourant;

    public UUID proprietaire() {
        return enseignantCourant.id();
    }
}

package fr.corpusmots.comptes.service;

import io.quarkus.test.Mock;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

/** Double de Keycloak pour les tests : journalise les appels et échoue à la demande. */
@Mock
@ApplicationScoped
public class IdentitesFactices implements Identites {

    public enum Etape { CREATION, ROLE, INVITATION, SUPPRESSION }

    private final List<String> appels = new ArrayList<>();
    private final EnumSet<Etape> etapesEnEchec = EnumSet.noneOf(Etape.class);
    private boolean emailDejaUtilise;
    private UUID prochainId = UUID.randomUUID();

    public synchronized void reinitialiser() {
        appels.clear();
        etapesEnEchec.clear();
        emailDejaUtilise = false;
        prochainId = UUID.randomUUID();
    }

    public synchronized void echouerA(Etape... etapes) {
        etapesEnEchec.clear();
        etapesEnEchec.addAll(List.of(etapes));
    }

    public synchronized void emailDejaUtilise() {
        emailDejaUtilise = true;
    }

    public synchronized void prochainId(UUID id) {
        prochainId = id;
    }

    public synchronized List<String> appels() {
        return List.copyOf(appels);
    }

    @Override
    public synchronized UUID creerUtilisateur(String email) {
        appels.add("creer " + email);
        if (emailDejaUtilise) {
            throw new IdentiteDejaExistante("déjà utilisé");
        }
        echouerSi(Etape.CREATION);
        return prochainId;
    }

    @Override
    public synchronized void donnerRoleAdministrateur(UUID id) {
        appels.add("admin " + id);
        echouerSi(Etape.ROLE);
    }

    @Override
    public synchronized void envoyerInvitation(UUID id) {
        appels.add("inviter " + id);
        echouerSi(Etape.INVITATION);
    }

    @Override
    public synchronized void supprimer(UUID id) {
        appels.add("supprimer " + id);
        echouerSi(Etape.SUPPRESSION);
    }

    private void echouerSi(Etape etape) {
        if (etapesEnEchec.contains(etape)) {
            throw new IllegalStateException("Keycloak injoignable (" + etape + ")");
        }
    }
}

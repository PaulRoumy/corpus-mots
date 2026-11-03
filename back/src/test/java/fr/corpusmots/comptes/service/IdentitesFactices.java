package fr.corpusmots.comptes.service;

import io.quarkus.test.Mock;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Double de Keycloak pour les tests : journalise les appels, garde les utilisateurs créés et échoue à la demande. */
@Mock
@ApplicationScoped
public class IdentitesFactices implements Identites {

    public enum Etape { CREATION, ROLE, INVITATION, SUPPRESSION, LISTE }

    private final List<String> appels = new ArrayList<>();
    private final EnumSet<Etape> etapesEnEchec = EnumSet.noneOf(Etape.class);
    private final Map<UUID, IdentiteVue> utilisateurs = new LinkedHashMap<>();
    private boolean emailDejaUtilise;
    private UUID prochainId = UUID.randomUUID();

    public synchronized void reinitialiser() {
        appels.clear();
        etapesEnEchec.clear();
        utilisateurs.clear();
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

    /** Déclare un utilisateur déjà présent dans Keycloak, sans passer par les appels journalisés. */
    public synchronized void utilisateur(UUID id, String email, boolean administrateur) {
        utilisateurs.put(id, new IdentiteVue(id, email, administrateur));
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
        UUID id = prochainId;
        utilisateurs.put(id, new IdentiteVue(id, email, false));
        return id;
    }

    @Override
    public synchronized void donnerRoleAdministrateur(UUID id) {
        appels.add("admin " + id);
        echouerSi(Etape.ROLE);
        utilisateurs.computeIfPresent(id, (cle, vue) -> new IdentiteVue(cle, vue.email(), true));
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
        utilisateurs.remove(id);
    }

    @Override
    public synchronized List<IdentiteVue> lister() {
        echouerSi(Etape.LISTE);
        return List.copyOf(utilisateurs.values());
    }

    private void echouerSi(Etape etape) {
        if (etapesEnEchec.contains(etape)) {
            throw new IllegalStateException("Keycloak injoignable (" + etape + ")");
        }
    }
}

package fr.corpusmots.comptes.service;

import io.quarkus.test.Mock;
import jakarta.enterprise.context.ApplicationScoped;
import java.time.Duration;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Double de Keycloak pour les tests : journalise les appels, garde les utilisateurs créés et échoue à la demande. */
@Mock
@ApplicationScoped
public class IdentitesFactices implements Identites {

    public enum Etape {
        CREATION, ROLE, INVITATION, SUPPRESSION, LISTE, RETRAIT_ROLE, DESACTIVATION, REACTIVATION, ADMINISTRATEURS
    }

    /** Utilisateur du realm : e-mail, rôle {@code admin}, compte activé. */
    private record Utilisateur(String email, boolean administrateur, boolean active) {
    }

    private final List<String> appels = new ArrayList<>();
    private final EnumSet<Etape> etapesEnEchec = EnumSet.noneOf(Etape.class);
    private final Map<UUID, Utilisateur> utilisateurs = new LinkedHashMap<>();
    private final Set<UUID> sessionsRevoquees = new HashSet<>();
    private boolean emailDejaUtilise;
    private UUID prochainId = UUID.randomUUID();
    private Duration pauseApresLectureAdministrateurs = Duration.ZERO;

    public synchronized void reinitialiser() {
        appels.clear();
        etapesEnEchec.clear();
        utilisateurs.clear();
        sessionsRevoquees.clear();
        emailDejaUtilise = false;
        prochainId = UUID.randomUUID();
        pauseApresLectureAdministrateurs = Duration.ZERO;
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

    /**
     * Fait attendre chaque lecture des administrateurs actifs, après la lecture : deux requêtes non sérialisées
     * liraient alors toutes deux le même décompte avant que l'une ou l'autre retire son administrateur.
     */
    public synchronized void pauseApresLectureAdministrateurs(Duration pause) {
        pauseApresLectureAdministrateurs = pause;
    }

    /** Déclare un utilisateur activé déjà présent dans Keycloak, sans passer par les appels journalisés. */
    public synchronized void utilisateur(UUID id, String email, boolean administrateur) {
        utilisateur(id, email, administrateur, true);
    }

    public synchronized void utilisateur(UUID id, String email, boolean administrateur, boolean active) {
        utilisateurs.put(id, new Utilisateur(email, administrateur, active));
    }

    public synchronized List<String> appels() {
        return List.copyOf(appels);
    }

    public synchronized boolean estAdministrateur(UUID id) {
        return utilisateurs.get(id).administrateur();
    }

    public synchronized boolean estActive(UUID id) {
        return utilisateurs.get(id).active();
    }

    public synchronized boolean sessionsRevoquees(UUID id) {
        return sessionsRevoquees.contains(id);
    }

    @Override
    public synchronized UUID creerUtilisateur(String email) {
        appels.add("creer " + email);
        if (emailDejaUtilise) {
            throw new IdentiteDejaExistante("déjà utilisé");
        }
        echouerSi(Etape.CREATION);
        UUID id = prochainId;
        utilisateurs.put(id, new Utilisateur(email, false, true));
        return id;
    }

    @Override
    public synchronized void donnerRoleAdministrateur(UUID id) {
        appels.add("admin " + id);
        echouerSi(Etape.ROLE);
        utilisateurs.computeIfPresent(id, (cle, u) -> new Utilisateur(u.email(), true, u.active()));
    }

    @Override
    public synchronized void retirerRoleAdministrateur(UUID id) {
        appels.add("retirer-admin " + id);
        echouerSi(Etape.RETRAIT_ROLE);
        utilisateurs.computeIfPresent(id, (cle, u) -> new Utilisateur(u.email(), false, u.active()));
    }

    @Override
    public synchronized void desactiver(UUID id) {
        appels.add("desactiver " + id);
        echouerSi(Etape.DESACTIVATION);
        utilisateurs.computeIfPresent(id, (cle, u) -> new Utilisateur(u.email(), u.administrateur(), false));
        sessionsRevoquees.add(id);
    }

    @Override
    public synchronized void reactiver(UUID id) {
        appels.add("reactiver " + id);
        echouerSi(Etape.REACTIVATION);
        utilisateurs.computeIfPresent(id, (cle, u) -> new Utilisateur(u.email(), u.administrateur(), true));
    }

    @Override
    public Set<UUID> administrateursActives() {
        Set<UUID> actifs = new HashSet<>();
        Duration pause;
        // Hors du moniteur pendant la pause : seul le verrou du service doit sérialiser les requêtes.
        synchronized (this) {
            echouerSi(Etape.ADMINISTRATEURS);
            utilisateurs.forEach((id, u) -> {
                if (u.administrateur() && u.active()) {
                    actifs.add(id);
                }
            });
            pause = pauseApresLectureAdministrateurs;
        }
        if (!pause.isZero()) {
            try {
                Thread.sleep(pause);
            } catch (InterruptedException interruption) {
                Thread.currentThread().interrupt();
            }
        }
        return actifs;
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
        return utilisateurs.entrySet().stream()
                .map(entree -> new IdentiteVue(entree.getKey(), entree.getValue().email(),
                        entree.getValue().administrateur()))
                .toList();
    }

    private void echouerSi(Etape etape) {
        if (etapesEnEchec.contains(etape)) {
            throw new IllegalStateException("Keycloak injoignable (" + etape + ")");
        }
    }
}

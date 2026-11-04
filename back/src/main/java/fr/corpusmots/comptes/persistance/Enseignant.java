package fr.corpusmots.comptes.persistance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.Generated;

/**
 * Enseignant de l'équipe (AD-6) : son {@code id} est le {@code sub} Keycloak. Seul {@code comptes.service} le crée,
 * à l'invitation, et fait évoluer son statut.
 */
@Entity
@Table(name = "enseignant")
public class Enseignant {

    @Id
    private UUID id;

    @Column(name = "nom_affiche")
    private String nomAffiche;

    @Column(nullable = false)
    private StatutEnseignant statut;

    @Generated
    @Column(name = "cree_le", insertable = false, updatable = false)
    private OffsetDateTime creeLe;

    protected Enseignant() {
    }

    public static Enseignant invite(UUID id) {
        Enseignant enseignant = new Enseignant();
        enseignant.id = id;
        enseignant.statut = StatutEnseignant.INVITE;
        return enseignant;
    }

    /** L'invité a créé son mot de passe et saisi son nom : il devient actif. */
    public void activer(String nomAffiche) {
        if (statut != StatutEnseignant.INVITE) {
            throw new IllegalStateException("Seul un enseignant invité peut être activé : " + statut.valeur());
        }
        this.nomAffiche = nomAffiche;
        this.statut = StatutEnseignant.ACTIF;
    }

    /** L'enseignant corrige son nom affiché ; seul un enseignant actif le peut. */
    public void renommer(String nomAffiche) {
        if (statut != StatutEnseignant.ACTIF) {
            throw new IllegalStateException("Seul un enseignant actif peut être renommé : " + statut.valeur());
        }
        this.nomAffiche = nomAffiche;
    }

    /** Accès coupé par l'administrateur (invité ou actif) ; rien n'est effacé. */
    public void desactiver() {
        if (statut != StatutEnseignant.INVITE && statut != StatutEnseignant.ACTIF) {
            throw new IllegalStateException("Seul un enseignant invité ou actif peut être désactivé : " + statut.valeur());
        }
        this.statut = StatutEnseignant.DESACTIVE;
    }

    /** Accès rendu : actif s'il a déjà saisi son nom, sinon de nouveau invité (il n'a jamais été activé). */
    public void reactiver() {
        if (statut != StatutEnseignant.DESACTIVE) {
            throw new IllegalStateException("Seul un enseignant désactivé peut être réactivé : " + statut.valeur());
        }
        this.statut = nomAffiche == null ? StatutEnseignant.INVITE : StatutEnseignant.ACTIF;
    }

    public UUID id() {
        return id;
    }

    public String nomAffiche() {
        return nomAffiche;
    }

    public StatutEnseignant statut() {
        return statut;
    }

    public OffsetDateTime creeLe() {
        return creeLe;
    }
}

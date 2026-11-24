package fr.corpusmots.vocabulaire.service;

import java.util.Objects;
import java.util.UUID;

/**
 * Auteur explicite d'une transition d'état d'une Image (AD-3) : le propriétaire, ou l'administrateur avec un motif.
 * Seul {@code vocabulaire.service} change l'état d'une Image, et toujours au nom d'un Acteur.
 */
public sealed interface Acteur permits Acteur.Proprietaire, Acteur.Administrateur {

    /** Identifiant de l'enseignant qui agit. */
    UUID id();

    /** Le propriétaire de l'Image, seul à pouvoir la verser. */
    record Proprietaire(UUID id) implements Acteur {

        public Proprietaire {
            Objects.requireNonNull(id, "id");
        }
    }

    /**
     * L'administrateur, avec le motif de son action et son texte (modération, Epic 6) : le texte, facultatif sinon, est
     * obligatoire et non vide pour le motif {@code autre} (AD-3). Aucune transition ne l'accepte encore.
     */
    record Administrateur(UUID id, MotifRetraitAdmin motif, String texte) implements Acteur {

        public Administrateur {
            Objects.requireNonNull(id, "id");
            Objects.requireNonNull(motif, "motif");
            if (motif == MotifRetraitAdmin.AUTRE && (texte == null || texte.isBlank())) {
                throw new IllegalArgumentException("Le motif autre exige un texte");
            }
        }
    }
}

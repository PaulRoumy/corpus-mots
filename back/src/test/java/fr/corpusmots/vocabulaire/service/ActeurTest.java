package fr.corpusmots.vocabulaire.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.UUID;
import org.junit.jupiter.api.Test;

/** Forme de l'{@link Acteur} d'AD-3 : le motif {@code autre} de l'administrateur exige un texte. */
class ActeurTest {

    @Test
    void leMotifAutreExigeUnTexteNonVide() {
        UUID id = UUID.randomUUID();
        assertThrows(IllegalArgumentException.class,
                () -> new Acteur.Administrateur(id, MotifRetraitAdmin.AUTRE, null));
        assertThrows(IllegalArgumentException.class,
                () -> new Acteur.Administrateur(id, MotifRetraitAdmin.AUTRE, "  "));
        assertEquals("Visage d'élève", new Acteur.Administrateur(id, MotifRetraitAdmin.AUTRE, "Visage d'élève").texte());
    }

    @Test
    void lesAutresMotifsAdmettentUnTexteAbsent() {
        assertNull(new Acteur.Administrateur(UUID.randomUUID(), MotifRetraitAdmin.IMAGE_INADAPTEE, null).texte());
    }
}

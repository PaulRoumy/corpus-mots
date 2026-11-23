package fr.corpusmots.vocabulaire.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;

/**
 * Les trois prédicats d'AD-2. Aucun ne reçoit le rôle {@code admin} : l'administrateur n'y gagne rien (vérifié de bout
 * en bout par {@code ImagesResourceTest}).
 */
class VisibiliteImagesTest {

    static final UUID CLAIRE = UUID.fromString("0190f0a0-0000-7000-8000-000000000701");
    static final UUID ZOE = UUID.fromString("0190f0a0-0000-7000-8000-000000000702");

    final VisibiliteImages visibilite = new VisibiliteImages();

    @ParameterizedTest(name = "{0}, propriétaire {1}, lien {2} : consultable {3}, proposable {4}")
    @CsvSource({
            // état, propriétaire, lien, consultable, proposable
            "PRIVEE,     true,  false, true,  true",
            "PRIVEE,     false, false, false, false",
            "PRIVEE,     false, true,  true,  false",
            "VERSEE,     true,  false, true,  true",
            "VERSEE,     false, false, true,  true",
            "VERSEE,     false, true,  true,  true",
            "ABANDONNEE, true,  false, false, false",
            "ABANDONNEE, false, false, false, false",
            "ABANDONNEE, false, true,  true,  false",
            "SUPPRIMEE,  true,  false, false, false",
            "SUPPRIMEE,  false, true,  true,  false",
    })
    void consultableEtProposable(EtatImage etat, boolean proprietaire, boolean lien, boolean consultable,
            boolean proposable) {
        UUID enseignant = proprietaire ? CLAIRE : ZOE;

        assertEquals(consultable, visibilite.consultable(CLAIRE, etat, enseignant, lien));
        assertEquals(proposable, visibilite.proposable(CLAIRE, etat, enseignant));
    }

    @ParameterizedTest(name = "{0} : modérable {1}")
    @CsvSource({ "PRIVEE, false", "VERSEE, true", "ABANDONNEE, true", "SUPPRIMEE, false" })
    void moderable(EtatImage etat, boolean moderable) {
        assertEquals(moderable, visibilite.moderable(etat));
    }

    @ParameterizedTest(name = "propriétaire inconnu, {0}")
    @CsvSource({ "PRIVEE, false", "VERSEE, true" })
    void sansProprietaireSeuleUneImageVerseeEstProposable(EtatImage etat, boolean proposable) {
        assertEquals(proposable, visibilite.proposable(null, etat, CLAIRE));
    }

    @ParameterizedTest(name = "critère de la Banque {0}")
    @EnumSource(ProvenanceImages.class)
    void leCritereDeLaBanqueNommeExactementSesParametres(ProvenanceImages provenance) {
        VisibiliteImages.CritereImages critere = visibilite.critereBanque(provenance, CLAIRE);
        Set<String> nommes = new HashSet<>();
        Matcher parametre = Pattern.compile(":([a-zA-Z]+)").matcher(critere.condition());
        while (parametre.find()) {
            nommes.add(parametre.group(1));
        }

        assertEquals(critere.parametres().keySet(), nommes);
        assertEquals("versee", critere.parametres().get("visibiliteVersee"));
        assertEquals(provenance != ProvenanceImages.BANQUE, critere.parametres().containsValue(CLAIRE));
    }
}

package fr.corpusmots.architecture;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.lang.ArchRule;
import fr.corpusmots.architecture.fixtures.RacineFixture;
import fr.corpusmots.architecture.fixtures.commun.persistance.CommunEntiteFixture;
import fr.corpusmots.architecture.fixtures.commun.service.CommunAppelleReferentiels;
import fr.corpusmots.architecture.fixtures.comptes.service.ComptesFixture;
import fr.corpusmots.architecture.fixtures.fiches.api.FicheExempleDto;
import fr.corpusmots.architecture.fixtures.fiches.service.FichesAppelleComptes;
import fr.corpusmots.architecture.fixtures.inconnu.service.ModuleInconnuFixture;
import fr.corpusmots.architecture.fixtures.preparations.service.PreparationsToucheCommunPersistance;
import fr.corpusmots.architecture.fixtures.referentiels.persistance.AlbumFixture;
import fr.corpusmots.architecture.fixtures.referentiels.service.ReferentielsFixture;
import fr.corpusmots.architecture.fixtures.vocabulaire.service.VocabulaireAppelleService;
import fr.corpusmots.architecture.fixtures.vocabulaire.outils.CoucheInconnueFixture;
import fr.corpusmots.architecture.fixtures.vocabulaire.service.VocabulaireTouchePersistance;
import org.junit.jupiter.api.Test;

/** Vérifie que les règles d'architecture échouent bien sur des classes fixtures en violation. */
class ReglesArchitectureTest {

    private static final String RACINE_FIXTURES = "fr.corpusmots.architecture.fixtures";

    private static final ArchRule GRAPHE = ReglesArchitecture.dependancesEntreModules(RACINE_FIXTURES);
    private static final ArchRule STRUCTURE = ReglesArchitecture.classesDansUnModuleEtUneCouche(RACINE_FIXTURES);
    private static final ArchRule DTO = ReglesArchitecture.nomsDeDtoUniques(RACINE_FIXTURES);

    @Test
    void unModuleQuiAppelleUnModuleHorsDuGrapheEstRefuse() {
        JavaClasses classes = new ClassFileImporter().importClasses(FichesAppelleComptes.class, ComptesFixture.class);

        AssertionError erreur = assertThrows(AssertionError.class, () -> GRAPHE.check(classes));

        assertTrue(erreur.getMessage().contains("fiches ne peut pas dépendre de comptes"), erreur.getMessage());
    }

    @Test
    void unModuleQuiToucheLaPersistanceDunAutreEstRefuse() {
        JavaClasses classes = new ClassFileImporter()
                .importClasses(VocabulaireTouchePersistance.class, AlbumFixture.class);

        AssertionError erreur = assertThrows(AssertionError.class, () -> GRAPHE.check(classes));

        assertTrue(erreur.getMessage().contains("seule la couche service de referentiels"), erreur.getMessage());
    }

    @Test
    void unAppelDeServiceDansLeSensDuGrapheEstAccepte() {
        JavaClasses classes = new ClassFileImporter()
                .importClasses(VocabulaireAppelleService.class, ReferentielsFixture.class);

        assertDoesNotThrow(() -> GRAPHE.check(classes));
    }

    @Test
    void deuxDtoHomonymesDansDeuxModulesSontRefuses() {
        JavaClasses classes = new ClassFileImporter().importPackages(
                RACINE_FIXTURES + ".comptes.api", RACINE_FIXTURES + ".vocabulaire.api");

        AssertionError erreur = assertThrows(AssertionError.class, () -> DTO.check(classes));

        assertTrue(erreur.getMessage().contains("porte le même nom que"), erreur.getMessage());
    }

    @Test
    void desDtoAuxNomsDistinctsSontAcceptes() {
        JavaClasses classes = new ClassFileImporter().importClasses(FicheExempleDto.class,
                fr.corpusmots.architecture.fixtures.comptes.api.ExempleDto.class);

        assertDoesNotThrow(() -> DTO.check(classes));
    }

    @Test
    void unModuleQuiToucheLaPersistanceDeCommunEstRefuse() {
        JavaClasses classes = new ClassFileImporter()
                .importClasses(PreparationsToucheCommunPersistance.class, CommunEntiteFixture.class);

        AssertionError erreur = assertThrows(AssertionError.class, () -> GRAPHE.check(classes));

        assertTrue(erreur.getMessage().contains("seules les couches api et service de commun"), erreur.getMessage());
    }

    @Test
    void communQuiDependDunAutreModuleEstRefuse() {
        JavaClasses classes = new ClassFileImporter()
                .importClasses(CommunAppelleReferentiels.class, ReferentielsFixture.class);

        AssertionError erreur = assertThrows(AssertionError.class, () -> GRAPHE.check(classes));

        assertTrue(erreur.getMessage().contains("commun ne dépend d'aucun module"), erreur.getMessage());
    }

    @Test
    void uneClasseDansUnModuleInconnuEstRefusee() {
        JavaClasses classes = new ClassFileImporter().importClasses(ModuleInconnuFixture.class);

        AssertionError erreur = assertThrows(AssertionError.class, () -> STRUCTURE.check(classes));

        assertTrue(erreur.getMessage().contains(ModuleInconnuFixture.class.getName()), erreur.getMessage());
    }

    @Test
    void uneClasseDansUneCoucheInconnueEstRefusee() {
        JavaClasses classes = new ClassFileImporter().importClasses(CoucheInconnueFixture.class);

        AssertionError erreur = assertThrows(AssertionError.class, () -> STRUCTURE.check(classes));

        assertTrue(erreur.getMessage().contains(CoucheInconnueFixture.class.getName()), erreur.getMessage());
    }

    @Test
    void uneClasseDansLePaquetageRacineEstRefusee() {
        JavaClasses classes = new ClassFileImporter().importClasses(RacineFixture.class);

        AssertionError erreur = assertThrows(AssertionError.class, () -> STRUCTURE.check(classes));

        assertTrue(erreur.getMessage().contains(RacineFixture.class.getName()), erreur.getMessage());
    }

    @Test
    void uneClasseDansUnModuleEtUneCoucheConnusEstAcceptee() {
        JavaClasses classes = new ClassFileImporter().importClasses(VocabulaireAppelleService.class);

        assertDoesNotThrow(() -> STRUCTURE.check(classes));
    }
}

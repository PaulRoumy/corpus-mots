package fr.corpusmots.architecture;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/** Applique les règles AD-1, AD-16 et AD-17 au code de production du back. */
class ArchitectureTest {

    private static JavaClasses classesDuBack;

    @BeforeAll
    static void importer() {
        classesDuBack = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages(ReglesArchitecture.RACINE);
    }

    @Test
    void lesModulesRespectentLeGrapheDeDependances() {
        ReglesArchitecture.dependancesEntreModules(ReglesArchitecture.RACINE).check(classesDuBack);
    }

    @Test
    void chaqueClasseResideDansUnModuleEtUneCouche() {
        ReglesArchitecture.classesDansUnModuleEtUneCouche(ReglesArchitecture.RACINE).check(classesDuBack);
    }

    @Test
    void lesNomsDeDtoSontUniques() {
        ReglesArchitecture.nomsDeDtoUniques(ReglesArchitecture.RACINE).check(classesDuBack);
    }

    @Test
    void lesServicesNExposentAucunTypeDePersistance() {
        ReglesArchitecture.servicesSansTypeDePersistance(ReglesArchitecture.RACINE).check(classesDuBack);
    }

    @Test
    void aucuneMethodeTransactionnelleNAppelleKeycloak() {
        String identites = ReglesArchitecture.RACINE + "." + ReglesArchitecture.IDENTITES;
        assertTrue(classesDuBack.contain(identites),
                identites + " introuvable : la règle AD-17 ne vérifierait plus rien, mettre à jour IDENTITES");
        ReglesArchitecture.aucunAppelKeycloakEnTransaction(ReglesArchitecture.RACINE).check(classesDuBack);
    }
}

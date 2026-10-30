package fr.corpusmots.architecture;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/** Applique les règles AD-1 et AD-16 au code de production du back. */
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
}

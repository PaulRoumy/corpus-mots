package fr.corpusmots.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaMethodCall;
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

    /**
     * AD-2 : la requête de la Banque colle une condition SQL ; seule {@code Images}, qui la tient de
     * {@code VisibiliteImages}, peut l'appeler.
     */
    @Test
    void seulImagesAppelleLaRequeteDeLaBanque() {
        noClasses().that().doNotHaveFullyQualifiedName(ReglesArchitecture.RACINE + ".vocabulaire.service.Images")
                .should().callMethodWhere(new DescribedPredicate<JavaMethodCall>(
                        "un appel à ImageRepository.pageBanque ou nombreBanque") {
                    @Override
                    public boolean test(JavaMethodCall appel) {
                        return appel.getTargetOwner().getFullName()
                                .equals(ReglesArchitecture.RACINE + ".vocabulaire.persistance.ImageRepository")
                                && (appel.getName().equals("pageBanque") || appel.getName().equals("nombreBanque"));
                    }
                })
                .because("AD-2 : la condition de visibilité de la Banque n'est écrite que par VisibiliteImages")
                .check(classesDuBack);
    }

    @Test
    void aucuneMethodeTransactionnelleNFaitDAppelHttpSortant() {
        for (String type : ReglesArchitecture.APPELS_HTTP_SORTANTS) {
            String nom = ReglesArchitecture.RACINE + "." + type;
            assertTrue(classesDuBack.contain(nom),
                    nom + " introuvable : la règle AD-17 ne le vérifierait plus, mettre à jour APPELS_HTTP_SORTANTS");
        }
        ReglesArchitecture.aucunAppelHttpSortantEnTransaction(ReglesArchitecture.RACINE).check(classesDuBack);
    }
}

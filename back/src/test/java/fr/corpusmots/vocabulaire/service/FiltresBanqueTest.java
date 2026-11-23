package fr.corpusmots.vocabulaire.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import fr.corpusmots.commun.service.Section;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Conditions des filtres de la Banque (story 3.2) : chaque paramètre nommé dans le SQL est fourni, et seulement lui
 * (un paramètre non lié ou en trop fait échouer la requête native), jamais homonyme d'un paramètre de visibilité ; la
 * saisie du Mot n'entre jamais dans le SQL.
 */
class FiltresBanqueTest {

    static final UUID CLAIRE = UUID.fromString("0190f0a0-0000-7000-8000-000000000c01");
    static final UUID UN = UUID.fromString("0190f0a0-0000-7000-8000-000000000c02");

    static final FiltresBanqueCommande TOUS = new FiltresBanqueCommande("la Citrouille", UN, Section.GS, UN, UN, UN,
            CategorieGrammaticale.VERBE, TypeImage.IMAGE_LIBRE, UN);

    static Stream<Arguments> combinaisons() {
        List<FiltresBanqueCommande> filtres = List.of(FiltresBanqueCommande.AUCUN, TOUS,
                new FiltresBanqueCommande("lapin", null, null, null, null, null, null, null, null),
                new FiltresBanqueCommande(null, UN, null, null, null, null, null, null, null),
                new FiltresBanqueCommande(null, null, Section.PS, null, null, null, null, null, null),
                new FiltresBanqueCommande(null, null, null, UN, null, null, null, null, null),
                new FiltresBanqueCommande(null, null, null, null, UN, null, null, null, null),
                new FiltresBanqueCommande(null, null, null, null, null, UN, null, null, null),
                new FiltresBanqueCommande(null, null, null, null, null, null, CategorieGrammaticale.NOM, null, null),
                new FiltresBanqueCommande(null, null, null, null, null, null, null, TypeImage.INCONNU, null),
                new FiltresBanqueCommande(null, null, null, null, null, null, null, null, UN),
                new FiltresBanqueCommande("automne", null, Section.GS, null, null, null, CategorieGrammaticale.VERBE,
                        null, null));
        return Stream.of(ProvenanceImages.values())
                .flatMap(provenance -> filtres.stream().map(filtre -> Arguments.of(provenance, filtre)));
    }

    @ParameterizedTest(name = "{0}, {1}")
    @MethodSource("combinaisons")
    void chaqueParametreNommeEstFourniEtSeulementLui(ProvenanceImages provenance, FiltresBanqueCommande filtres) {
        Images.ConditionFiltres restriction = Images.conditionFiltres(provenance, filtres, CLAIRE);
        VisibiliteImages.CritereImages critere = new VisibiliteImages().critereBanque(provenance, CLAIRE);

        assertEquals(restriction.parametres().keySet(), nommes(restriction.condition()));
        Set<String> communs = new HashSet<>(restriction.parametres().keySet());
        communs.retainAll(critere.parametres().keySet());
        assertTrue(communs.isEmpty(), communs.toString());
        assertFalse(restriction.condition().toLowerCase().contains("citrouille"));
        assertFalse(restriction.condition().contains("decalage") || restriction.condition().contains(":taille"));
        assertTrue(restriction.condition().isEmpty() || entoureeDeParentheses(restriction.condition()),
                restriction.condition());
    }

    /** Vrai si une seule paire de parenthèses entoure toute la condition : aucun « or » n'en sort (AD-2). */
    private static boolean entoureeDeParentheses(String condition) {
        if (!condition.startsWith("(") || !condition.endsWith(")")) {
            return false;
        }
        int profondeur = 0;
        for (int rang = 0; rang < condition.length(); rang++) {
            char caractere = condition.charAt(rang);
            profondeur += caractere == '(' ? 1 : caractere == ')' ? -1 : 0;
            if (profondeur == 0 && rang < condition.length() - 1) {
                return false;
            }
        }
        return profondeur == 0;
    }

    @Test
    void sansFiltreLaConditionEstVide() {
        Images.ConditionFiltres restriction = Images.conditionFiltres(ProvenanceImages.TOUT,
                FiltresBanqueCommande.AUCUN, CLAIRE);

        assertEquals("", restriction.condition());
        assertTrue(restriction.parametres().isEmpty());
    }

    @Test
    void leMotEstPasseParSaCleDeRecherche() {
        Images.ConditionFiltres restriction = Images.conditionFiltres(ProvenanceImages.TOUT, TOUS, CLAIRE);

        assertEquals("citrouille", restriction.parametres().get("filtreMot"));
        assertEquals("gs", restriction.parametres().get("filtreSection"));
        assertEquals("verbe", restriction.parametres().get("filtreCategorie"));
        assertEquals("image_libre", restriction.parametres().get("filtreType"));
    }

    @ParameterizedTest(name = "{0}")
    @CsvSource({ "MES_MOTS, true", "BANQUE, false", "TOUT, false" })
    void seulMesMotsRetientLaSectionDUnLienDeLEnseignant(ProvenanceImages provenance, boolean parUsage) {
        Images.ConditionFiltres restriction = Images.conditionFiltres(provenance,
                new FiltresBanqueCommande(null, null, Section.GS, null, null, null, null, null, null), CLAIRE);

        assertEquals(parUsage, restriction.condition().contains("lien_image"));
        assertEquals(parUsage ? CLAIRE : null, restriction.parametres().get("filtreEnseignant"));
    }

    @ParameterizedTest(name = "« {0} »")
    @ValueSource(strings = { "", "   ", "la", "La ", "l'", "l’", "les", "des", "un", "une", "le",
            "les la", "l'la", "l’La", "une des" })
    void uneSaisieVideOuReduiteAUnArticleNeFiltrePas(String saisie) {
        assertEquals(Optional.empty(), Lexique.cleDeRecherche(saisie));
        Images.ConditionFiltres restriction = Images.conditionFiltres(ProvenanceImages.TOUT,
                new FiltresBanqueCommande(saisie, null, null, null, null, null, null, null, null), CLAIRE);
        assertEquals("", restriction.condition());
    }

    @ParameterizedTest(name = "« {0} » → {1}")
    @CsvSource({ "la Citrouille, citrouille", "'  CITROUILLE ', citrouille", "l’Arbre, arbre", "Côté, côté",
            "lapin, lapin", "les  Lapins, lapins", "lavande, lavande" })
    void laCleDeRechercheSuitLaNormalisation(String saisie, String cle) {
        assertEquals(Optional.of(cle), Lexique.cleDeRecherche(saisie));
    }

    private static Set<String> nommes(String condition) {
        Set<String> nommes = new HashSet<>();
        Matcher parametre = Pattern.compile(":([a-zA-Z]+)").matcher(condition);
        while (parametre.find()) {
            nommes.add(parametre.group(1));
        }
        return nommes;
    }
}

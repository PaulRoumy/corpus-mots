package fr.corpusmots.preparations.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import fr.corpusmots.commun.api.EnseignantsDeTest;
import fr.corpusmots.commun.api.ProblemeDto;
import fr.corpusmots.referentiels.api.ReferentielsDeTest;
import fr.corpusmots.vocabulaire.service.Lexique;
import fr.corpusmots.vocabulaire.service.MotVue;
import fr.corpusmots.vocabulaire.service.SensVue;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.http.ContentType;
import io.restassured.response.ValidatableResponse;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Mots d'une Préparation (story 2.3) : ajout par le Champ de saisie rapide, normalisé par le Lexique, avec le Sens
 * retenu par {@code Usages}, liste dans l'ordre de saisie (partie 1), retrait et rétablissement (partie 2). Une ligne
 * de test par ligne de la matrice de chaque spec.
 */
@QuarkusTest
@TestSecurity(user = MotsPreparationResourceTest.CLAIRE)
@OidcSecurity(claims = @Claim(key = "sub", value = MotsPreparationResourceTest.CLAIRE))
class MotsPreparationResourceTest {

    static final String CLAIRE = "0190f0a0-0000-7000-8000-000000000601";
    static final String ZOE = "0190f0a0-0000-7000-8000-000000000602";

    @Inject
    EnseignantsDeTest enseignants;

    @Inject
    ReferentielsDeTest referentiels;

    @Inject
    Lexique lexique;

    @Inject
    EntityManager entityManager;

    UUID rouleGalette;
    UUID preparation;

    @BeforeEach
    void donnees() {
        enseignants.seulsActifs(CLAIRE, ZOE);
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("delete from sens_retenu").executeUpdate();
            entityManager.createNativeQuery("delete from preparation").executeUpdate();
            entityManager.createNativeQuery("delete from sens").executeUpdate();
            entityManager.createNativeQuery("delete from mot").executeUpdate();
        });
        referentiels.effacer();
        rouleGalette = referentiels.album("La Roule Galette", "Natha Caputo");
        preparation = preparation(CLAIRE, "ms", "2026-11-09T09:00:00Z");
    }

    @Test
    void ajouterUnMotNormaliseEnFinDePreparation() {
        String id = ajouter(preparation, " La  citrouille ")
                .statusCode(201)
                .body("id", notNullValue())
                .body("motId", notNullValue())
                .body("forme", equalTo("citrouille"))
                .body("ordre", equalTo(1))
                .body("sens.id", notNullValue())
                .body("sens.libelle", equalTo("à compléter"))
                .body("sens.categorie", nullValue())
                .body("illustre", equalTo(false))
                .extract().path("id");
        ajouter(preparation, "le loup").statusCode(201).body("forme", equalTo("loup")).body("ordre", equalTo(2));

        assertEquals(List.of("citrouille:1", "loup:2"), motsEnBase(preparation));
        assertEquals("à compléter|" + preparation + "|" + CLAIRE + "|" + rouleGalette + "|ms",
                sensRetenuEnBase(UUID.fromString(id)));
        given().when().get("/api/preparations/" + preparation)
                .then()
                .statusCode(200)
                .body("nombreMots", equalTo(2))
                .body("nombreIllustres", equalTo(0));
        given().when().get("/api/preparations")
                .then()
                .statusCode(200)
                .body("elements[0].id", equalTo(preparation.toString()))
                .body("elements[0].nombreMots", equalTo(2))
                .body("elements[0].nombreAIllustrer", equalTo(2));
    }

    @Test
    void unMotCreeParUnCollegueEstReutiliseSansSonSens() {
        MotVue citrouille = QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerMot("Citrouille"));
        SensVue legume = QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(citrouille.id(), "légume", "nom"));
        UUID deZoe = preparation(ZOE, "gs", "2026-11-09T08:00:00Z");
        UUID motDeZoe = motDePreparation(deZoe, citrouille.id(), 1);
        sensRetenu(deZoe, motDeZoe, legume.id(), ZOE, "gs");

        ajouter(preparation, "citrouille")
                .statusCode(201)
                .body("motId", equalTo(citrouille.id().toString()))
                .body("forme", equalTo("Citrouille"))
                .body("sens.id", not(equalTo(legume.id().toString())))
                .body("sens.libelle", equalTo("à compléter"))
                .body("sens.categorie", nullValue());
        assertEquals(1L, nombre("select count(*) from mot"));
    }

    @Test
    void leSensDejaRetenuDansUneAutreDeMesPreparationsEstRepris() {
        UUID autre = preparation(CLAIRE, "gs", "2026-11-08T09:00:00Z");
        String motDeLAutre = ajouter(autre, "lapin").statusCode(201).extract().path("id");
        String motId = given().when().get("/api/preparations/" + autre + "/mots").then().extract().path("[0].motId");
        SensVue animal = QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(UUID.fromString(motId), "animal", "nom"));
        QuarkusTransaction.requiringNew().run(() -> entityManager
                .createNativeQuery("update sens_retenu set sens_id = :sens where preparation_mot_id = :mot")
                .setParameter("sens", animal.id())
                .setParameter("mot", UUID.fromString(motDeLAutre))
                .executeUpdate());

        ajouter(preparation, "Lapin")
                .statusCode(201)
                .body("motId", equalTo(motId))
                .body("sens.id", equalTo(animal.id().toString()))
                .body("sens.libelle", equalTo("animal"))
                .body("sens.categorie", equalTo("nom"));
    }

    @Test
    void leSensRetenuLePlusRecemmentEstRepris() {
        UUID premiere = preparation(CLAIRE, "gs", "2026-11-07T09:00:00Z");
        UUID seconde = preparation(CLAIRE, "gs", "2026-11-08T09:00:00Z");
        String motDePremiere = ajouter(premiere, "lapin").statusCode(201).extract().path("id");
        String motId = given().when().get("/api/preparations/" + premiere + "/mots").then().extract().path("[0].motId");
        String motDeSeconde = ajouter(seconde, "lapin").statusCode(201).extract().path("id");
        SensVue animal = QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(UUID.fromString(motId), "animal", "nom"));
        SensVue peluche = QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(UUID.fromString(motId), "peluche", "nom"));
        retenirEnBase(UUID.fromString(motDePremiere), animal.id(), "2026-11-07T10:00:00Z");
        retenirEnBase(UUID.fromString(motDeSeconde), peluche.id(), "2026-11-08T10:00:00Z");

        ajouter(preparation, "lapin")
                .statusCode(201)
                .body("sens.id", equalTo(peluche.id().toString()))
                .body("sens.libelle", equalTo("peluche"));
    }

    @Test
    void lesReglagesRenvoientLeNombreDeMots() {
        ajouter(preparation, "galette").statusCode(201);
        ajouter(preparation, "renard").statusCode(201);

        given().contentType(ContentType.JSON).body(new HashMap<>(Map.of()))
                .when().put("/api/preparations/" + preparation + "/reglages")
                .then()
                .statusCode(200)
                .body("nombreMots", equalTo(2))
                .body("nombreIllustres", equalTo(0));
    }

    @Test
    void leLexiqueDistingueLesAccentsEtIgnoreCasseEtArticle() {
        String cote = ajouter(preparation, "côte").statusCode(201).extract().path("motId");
        String coteAccent = ajouter(preparation, "côté").statusCode(201).extract().path("motId");
        ajouter(preparation, "l’arbre").statusCode(201).body("forme", equalTo("arbre"));
        ajouter(preparation, "des").statusCode(201).body("forme", equalTo("des"));
        String lapin = ajouter(preparation, "Lapin").statusCode(201).extract().path("motId");
        UUID autre = preparation(CLAIRE, "gs", "2026-11-08T09:00:00Z");
        String lapinMinuscule = ajouter(autre, "lapin").statusCode(201).body("forme", equalTo("Lapin"))
                .extract().path("motId");

        assertNotEquals(cote, coteAccent);
        assertEquals(lapin, lapinMinuscule);
        assertEquals(List.of("côte:1", "côté:2", "arbre:3", "des:4", "Lapin:5"), motsEnBase(preparation));
    }

    @Test
    void unMotDejaPresentALaCasseOuALArticlePresEstRefuse() {
        ajouter(preparation, "Lapin").statusCode(201);

        for (String saisie : new String[] { "lapin", "le lapin", "  LAPIN ", "un  Lapin" }) {
            refus(preparation, saisie, 409, "preparation.mot_deja_present");
        }
        assertEquals(List.of("Lapin:1"), motsEnBase(preparation));
        assertEquals(1L, nombre("select count(*) from sens_retenu"));
    }

    @Test
    void uneSaisieInvalideEstRefusee() {
        for (String saisie : new String[] { "", "   ", "a".repeat(101), "la " + "b".repeat(101) }) {
            refus(preparation, saisie, 400, "preparation.mot_invalide");
        }
        given().contentType(ContentType.JSON).body(new HashMap<>(Map.of()))
                .when().post("/api/preparations/" + preparation + "/mots")
                .then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("preparation.mot_invalide"));
        assertEquals(List.of(), motsEnBase(preparation));
        assertEquals(0L, nombre("select count(*) from mot"));

        // L'article retiré, la forme compte 100 caractères : acceptée.
        ajouter(preparation, "la " + "c".repeat(100)).statusCode(201).body("forme", equalTo("c".repeat(100)));
    }

    @Test
    void unCorpsAbsentEstRefuse() {
        given().contentType(ContentType.JSON)
                .when().post("/api/preparations/" + preparation + "/mots")
                .then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("requete.invalide"));
    }

    @Test
    void lesMotsDeLaPreparationDUnCollegueSontIntrouvables() {
        UUID deZoe = preparation(ZOE, "gs", "2026-11-09T08:00:00Z");
        MotVue loup = QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerMot("loup"));
        motDePreparation(deZoe, loup.id(), 1);

        for (UUID cible : new UUID[] { deZoe, UUID.randomUUID() }) {
            refus(cible, "citrouille", 404, "ressource.introuvable");
            given().when().get("/api/preparations/" + cible + "/mots")
                    .then()
                    .statusCode(404)
                    .contentType(ProblemeDto.MEDIA_TYPE)
                    .body("code", equalTo("ressource.introuvable"));
        }
        assertEquals(List.of("loup:1"), motsEnBase(deZoe));
        assertEquals(0L, nombre("select count(*) from mot where forme_cle = 'citrouille'"));
    }

    @Test
    void lesMotsSontListesDansLOrdreDeSaisie() {
        given().when().get("/api/preparations/" + preparation + "/mots")
                .then()
                .statusCode(200)
                .body("$", hasSize(0));
        for (String saisie : new String[] { "galette", "le renard", "un lapin" }) {
            ajouter(preparation, saisie).statusCode(201);
        }

        given().when().get("/api/preparations/" + preparation + "/mots")
                .then()
                .statusCode(200)
                .body("forme", contains("galette", "renard", "lapin"))
                .body("ordre", contains(1, 2, 3))
                .body("sens.libelle", contains("à compléter", "à compléter", "à compléter"))
                .body("illustre", contains(false, false, false));
    }

    @Test
    void retirerUnMotSupprimeSaLigneEtSonSensRetenu() {
        ajouter(preparation, "galette").statusCode(201);
        String renard = ajouter(preparation, "renard").statusCode(201).extract().path("id");
        String renardMotId = given().when().get("/api/preparations/" + preparation + "/mots").then()
                .extract().path("[1].motId");
        String sensId = given().when().get("/api/preparations/" + preparation + "/mots").then()
                .extract().path("[1].sens.id");
        ajouter(preparation, "lapin").statusCode(201);

        retirer(preparation, UUID.fromString(renard))
                .statusCode(200)
                .body("id", equalTo(renard))
                .body("motId", equalTo(renardMotId))
                .body("forme", equalTo("renard"))
                .body("ordre", equalTo(2))
                .body("sens.id", equalTo(sensId))
                .body("sens.libelle", equalTo("à compléter"));

        assertEquals(List.of("galette:1", "lapin:3"), motsEnBase(preparation));
        assertEquals(0L, nombre("select count(*) from sens_retenu where preparation_mot_id = '" + renard + "'"));
        assertEquals(2L, nombre("select count(*) from sens_retenu"));
        assertEquals(1L, nombre("select count(*) from mot where forme_cle = 'renard'"));
        assertEquals(1L, nombre("select count(*) from sens where id = '" + sensId + "'"));
        given().when().get("/api/preparations/" + preparation)
                .then()
                .statusCode(200)
                .body("nombreMots", equalTo(2));
    }

    @Test
    void retirerPuisRetablirRendLaListeIdentique() {
        ajouter(preparation, "galette").statusCode(201);
        String renard = ajouter(preparation, "renard").statusCode(201).extract().path("id");
        ajouter(preparation, "lapin").statusCode(201);
        String motId = given().when().get("/api/preparations/" + preparation + "/mots").then()
                .extract().path("[1].motId");
        SensVue animal = QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(UUID.fromString(motId), "animal", "nom"));
        retenirEnBase(UUID.fromString(renard), animal.id(), "2026-11-09T10:00:00Z");
        List<String> avant = motsListes(preparation);

        Map<String, Object> retire = retirer(preparation, UUID.fromString(renard)).statusCode(200)
                .extract().jsonPath().getMap("$");
        @SuppressWarnings("unchecked")
        Map<String, Object> sens = (Map<String, Object>) retire.get("sens");
        String retabli = retablir(preparation, retire.get("motId"), sens.get("id"), retire.get("ordre"))
                .statusCode(201)
                .body("motId", equalTo(motId))
                .body("forme", equalTo("renard"))
                .body("ordre", equalTo(2))
                .body("sens.id", equalTo(animal.id().toString()))
                .body("sens.libelle", equalTo("animal"))
                .body("sens.categorie", equalTo("nom"))
                .extract().path("id");

        List<String> apres = motsListes(preparation);
        assertEquals(avant, apres);
        assertEquals(List.of("galette:1", "renard:2", "lapin:3"), motsEnBase(preparation));
        assertEquals("animal|" + preparation + "|" + CLAIRE + "|" + rouleGalette + "|ms",
                sensRetenuEnBase(UUID.fromString(retabli)));
        assertEquals(3L, nombre("select count(*) from sens_retenu"));
    }

    @Test
    void unMotRetabliSurUnePlacePriseVaEnFin() {
        String galette = ajouter(preparation, "galette").statusCode(201).extract().path("id");
        Map<String, Object> retire = retirer(preparation, UUID.fromString(galette)).statusCode(200)
                .extract().jsonPath().getMap("$");
        // Plus aucun Mot : « renard » prend la place 1, celle de « galette ».
        ajouter(preparation, "renard").statusCode(201).body("ordre", equalTo(1));
        ajouter(preparation, "loup").statusCode(201);
        @SuppressWarnings("unchecked")
        Map<String, Object> sens = (Map<String, Object>) retire.get("sens");

        retablir(preparation, retire.get("motId"), sens.get("id"), retire.get("ordre"))
                .statusCode(201)
                .body("forme", equalTo("galette"))
                .body("ordre", equalTo(3))
                .body("sens.id", equalTo(sens.get("id")));
        assertEquals(List.of("renard:1", "loup:2", "galette:3"), motsEnBase(preparation));
        assertEquals(3L, nombre("select count(*) from sens_retenu"));
    }

    @Test
    void unRetablissementSansPlaceValideVaEnFin() {
        String galette = ajouter(preparation, "galette").statusCode(201).extract().path("id");
        String renard = ajouter(preparation, "renard").statusCode(201).extract().path("id");
        ajouter(preparation, "lapin").statusCode(201);
        Map<String, Object> galetteRetiree = retirer(preparation, UUID.fromString(galette)).statusCode(200)
                .extract().jsonPath().getMap("$");
        Map<String, Object> renardRetire = retirer(preparation, UUID.fromString(renard)).statusCode(200)
                .extract().jsonPath().getMap("$");
        @SuppressWarnings("unchecked")
        Map<String, Object> sensGalette = (Map<String, Object>) galetteRetiree.get("sens");
        @SuppressWarnings("unchecked")
        Map<String, Object> sensRenard = (Map<String, Object>) renardRetire.get("sens");

        retablir(preparation, galetteRetiree.get("motId"), sensGalette.get("id"), null)
                .statusCode(201)
                .body("ordre", equalTo(4));
        retablir(preparation, renardRetire.get("motId"), sensRenard.get("id"), 0)
                .statusCode(201)
                .body("ordre", equalTo(5));

        assertEquals(List.of("lapin:3", "galette:4", "renard:5"), motsEnBase(preparation));
        assertEquals(3L, nombre("select count(*) from sens_retenu"));
    }

    @Test
    void unSensEtrangerAuMotEstRefuse() {
        String galette = ajouter(preparation, "galette").statusCode(201).extract().path("id");
        Map<String, Object> retire = retirer(preparation, UUID.fromString(galette)).statusCode(200)
                .extract().jsonPath().getMap("$");
        MotVue loup = QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerMot("loup"));
        SensVue animal = QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(loup.id(), "animal", "nom"));

        for (Object sensId : new Object[] { animal.id(), UUID.randomUUID(), null }) {
            retablir(preparation, retire.get("motId"), sensId, retire.get("ordre"))
                    .statusCode(400)
                    .contentType(ProblemeDto.MEDIA_TYPE)
                    .body("code", equalTo("preparation.sens_invalide"));
        }
        assertEquals(List.of(), motsEnBase(preparation));
        assertEquals(0L, nombre("select count(*) from sens_retenu"));
    }

    @Test
    void unMotRevenuEntreTempsEstRefuse() {
        String galette = ajouter(preparation, "galette").statusCode(201).extract().path("id");
        Map<String, Object> retire = retirer(preparation, UUID.fromString(galette)).statusCode(200)
                .extract().jsonPath().getMap("$");
        ajouter(preparation, "la galette").statusCode(201);
        @SuppressWarnings("unchecked")
        Map<String, Object> sens = (Map<String, Object>) retire.get("sens");

        retablir(preparation, retire.get("motId"), sens.get("id"), retire.get("ordre"))
                .statusCode(409)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("preparation.mot_deja_present"));
        assertEquals(List.of("galette:1"), motsEnBase(preparation));
        assertEquals(1L, nombre("select count(*) from sens_retenu"));
    }

    @Test
    void retirerOuRetablirChezUnCollegueOuUnInconnuEstIntrouvable() {
        UUID deZoe = preparation(ZOE, "gs", "2026-11-09T08:00:00Z");
        MotVue loup = QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerMot("loup"));
        SensVue animal = QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(loup.id(), "animal", "nom"));
        UUID motDeZoe = motDePreparation(deZoe, loup.id(), 1);
        sensRetenu(deZoe, motDeZoe, animal.id(), ZOE, "gs");
        UUID autre = preparation(CLAIRE, "gs", "2026-11-08T09:00:00Z");
        UUID motDeLAutre = UUID.fromString(ajouter(autre, "renard").statusCode(201).extract().path("id"));
        ajouter(preparation, "galette").statusCode(201);

        // Préparation d'un collègue, Préparation inconnue, Mot de Préparation inconnu ou d'une autre Préparation.
        introuvable(retirer(deZoe, motDeZoe));
        introuvable(retirer(UUID.randomUUID(), motDeZoe));
        introuvable(retirer(preparation, UUID.randomUUID()));
        introuvable(retirer(preparation, motDeZoe));
        introuvable(retirer(preparation, motDeLAutre));
        // Rétablir : Préparation d'un collègue ou inconnue, Mot inconnu.
        introuvable(retablir(deZoe, loup.id(), animal.id(), 2));
        introuvable(retablir(UUID.randomUUID(), loup.id(), animal.id(), 2));
        introuvable(retablir(preparation, UUID.randomUUID(), animal.id(), 2));
        introuvable(retablir(preparation, null, animal.id(), 2));

        assertEquals(List.of("loup:1"), motsEnBase(deZoe));
        assertEquals(List.of("renard:1"), motsEnBase(autre));
        assertEquals(List.of("galette:1"), motsEnBase(preparation));
        assertEquals(3L, nombre("select count(*) from sens_retenu"));
    }

    @Test
    void unRetablissementSansCorpsEstRefuse() {
        given().contentType(ContentType.JSON)
                .when().post("/api/preparations/" + preparation + "/mots/retablissement")
                .then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("requete.invalide"));
    }

    private ValidatableResponse retirer(UUID preparationId, UUID motPreparationId) {
        return given().when().delete("/api/preparations/" + preparationId + "/mots/" + motPreparationId).then();
    }

    private ValidatableResponse retablir(UUID preparationId, Object motId, Object sensId, Object ordre) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("motId", motId == null ? null : motId.toString());
        corps.put("sensId", sensId == null ? null : sensId.toString());
        corps.put("ordre", ordre);
        return given().contentType(ContentType.JSON).body(corps)
                .when().post("/api/preparations/" + preparationId + "/mots/retablissement")
                .then();
    }

    /** Mots listés par l'API, sans l'identifiant de Mot de Préparation, chacun en « motId|forme|ordre|sens ». */
    private List<String> motsListes(UUID preparationId) {
        List<Map<String, Object>> mots = given().when().get("/api/preparations/" + preparationId + "/mots").then()
                .statusCode(200).extract().jsonPath().getList("$");
        return mots.stream()
                .map(mot -> mot.get("motId") + "|" + mot.get("forme") + "|" + mot.get("ordre") + "|" + mot.get("sens"))
                .toList();
    }

    private static void introuvable(ValidatableResponse reponse) {
        reponse.statusCode(404)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("ressource.introuvable"));
    }

    private ValidatableResponse ajouter(UUID preparationId, String saisie) {
        return given().contentType(ContentType.JSON).body(Map.of("saisie", saisie))
                .when().post("/api/preparations/" + preparationId + "/mots")
                .then();
    }

    private void refus(UUID preparationId, String saisie, int statut, String code) {
        ajouter(preparationId, saisie)
                .statusCode(statut)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo(code));
    }

    private UUID preparation(String proprietaire, String section, String creeLe) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into preparation (proprietaire_id, album_id, section, cree_le)"
                        + " values (:proprietaire, :album, :section, cast(:creeLe as timestamptz)) returning id")
                .setParameter("proprietaire", UUID.fromString(proprietaire))
                .setParameter("album", rouleGalette)
                .setParameter("section", section)
                .setParameter("creeLe", creeLe)
                .getSingleResult());
    }

    private UUID motDePreparation(UUID preparationId, UUID motId, int ordre) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into preparation_mot (preparation_id, mot_id, ordre) values (:preparation, :mot, :ordre)"
                        + " returning id")
                .setParameter("preparation", preparationId)
                .setParameter("mot", motId)
                .setParameter("ordre", ordre)
                .getSingleResult());
    }

    private void sensRetenu(UUID preparationId, UUID preparationMotId, UUID sensId, String enseignant,
            String section) {
        QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(
                "insert into sens_retenu (preparation_id, preparation_mot_id, sens_id, enseignant_id, album_id, section)"
                        + " values (:preparation, :mot, :sens, :enseignant, :album, :section)")
                .setParameter("preparation", preparationId)
                .setParameter("mot", preparationMotId)
                .setParameter("sens", sensId)
                .setParameter("enseignant", UUID.fromString(enseignant))
                .setParameter("album", rouleGalette)
                .setParameter("section", section)
                .executeUpdate());
    }

    /** Remplace en base le Sens retenu de ce Mot de Préparation, retenu à la date {@code creeLe}. */
    private void retenirEnBase(UUID preparationMotId, UUID sensId, String creeLe) {
        QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(
                "update sens_retenu set sens_id = :sens, cree_le = cast(:creeLe as timestamptz)"
                        + " where preparation_mot_id = :mot")
                .setParameter("sens", sensId)
                .setParameter("creeLe", creeLe)
                .setParameter("mot", preparationMotId)
                .executeUpdate());
    }

    /** Mots de la Préparation en base, dans l'ordre, chacun en « forme:ordre ». */
    private List<String> motsEnBase(UUID preparationId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            @SuppressWarnings("unchecked")
            List<Object[]> lignes = entityManager.createNativeQuery(
                    "select m.forme, p.ordre from preparation_mot p join mot m on m.id = p.mot_id"
                            + " where p.preparation_id = :preparation order by p.ordre")
                    .setParameter("preparation", preparationId)
                    .getResultList();
            return lignes.stream().map(ligne -> ligne[0] + ":" + ligne[1]).toList();
        });
    }

    /** Sens retenu en base pour ce Mot de Préparation, en « libellé|préparation|enseignant|album|section ». */
    private String sensRetenuEnBase(UUID preparationMotId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Object[] ligne = (Object[]) entityManager.createNativeQuery(
                    "select s.libelle, r.preparation_id, r.enseignant_id, r.album_id, r.section from sens_retenu r"
                            + " join sens s on s.id = r.sens_id where r.preparation_mot_id = :mot")
                    .setParameter("mot", preparationMotId)
                    .getSingleResult();
            return ligne[0] + "|" + ligne[1] + "|" + ligne[2] + "|" + ligne[3] + "|" + ligne[4];
        });
    }

    private long nombre(String requete) {
        return QuarkusTransaction.requiringNew()
                .call(() -> ((Number) entityManager.createNativeQuery(requete).getSingleResult()).longValue());
    }
}

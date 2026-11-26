package fr.corpusmots.preparations.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import fr.corpusmots.commun.api.EnseignantsDeTest;
import fr.corpusmots.commun.api.ProblemeDto;
import fr.corpusmots.referentiels.api.ReferentielsDeTest;
import fr.corpusmots.vocabulaire.api.ImagesDeTest;
import fr.corpusmots.vocabulaire.service.FichiersDeTest;
import fr.corpusmots.vocabulaire.service.Lexique;
import fr.corpusmots.vocabulaire.service.MotVue;
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
 * Panneau de choix d'Image (story 2.7, partie 3) : {@code GET /preparations/{id}/mots/{motPreparationId}/propositions},
 * {@code PUT /preparations/{id}/mots/{motPreparationId}/image} et le champ {@code remplacer} du téléversement. Une
 * ligne de test par ligne back de la matrice de la spec ; tout refus ne change rien.
 */
@QuarkusTest
@TestSecurity(user = ChoixImagePreparationResourceTest.PAUL)
@OidcSecurity(claims = @Claim(key = "sub", value = ChoixImagePreparationResourceTest.PAUL))
class ChoixImagePreparationResourceTest {

    static final String PAUL = "0190f0a0-0000-7000-8000-000000000891";
    static final String ZOE = "0190f0a0-0000-7000-8000-000000000892";

    @Inject
    EnseignantsDeTest enseignants;

    @Inject
    ReferentielsDeTest referentiels;

    @Inject
    ImagesDeTest images;

    @Inject
    Lexique lexique;

    @Inject
    EntityManager entityManager;

    UUID pouleRousse;
    UUID preparation;

    @BeforeEach
    void donnees() {
        enseignants.seulsActifs(PAUL, ZOE);
        images.effacer();
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("delete from sens_retenu").executeUpdate();
            entityManager.createNativeQuery("delete from preparation").executeUpdate();
            entityManager.createNativeQuery("delete from sens").executeUpdate();
            entityManager.createNativeQuery("delete from mot").executeUpdate();
        });
        referentiels.effacer();
        pouleRousse = referentiels.album("La petite poule rousse", "Byron Barton");
        preparation = preparation(PAUL);
    }

    @Test
    void lesPropositionsSontClasseesCommeLaDetection() {
        UUID farine = UUID.fromString(ajouter("farine"));
        UUID sensFarine = sensRetenu(farine);
        UUID a = image(PAUL, sensFarine, "privee", "gs");
        UUID c = image(PAUL, sensFarine, "privee", "ms");
        // B est la plus récente : seule la propriété la place après C.
        UUID b = image(ZOE, sensFarine, "versee", "ms");
        // Une Image privée de Zoé n'est jamais proposée.
        image(ZOE, sensFarine, "privee", "ms");
        List<Long> avant = nombres();

        propositions(preparation, farine)
                .statusCode(200)
                .body("motId", equalTo(motDe(farine).toString()))
                .body("forme", equalTo("farine"))
                .body("dejaDansLaPreparation", equalTo(true))
                .body("images.id", contains(c.toString(), b.toString(), a.toString()))
                .body("images[1].proprietaireId", equalTo(ZOE))
                .body("images[1].etat", equalTo("versee"))
                .body("images[1].sections", contains("ms"))
                .body("images[1].sens.id", equalTo(sensFarine.toString()))
                .body("images[1].dejaUtilisee", equalTo(false))
                .body("images[0].typeImage", equalTo("image_libre"))
                .body("images[0].albumOrigine", nullValue());
        assertEquals(avant, nombres());
    }

    @Test
    void lesImagesDeTousLesSensSontProposees() {
        MotVue avocat = mot("avocat");
        UUID fruit = sens(avocat, "fruit", "nom");
        UUID metier = sens(avocat, "métier", "nom");
        UUID imageFruit = image(PAUL, fruit, "privee", "ms");
        UUID imageMetier = image(PAUL, metier, "privee", "ms");
        UUID motPreparation = UUID.fromString(reutiliser(avocat.id(), imageFruit));

        propositions(preparation, motPreparation)
                .statusCode(200)
                .body("images", hasSize(2))
                .body("images.id", containsInAnyOrder(imageFruit.toString(), imageMetier.toString()))
                .body("images.find { it.id == '" + imageFruit + "' }.sens.libelle", equalTo("fruit"))
                .body("images.find { it.id == '" + imageMetier + "' }.sens.libelle", equalTo("métier"))
                .body("images.find { it.id == '" + imageFruit + "' }.dejaUtilisee", equalTo(true));
    }

    @Test
    void remplacerDelieLAncienneImageSansLaToucher() {
        MotVue farine = mot("farine");
        UUID sensFarine = sens(farine, "farine", "nom");
        UUID x = image(PAUL, sensFarine, "privee", "ms");
        UUID y = image(ZOE, sensFarine, "versee", "ms");
        UUID motPreparation = UUID.fromString(reutiliser(farine.id(), x));
        String ligneX = ligneImage(x);

        choisir(preparation, motPreparation, y)
                .statusCode(200)
                .body("id", equalTo(motPreparation.toString()))
                .body("forme", equalTo("farine"))
                .body("sens.id", equalTo(sensFarine.toString()))
                .body("illustre", equalTo(true))
                .body("image.id", equalTo(y.toString()))
                .body("image.proprietaireId", equalTo(ZOE))
                // Image d'une collègue : aucune versabilité (story 3.3).
                .body("image.versabilite", nullValue());

        assertEquals(y + "|" + PAUL + "|" + pouleRousse + "|ms|reutilisee", lienEnBase(motPreparation));
        assertEquals(1L, nombre("select count(*) from lien_image"));
        assertEquals(ligneX, ligneImage(x));
        assertEquals(2L, nombre("select count(*) from image"));
    }

    @Test
    void choisirPourUnMotAIllustrerLeLie() {
        UUID farine = UUID.fromString(ajouter("farine"));
        UUID y = image(PAUL, sensRetenu(farine), "privee", "ms");

        choisir(preparation, farine, y)
                .statusCode(200)
                .body("illustre", equalTo(true))
                .body("image.id", equalTo(y.toString()))
                // Image libre sourcée sous CC0 de Paul, privée : versable (story 3.3).
                .body("image.versabilite", equalTo("versable"));

        assertEquals(y + "|" + PAUL + "|" + pouleRousse + "|ms|reutilisee", lienEnBase(farine));
        given().when().get("/api/preparations/" + preparation)
                .then().statusCode(200).body("nombreIllustres", equalTo(1));
    }

    @Test
    void uneImageDUnAutreSensChangeLeSensRetenu() {
        MotVue avocat = mot("avocat");
        UUID fruit = sens(avocat, "fruit", "nom");
        UUID metier = sens(avocat, "métier", "nom");
        UUID x = image(PAUL, fruit, "privee", "ms");
        UUID y = image(PAUL, metier, "privee", "ms");
        UUID motPreparation = UUID.fromString(reutiliser(avocat.id(), x));

        choisir(preparation, motPreparation, y)
                .statusCode(200)
                .body("sens.id", equalTo(metier.toString()))
                .body("sens.libelle", equalTo("métier"))
                .body("image.id", equalTo(y.toString()));

        assertEquals(metier, sensRetenu(motPreparation));
        assertEquals(y + "|" + PAUL + "|" + pouleRousse + "|ms|reutilisee", lienEnBase(motPreparation));
        assertEquals(1L, nombre("select count(*) from sens_retenu"));
    }

    @Test
    void uneImageVerseeDuProprietaireNePortePasDeVersabilite() {
        UUID farine = UUID.fromString(ajouter("farine"));
        UUID versee = image(PAUL, sensRetenu(farine), "versee", "ms");

        choisir(preparation, farine, versee)
                .statusCode(200)
                .body("image.id", equalTo(versee.toString()))
                .body("image.versabilite", nullValue());
    }

    @Test
    void choisirLImageActuelleNEcritRien() {
        MotVue farine = mot("farine");
        UUID x = image(PAUL, sens(farine, "farine", "nom"), "privee", "ms");
        UUID motPreparation = UUID.fromString(reutiliser(farine.id(), x));
        String avant = identifiantDuLien(motPreparation);

        choisir(preparation, motPreparation, x)
                .statusCode(200)
                .body("image.id", equalTo(x.toString()));

        assertEquals(avant, identifiantDuLien(motPreparation));
    }

    @Test
    void lImagePriveeDUnCollegueOuAbsenteEstIndisponible() {
        MotVue farine = mot("farine");
        UUID sensFarine = sens(farine, "farine", "nom");
        UUID x = image(PAUL, sensFarine, "privee", "ms");
        UUID privee = image(ZOE, sensFarine, "privee", "ms");
        UUID motPreparation = UUID.fromString(reutiliser(farine.id(), x));
        String avant = etat(motPreparation);

        for (UUID image : new UUID[] { privee, UUID.randomUUID() }) {
            refus(choisir(preparation, motPreparation, image), 404, "image.indisponible");
        }
        assertEquals(avant, etat(motPreparation));
    }

    @Test
    void lImageDUnAutreMotEstRefusee() {
        MotVue cote = mot("côte");
        UUID x = image(PAUL, sens(cote, "corps", "nom"), "privee", "ms");
        UUID dAutreMot = image(PAUL, sens(mot("côté"), "direction", "nom"), "privee", "ms");
        UUID motPreparation = UUID.fromString(reutiliser(cote.id(), x));
        String avant = etat(motPreparation);

        refus(choisir(preparation, motPreparation, dAutreMot), 400, "image.sens_different");
        assertEquals(avant, etat(motPreparation));
    }

    @Test
    void laPreparationOuLeMotDUnCollegueSontIntrouvables() {
        MotVue farine = mot("farine");
        UUID sensFarine = sens(farine, "farine", "nom");
        UUID x = image(PAUL, sensFarine, "privee", "ms");
        UUID y = image(ZOE, sensFarine, "versee", "ms");
        UUID motPreparation = UUID.fromString(reutiliser(farine.id(), x));
        UUID deZoe = preparation(ZOE);
        UUID motDeZoe = motDePreparation(deZoe, farine.id());
        String avant = etat(motPreparation);

        for (UUID[] cible : new UUID[][] { { deZoe, motDeZoe }, { UUID.randomUUID(), motPreparation },
                { deZoe, motPreparation }, { preparation, motDeZoe }, { preparation, UUID.randomUUID() } }) {
            refus(choisir(cible[0], cible[1], y), 404, "ressource.introuvable");
            refus(propositions(cible[0], cible[1]), 404, "ressource.introuvable");
        }
        assertEquals(avant, etat(motPreparation));
        assertEquals(0L, nombre("select count(*) from lien_image where preparation_mot_id = '" + motDeZoe + "'"));
    }

    @Test
    void unCorpsOuUnChampManquantEstRefuse() {
        MotVue farine = mot("farine");
        UUID x = image(PAUL, sens(farine, "farine", "nom"), "privee", "ms");
        UUID motPreparation = UUID.fromString(reutiliser(farine.id(), x));
        String avant = etat(motPreparation);

        refus(given().contentType(ContentType.JSON)
                .when().put("/api/preparations/" + preparation + "/mots/" + motPreparation + "/image").then(),
                400, "requete.invalide");
        refus(choisir(preparation, motPreparation, null), 400, "requete.invalide");
        assertEquals(avant, etat(motPreparation));
    }

    @Test
    void televerserEnRemplacantLieLaNouvelleImage() {
        MotVue farine = mot("farine");
        UUID x = image(PAUL, sens(farine, "farine", "nom"), "privee", "ms");
        UUID motPreparation = UUID.fromString(reutiliser(farine.id(), x));

        String nouvelle = televerser(motPreparation, "true")
                .statusCode(201)
                .body("illustre", equalTo(true))
                .body("image.id", notNullValue())
                .body("image.proprietaireId", equalTo(PAUL))
                // Téléversée en type inconnu : le motif de refus du versement (story 3.3).
                .body("image.versabilite", equalTo("image.versement.type_inconnu"))
                .extract().path("image.id");

        assertNotEquals(x.toString(), nouvelle);
        // L'Image créée en remplacement reçoit aussi la Section de la Préparation (story 2.11).
        given().when().get("/api/images/" + nouvelle)
                .then().statusCode(200).body("sections", equalTo(List.of("ms")));
        assertEquals(nouvelle + "|" + PAUL + "|" + pouleRousse + "|ms|nouvelle", lienEnBase(motPreparation));
        assertEquals(1L, nombre("select count(*) from lien_image"));
        assertEquals(2L, nombre("select count(*) from image"));
    }

    @Test
    void televerserSansRemplacerUnMotIllustreEstRefuse() {
        MotVue farine = mot("farine");
        UUID x = image(PAUL, sens(farine, "farine", "nom"), "privee", "ms");
        UUID motPreparation = UUID.fromString(reutiliser(farine.id(), x));
        String avant = etat(motPreparation);

        refus(televerser(motPreparation, null), 409, "preparation.mot_deja_illustre");
        refus(televerser(motPreparation, "false"), 409, "preparation.mot_deja_illustre");
        assertEquals(avant, etat(motPreparation));
        assertEquals(1L, nombre("select count(*) from image"));
        assertEquals(1L, nombre("select count(*) from image_fichier"));
    }

    // --- Outils ---

    private static void refus(ValidatableResponse reponse, int statut, String code) {
        reponse.statusCode(statut)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo(code));
    }

    private static ValidatableResponse propositions(UUID preparationId, UUID motPreparationId) {
        return given().when()
                .get("/api/preparations/" + preparationId + "/mots/" + motPreparationId + "/propositions").then();
    }

    private static ValidatableResponse choisir(UUID preparationId, UUID motPreparationId, UUID imageId) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("imageId", imageId == null ? null : imageId.toString());
        return given().contentType(ContentType.JSON).body(corps)
                .when().put("/api/preparations/" + preparationId + "/mots/" + motPreparationId + "/image")
                .then();
    }

    private ValidatableResponse televerser(UUID motPreparationId, String remplacer) {
        var requete = given().multiPart("fichier", "a.png", FichiersDeTest.png(10, 10), "application/octet-stream")
                .multiPart("typeImage", "inconnu");
        if (remplacer != null) {
            requete.multiPart("remplacer", remplacer);
        }
        return requete.when().post("/api/preparations/" + preparation + "/mots/" + motPreparationId + "/image")
                .then();
    }

    private String ajouter(String saisie) {
        return given().contentType(ContentType.JSON).body(Map.of("saisie", saisie))
                .when().post("/api/preparations/" + preparation + "/mots")
                .then().statusCode(201).extract().path("id");
    }

    private String reutiliser(UUID motId, UUID imageId) {
        return given().contentType(ContentType.JSON)
                .body(Map.of("motId", motId.toString(), "imageId", imageId.toString()))
                .when().post("/api/preparations/" + preparation + "/mots/reutilisation")
                .then().statusCode(201).extract().path("id");
    }

    private MotVue mot(String forme) {
        return QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerMot(forme));
    }

    private UUID sens(MotVue mot, String libelle, String categorie) {
        return QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(mot.id(), libelle, categorie)).id();
    }

    /** Image libre de ce propriétaire, à cet état, qui coche cette Section. */
    private UUID image(String proprietaire, UUID sensId, String etat, String section) {
        UUID image = images.image(UUID.fromString(proprietaire), sensId, etat, "image_libre", "cc0_domaine_public",
                "site web", null, null);
        images.classer(image, null, List.of(), List.of(section));
        return image;
    }

    private UUID preparation(String proprietaire) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into preparation (proprietaire_id, album_id, section) values (:proprietaire, :album, 'ms')"
                        + " returning id")
                .setParameter("proprietaire", UUID.fromString(proprietaire))
                .setParameter("album", pouleRousse)
                .getSingleResult());
    }

    private UUID motDePreparation(UUID preparationId, UUID motId) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into preparation_mot (preparation_id, mot_id, ordre) values (:preparation, :mot, 1)"
                        + " returning id")
                .setParameter("preparation", preparationId)
                .setParameter("mot", motId)
                .getSingleResult());
    }

    private UUID motDe(UUID preparationMotId) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager
                .createNativeQuery("select mot_id from preparation_mot where id = :id")
                .setParameter("id", preparationMotId)
                .getSingleResult());
    }

    private UUID sensRetenu(UUID preparationMotId) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager
                .createNativeQuery("select sens_id from sens_retenu where preparation_mot_id = :id")
                .setParameter("id", preparationMotId)
                .getSingleResult());
    }

    /** Lien du Mot de Préparation en base : « image|enseignant|album|section|origine », null sans lien. */
    private String lienEnBase(UUID preparationMotId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            List<?> lignes = entityManager.createNativeQuery(
                    "select image_id, enseignant_id, album_id, section, origine from lien_image"
                            + " where preparation_mot_id = :id")
                    .setParameter("id", preparationMotId)
                    .getResultList();
            if (lignes.isEmpty()) {
                return null;
            }
            Object[] ligne = (Object[]) lignes.get(0);
            return ligne[0] + "|" + ligne[1] + "|" + ligne[2] + "|" + ligne[3] + "|" + ligne[4];
        });
    }

    private String identifiantDuLien(UUID preparationMotId) {
        return QuarkusTransaction.requiringNew().call(() -> String.valueOf(entityManager
                .createNativeQuery("select id from lien_image where preparation_mot_id = :id")
                .setParameter("id", preparationMotId)
                .getSingleResult()));
    }

    /** État complet du Mot de Préparation : identifiant du lien, lien, Sens retenu, nombres de lignes. */
    private String etat(UUID preparationMotId) {
        return identifiantDuLien(preparationMotId) + "|" + lienEnBase(preparationMotId) + "|"
                + sensRetenu(preparationMotId) + "|" + nombres();
    }

    /** Image en base : « etat|sens|propriétaire|version ». */
    private String ligneImage(UUID imageId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Object[] ligne = (Object[]) entityManager.createNativeQuery(
                    "select etat, sens_id, proprietaire_id, version from image where id = :id")
                    .setParameter("id", imageId)
                    .getSingleResult();
            return ligne[0] + "|" + ligne[1] + "|" + ligne[2] + "|" + ligne[3];
        });
    }

    /** Nombre de lignes de {@code preparation_mot}, {@code sens_retenu}, {@code lien_image} et {@code image}. */
    private List<Long> nombres() {
        return List.of(nombre("select count(*) from preparation_mot"), nombre("select count(*) from sens_retenu"),
                nombre("select count(*) from lien_image"), nombre("select count(*) from image"));
    }

    private long nombre(String requete) {
        return QuarkusTransaction.requiringNew()
                .call(() -> ((Number) entityManager.createNativeQuery(requete).getSingleResult()).longValue());
    }
}

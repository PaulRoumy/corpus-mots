package fr.corpusmots.preparations.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import fr.corpusmots.commun.api.EnseignantsDeTest;
import fr.corpusmots.commun.api.ErreurMetier;
import fr.corpusmots.commun.api.ProblemeDto;
import fr.corpusmots.commun.service.Section;
import fr.corpusmots.referentiels.api.ReferentielsDeTest;
import fr.corpusmots.vocabulaire.api.ImagesDeTest;
import fr.corpusmots.vocabulaire.service.Acteur;
import fr.corpusmots.vocabulaire.service.Lexique;
import fr.corpusmots.vocabulaire.service.LierImageCommande;
import fr.corpusmots.vocabulaire.service.MotVue;
import fr.corpusmots.vocabulaire.service.OrigineLien;
import fr.corpusmots.vocabulaire.service.Usages;
import fr.corpusmots.vocabulaire.service.Versements;
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
 * {@code POST /preparations/{id}/mots/reutilisation} (story 2.7, partie 2) : retenir une Image du Panneau de détection
 * ajoute son Mot en fin de Préparation, avec le Sens de l'Image, et la lie avec l'origine {@code reutilisee}, sans
 * copie ; tout refus n'écrit rien. Une ligne de test par ligne back de la matrice de la spec.
 */
@QuarkusTest
@TestSecurity(user = ReutilisationImagePreparationResourceTest.PAUL)
@OidcSecurity(claims = @Claim(key = "sub", value = ReutilisationImagePreparationResourceTest.PAUL))
class ReutilisationImagePreparationResourceTest {

    static final String PAUL = "0190f0a0-0000-7000-8000-000000000881";
    static final String ZOE = "0190f0a0-0000-7000-8000-000000000882";

    @Inject
    EnseignantsDeTest enseignants;

    @Inject
    ReferentielsDeTest referentiels;

    @Inject
    ImagesDeTest images;

    @Inject
    Lexique lexique;

    @Inject
    Usages usages;

    @Inject
    Versements versements;

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
    void reutiliserSonImageAjouteLeMotEnFinAvecLeSensDeLImage() {
        UUID cuisine = referentiels.theme("cuisine");
        given().contentType(ContentType.JSON).body(Map.of("themeDefautId", cuisine.toString()))
                .when().put("/api/preparations/" + preparation + "/reglages")
                .then().statusCode(200);
        ajouter("grain");
        MotVue farine = mot("farine");
        UUID sensFarine = sens(farine, "farine", "nom");
        UUID image = image(PAUL, sensFarine, "privee");

        String id = reutiliser(preparation, farine.id(), image)
                .statusCode(201)
                .body("motId", equalTo(farine.id().toString()))
                .body("forme", equalTo("farine"))
                .body("ordre", equalTo(2))
                .body("sens.id", equalTo(sensFarine.toString()))
                .body("sens.libelle", equalTo("farine"))
                .body("themeId", equalTo(cuisine.toString()))
                .body("illustre", equalTo(true))
                .body("image.id", equalTo(image.toString()))
                .body("image.proprietaireId", equalTo(PAUL))
                .extract().path("id");

        assertEquals(List.of("grain:1", "farine:2"), motsEnBase());
        assertEquals(sensFarine, sensRetenu(UUID.fromString(id)));
        assertEquals(image + "|" + PAUL + "|" + pouleRousse + "|ms|reutilisee", lienEnBase(UUID.fromString(id)));
        assertEquals(1L, nombre("select count(*) from image"));
        given().when().get("/api/preparations/" + preparation)
                .then()
                .statusCode(200)
                .body("nombreMots", equalTo(2))
                .body("nombreIllustres", equalTo(1));
    }

    @Test
    void lImageVerseeDUnCollegueEstLieeSansChangerDeProprietaire() {
        MotVue farine = mot("farine");
        UUID image = image(ZOE, sens(farine, "farine", "nom"), "versee");

        String id = reutiliser(preparation, farine.id(), image)
                .statusCode(201)
                .body("image.id", equalTo(image.toString()))
                .body("image.proprietaireId", equalTo(ZOE))
                .extract().path("id");

        assertEquals(image + "|" + PAUL + "|" + pouleRousse + "|ms|reutilisee", lienEnBase(UUID.fromString(id)));
        assertEquals(ZOE + "|versee", proprietaireEtEtat(image));
        assertEquals(1L, nombre("select count(*) from image"));
    }

    @Test
    void leSensDeLImageRemplaceLeSensHabituel() {
        MotVue avocat = mot("avocat");
        UUID fruit = sens(avocat, "fruit", "nom");
        UUID metier = sens(avocat, "métier", "nom");
        images.sensRetenu(fruit, UUID.fromString(PAUL), pouleRousse);
        UUID image = image(PAUL, metier, "privee");

        String id = reutiliser(preparation, avocat.id(), image)
                .statusCode(201)
                .body("sens.id", equalTo(metier.toString()))
                .body("sens.libelle", equalTo("métier"))
                .extract().path("id");

        assertEquals(metier, sensRetenu(UUID.fromString(id)));
    }

    /**
     * Story 3.5, partie 1 : Zoé ne verse plus son Image que Paul a réutilisée. Le lien de Paul reste ; il lit l'Image
     * {@code retiree}, non réutilisable, dans sa Préparation et sa Carte d'identité, et ne la voit plus proposée.
     */
    @Test
    void lImageQuUnCollegueNeVersePlusEstLueRetireeDansLaPreparation() {
        MotVue farine = mot("farine");
        UUID image = image(ZOE, sens(farine, "farine", "nom"), "versee");
        String motPreparation = reutiliser(preparation, farine.id(), image).statusCode(201)
                .body("image.aRemplacer", equalTo(null))
                .body("image.reutilisable", equalTo(true))
                .extract().path("id");

        versements.nePlusVerser(image, true, new Acteur.Proprietaire(UUID.fromString(ZOE)));

        assertEquals(ZOE + "|privee", proprietaireEtEtat(image));
        assertEquals(image + "|" + PAUL + "|" + pouleRousse + "|ms|reutilisee",
                lienEnBase(UUID.fromString(motPreparation)));
        given().when().get("/api/preparations/" + preparation + "/mots")
                .then().statusCode(200)
                .body("[0].illustre", equalTo(true))
                .body("[0].image.id", equalTo(image.toString()))
                .body("[0].image.etat", equalTo("privee"))
                .body("[0].image.aRemplacer", equalTo("retiree"))
                .body("[0].image.reutilisable", equalTo(false));
        given().when().get("/api/images/" + image)
                .then().statusCode(200)
                .body("aRemplacer", equalTo("retiree"))
                .body("reutilisable", equalTo(false));
        given().queryParam("saisie", "farine")
                .when().get("/api/preparations/" + preparation + "/detection")
                .then().statusCode(200)
                .body("mots.images.flatten().id", not(hasItem(image.toString())));
        given().when().get("/api/preparations/" + preparation + "/mots/" + motPreparation + "/propositions")
                .then().statusCode(200)
                .body("images.id", not(hasItem(image.toString())));
        given().when().get("/api/images?provenance=tout")
                .then().statusCode(200)
                .body("elements.id", not(hasItem(image.toString())));
    }

    @Test
    void lImagePriveeDUnCollegueOuAbsenteEstIndisponible() {
        MotVue farine = mot("farine");
        UUID privee = image(ZOE, sens(farine, "farine", "nom"), "privee");

        for (UUID image : new UUID[] { privee, UUID.randomUUID() }) {
            refus(reutiliser(preparation, farine.id(), image), 404, "image.indisponible");
        }
        rienNEstEcrit();
    }

    @Test
    void lImageDUnAutreMotEstRefusee() {
        MotVue cote = mot("côte");
        sens(cote, "à compléter", null);
        UUID image = image(PAUL, sens(mot("côté"), "côté", "nom"), "privee");

        refus(reutiliser(preparation, cote.id(), image), 400, "image.sens_different");
        rienNEstEcrit();
    }

    @Test
    void sousVerrouLImageNonProposableOuDUnAutreSensGardeLesMemesCodes() {
        // Usages.lierImage revérifie sous verrou ce que reutiliserImage a lu avant : mêmes codes que le contrôle
        // préalable si l'Image a changé entre-temps (rétrospective de l'Epic 2, constat C-2).
        ajouter("farine");
        UUID motPreparation = QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager
                .createNativeQuery("select id from preparation_mot where preparation_id = :preparation")
                .setParameter("preparation", preparation)
                .getSingleResult());
        MotVue farine = mot("farine");
        UUID sensAvant = sensRetenu(motPreparation);
        UUID privee = image(ZOE, sensAvant, "privee");
        UUID autreSens = image(PAUL, sens(farine, "poudre", "nom"), "privee");

        for (UUID image : new UUID[] { privee, UUID.randomUUID() }) {
            String cas = image.equals(privee) ? "image privée d'un collègue" : "image absente";
            ErreurMetier erreur = assertThrows(ErreurMetier.class, () -> lier(motPreparation, image), cas);
            assertEquals(404, erreur.status(), cas);
            assertEquals("image.indisponible", erreur.code(), cas);
        }
        String cas = "image d'un autre sens";
        ErreurMetier erreur = assertThrows(ErreurMetier.class, () -> lier(motPreparation, autreSens), cas);
        assertEquals(400, erreur.status(), cas);
        assertEquals("image.sens_different", erreur.code(), cas);
        // Rien d'autre n'est écrit : le Mot ajouté reste seul, avec son Sens retenu, sans lien.
        assertEquals(List.of("farine:1"), motsEnBase());
        assertEquals(1L, nombre("select count(*) from sens_retenu"));
        assertEquals(sensAvant, sensRetenu(motPreparation));
        assertEquals(0L, nombre("select count(*) from lien_image"));
    }

    @Test
    void unMotDejaPresentEstRefuse() {
        ajouter("farine");
        MotVue farine = mot("farine");
        UUID image = image(PAUL, sens(farine, "farine", "nom"), "privee");

        refus(reutiliser(preparation, farine.id(), image), 409, "preparation.mot_deja_present");
        assertEquals(List.of("farine:1"), motsEnBase());
        assertEquals(1L, nombre("select count(*) from sens_retenu"));
        assertEquals(0L, nombre("select count(*) from lien_image"));
    }

    @Test
    void laPreparationDUnCollegueOuUnMotInconnuSontIntrouvables() {
        UUID deZoe = preparation(ZOE);
        MotVue farine = mot("farine");
        UUID image = image(ZOE, sens(farine, "farine", "nom"), "versee");

        refus(reutiliser(deZoe, farine.id(), image), 404, "ressource.introuvable");
        refus(reutiliser(UUID.randomUUID(), farine.id(), image), 404, "ressource.introuvable");
        refus(reutiliser(preparation, UUID.randomUUID(), image), 404, "ressource.introuvable");
        rienNEstEcrit();
    }

    @Test
    void unCorpsOuUnChampManquantEstRefuse() {
        MotVue farine = mot("farine");
        UUID image = image(PAUL, sens(farine, "farine", "nom"), "privee");

        refus(given().contentType(ContentType.JSON)
                .when().post("/api/preparations/" + preparation + "/mots/reutilisation").then(),
                400, "requete.invalide");
        refus(reutiliser(preparation, null, image), 400, "requete.invalide");
        refus(reutiliser(preparation, farine.id(), null), 400, "requete.invalide");
        rienNEstEcrit();
    }

    // --- Outils ---

    private void rienNEstEcrit() {
        assertEquals(0L, nombre("select count(*) from preparation_mot"));
        assertEquals(0L, nombre("select count(*) from sens_retenu"));
        assertEquals(0L, nombre("select count(*) from lien_image"));
    }

    private static void refus(ValidatableResponse reponse, int statut, String code) {
        reponse.statusCode(statut)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo(code));
    }

    private static ValidatableResponse reutiliser(UUID preparationId, UUID motId, UUID imageId) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("motId", motId == null ? null : motId.toString());
        corps.put("imageId", imageId == null ? null : imageId.toString());
        return given().contentType(ContentType.JSON).body(corps)
                .when().post("/api/preparations/" + preparationId + "/mots/reutilisation")
                .then();
    }

    private void lier(UUID motPreparation, UUID image) {
        usages.lierImage(new LierImageCommande(preparation, motPreparation, image, pouleRousse, Section.MS,
                OrigineLien.REUTILISEE));
    }

    private void ajouter(String saisie) {
        given().contentType(ContentType.JSON).body(Map.of("saisie", saisie))
                .when().post("/api/preparations/" + preparation + "/mots")
                .then().statusCode(201);
    }

    private MotVue mot(String forme) {
        return QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerMot(forme));
    }

    private UUID sens(MotVue mot, String libelle, String categorie) {
        return QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(mot.id(), libelle, categorie)).id();
    }

    private UUID image(String proprietaire, UUID sensId, String etat) {
        return images.image(UUID.fromString(proprietaire), sensId, etat, new byte[] { 1 }, new byte[] { 2 });
    }

    private UUID preparation(String proprietaire) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into preparation (proprietaire_id, album_id, section) values (:proprietaire, :album, 'ms')"
                        + " returning id")
                .setParameter("proprietaire", UUID.fromString(proprietaire))
                .setParameter("album", pouleRousse)
                .getSingleResult());
    }

    /** Mots de la Préparation de Paul en base, dans l'ordre, chacun en « forme:ordre ». */
    private List<String> motsEnBase() {
        return QuarkusTransaction.requiringNew().call(() -> {
            @SuppressWarnings("unchecked")
            List<Object[]> lignes = entityManager.createNativeQuery(
                    "select m.forme, p.ordre from preparation_mot p join mot m on m.id = p.mot_id"
                            + " where p.preparation_id = :preparation order by p.ordre")
                    .setParameter("preparation", preparation)
                    .getResultList();
            return lignes.stream().map(ligne -> ligne[0] + ":" + ligne[1]).toList();
        });
    }

    private UUID sensRetenu(UUID preparationMotId) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager
                .createNativeQuery("select sens_id from sens_retenu where preparation_mot_id = :id")
                .setParameter("id", preparationMotId)
                .getSingleResult());
    }

    /** Lien du Mot de Préparation en base : « image|enseignant|album|section|origine ». */
    private String lienEnBase(UUID preparationMotId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Object[] ligne = (Object[]) entityManager.createNativeQuery(
                    "select image_id, enseignant_id, album_id, section, origine from lien_image"
                            + " where preparation_mot_id = :id")
                    .setParameter("id", preparationMotId)
                    .getSingleResult();
            return ligne[0] + "|" + ligne[1] + "|" + ligne[2] + "|" + ligne[3] + "|" + ligne[4];
        });
    }

    private String proprietaireEtEtat(UUID imageId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Object[] ligne = (Object[]) entityManager.createNativeQuery(
                    "select proprietaire_id, etat from image where id = :id")
                    .setParameter("id", imageId)
                    .getSingleResult();
            return ligne[0] + "|" + ligne[1];
        });
    }

    private long nombre(String requete) {
        return QuarkusTransaction.requiringNew()
                .call(() -> ((Number) entityManager.createNativeQuery(requete).getSingleResult()).longValue());
    }
}

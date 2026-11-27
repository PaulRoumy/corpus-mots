package fr.corpusmots.preparations.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

import fr.corpusmots.commun.api.EnseignantsDeTest;
import fr.corpusmots.commun.api.ProblemeDto;
import fr.corpusmots.referentiels.api.ReferentielsDeTest;
import fr.corpusmots.vocabulaire.api.ImagesDeTest;
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
 * {@code POST /preparations/{id}/utilisations} (story 3.4) : « Utiliser dans une préparation » depuis la Banque lie
 * l'Image au Mot qu'elle illustre, ajouté au besoin, avec l'origine {@code reutilisee}, sans copie ; tout refus n'écrit
 * rien. Une méthode par ligne back de la matrice de la spec.
 */
@QuarkusTest
@TestSecurity(user = UtilisationImagePreparationResourceTest.PAUL)
@OidcSecurity(claims = @Claim(key = "sub", value = UtilisationImagePreparationResourceTest.PAUL))
class UtilisationImagePreparationResourceTest {

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

    UUID rouleGalette;
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
        rouleGalette = referentiels.album("Roule galette", "Natha Caputo");
        preparation = preparation(PAUL);
    }

    @Test
    void leMotAbsentEstAjouteAvecLeSensDeLImageEtLImageLieeSansCopie() {
        ajouter("galette");
        MotVue renard = mot("renard");
        UUID animal = sens(renard, "animal", "nom");
        UUID image = image(ZOE, animal, "versee");
        // Un Mot écarté de l'Encart peut être ajouté explicitement : l'ajout l'emporte.
        ecarter(renard.id());

        String id = utiliser(preparation, image, null)
                .statusCode(201)
                .body("motId", equalTo(renard.id().toString()))
                .body("forme", equalTo("renard"))
                .body("ordre", equalTo(2))
                .body("sens.id", equalTo(animal.toString()))
                .body("illustre", equalTo(true))
                .body("image.id", equalTo(image.toString()))
                .body("image.proprietaireId", equalTo(ZOE))
                .extract().path("id");

        assertEquals(List.of("galette:1", "renard:2"), motsEnBase());
        assertEquals(animal, sensRetenu(UUID.fromString(id)));
        assertEquals(image + "|" + PAUL + "|" + rouleGalette + "|ms|reutilisee", lienEnBase(UUID.fromString(id)));
        assertEquals(ZOE + "|versee", proprietaireEtEtat(image));
        assertEquals(1L, nombre("select count(*) from image"));
        // À la réouverture de la Préparation, « renard » est illustré par l'Image de Zoé.
        given().when().get("/api/preparations/" + preparation + "/mots")
                .then().statusCode(200)
                .body("[1].forme", equalTo("renard"))
                .body("[1].image.id", equalTo(image.toString()));
    }

    @Test
    void maPropreImagePriveeAjouteLeMotAbsent() {
        MotVue renard = mot("renard");
        UUID animal = sens(renard, "animal", "nom");
        UUID mienne = image(PAUL, animal, "privee");

        String id = utiliser(preparation, mienne, null)
                .statusCode(201)
                .body("sens.id", equalTo(animal.toString()))
                .body("image.id", equalTo(mienne.toString()))
                .body("image.proprietaireId", equalTo(PAUL))
                .extract().path("id");

        assertEquals(List.of("renard:1"), motsEnBase());
        assertEquals(mienne + "|" + PAUL + "|" + rouleGalette + "|ms|reutilisee", lienEnBase(UUID.fromString(id)));
        assertEquals(PAUL + "|privee", proprietaireEtEtat(mienne));
        assertEquals(1L, nombre("select count(*) from image"));
    }

    @Test
    void leMotDejaIllustreParCetteMemeImageNeChangeRien() {
        MotVue renard = mot("renard");
        UUID animal = sens(renard, "animal", "nom");
        UUID mienne = image(PAUL, animal, "privee");
        UUID motPreparation = ajouter("renard");
        String lienAvant = lienEnBase(motPreparation);

        utiliser(preparation, mienne, null)
                .statusCode(200)
                .body("id", equalTo(motPreparation.toString()))
                .body("image.id", equalTo(mienne.toString()));

        assertEquals(mienne + "|" + PAUL + "|" + rouleGalette + "|ms|reutilisee", lienAvant);
        assertEquals(lienAvant, lienEnBase(motPreparation));
        assertEquals(1L, nombre("select count(*) from lien_image"));
        assertEquals(animal, sensRetenu(motPreparation));
        assertEquals(List.of("renard:1"), motsEnBase());
    }

    @Test
    void leMotAIllustrerEstLieEtPrendLeSensDeLImage() {
        UUID motPreparation = ajouter("renard");
        UUID sensAvant = sensRetenu(motPreparation);
        MotVue renard = mot("renard");
        UUID animal = sens(renard, "animal", "nom");
        UUID image = image(ZOE, animal, "versee");

        utiliser(preparation, image, null)
                .statusCode(200)
                .body("id", equalTo(motPreparation.toString()))
                .body("sens.id", equalTo(animal.toString()))
                .body("image.id", equalTo(image.toString()));

        assertEquals(List.of("renard:1"), motsEnBase());
        assertNotEquals(animal, sensAvant);
        assertEquals(animal, sensRetenu(motPreparation));
        assertEquals(image + "|" + PAUL + "|" + rouleGalette + "|ms|reutilisee", lienEnBase(motPreparation));
        assertEquals(1L, nombre("select count(*) from image"));
    }

    @Test
    void leMotDejaIllustreSansRemplacerEstRefuseSansRienEcrire() {
        MotVue renard = mot("renard");
        UUID animal = sens(renard, "animal", "nom");
        UUID mienne = image(PAUL, animal, "privee");
        UUID motPreparation = ajouter("renard");
        String lienAvant = lienEnBase(motPreparation);
        UUID deZoe = image(ZOE, sens(renard, "personnage", "nom"), "versee");

        refus(utiliser(preparation, deZoe, null), 409, "preparation.mot_deja_illustre");
        refus(utiliser(preparation, deZoe, false), 409, "preparation.mot_deja_illustre");

        assertEquals(mienne + "|" + PAUL + "|" + rouleGalette + "|ms|reutilisee", lienAvant);
        assertEquals(lienAvant, lienEnBase(motPreparation));
        assertEquals(animal, sensRetenu(motPreparation));
        assertEquals(List.of("renard:1"), motsEnBase());
    }

    @Test
    void leMotDejaIllustreAvecRemplacerLieLaNouvelleEtDelieLAncienneIntacte() {
        MotVue renard = mot("renard");
        UUID animal = sens(renard, "animal", "nom");
        UUID mienne = image(PAUL, animal, "privee");
        UUID motPreparation = ajouter("renard");
        UUID personnage = sens(renard, "personnage", "nom");
        UUID deZoe = image(ZOE, personnage, "versee");

        utiliser(preparation, deZoe, true)
                .statusCode(200)
                .body("id", equalTo(motPreparation.toString()))
                .body("sens.id", equalTo(personnage.toString()))
                .body("image.id", equalTo(deZoe.toString()));

        assertEquals(deZoe + "|" + PAUL + "|" + rouleGalette + "|ms|reutilisee", lienEnBase(motPreparation));
        assertEquals(personnage, sensRetenu(motPreparation));
        assertEquals(PAUL + "|privee|" + animal, proprietaireEtEtat(mienne) + "|" + sensDeLImage(mienne));
        assertEquals(1L, nombre("select count(*) from lien_image"));
        assertEquals(2L, nombre("select count(*) from image"));
    }

    @Test
    void lImagePriveeDUnCollegueAbandonneeOuAbsenteEstIndisponible() {
        MotVue renard = mot("renard");
        UUID animal = sens(renard, "animal", "nom");
        UUID privee = image(ZOE, animal, "privee");
        UUID abandonnee = image(ZOE, animal, "abandonnee");

        for (UUID image : new UUID[] { privee, abandonnee, UUID.randomUUID() }) {
            refus(utiliser(preparation, image, null), 404, "image.indisponible");
            refus(utiliser(preparation, image, true), 404, "image.indisponible");
        }
        rienNEstEcrit();
    }

    @Test
    void laPreparationDUnCollegueOuInconnueEstIntrouvable() {
        UUID deZoe = preparation(ZOE);
        UUID image = image(ZOE, sens(mot("renard"), "animal", "nom"), "versee");

        refus(utiliser(deZoe, image, null), 404, "ressource.introuvable");
        refus(utiliser(UUID.randomUUID(), image, null), 404, "ressource.introuvable");
        rienNEstEcrit();
    }

    @Test
    void unCorpsOuUneImageManquantsSontRefuses() {
        refus(given().contentType(ContentType.JSON)
                .when().post("/api/preparations/" + preparation + "/utilisations").then(),
                400, "requete.invalide");
        refus(utiliser(preparation, null, true), 400, "requete.invalide");
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

    private static ValidatableResponse utiliser(UUID preparationId, UUID imageId, Boolean remplacer) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("imageId", imageId == null ? null : imageId.toString());
        if (remplacer != null) {
            corps.put("remplacer", remplacer);
        }
        return given().contentType(ContentType.JSON).body(corps)
                .when().post("/api/preparations/" + preparationId + "/utilisations")
                .then();
    }

    private UUID ajouter(String saisie) {
        String id = given().contentType(ContentType.JSON).body(Map.of("saisie", saisie))
                .when().post("/api/preparations/" + preparation + "/mots")
                .then().statusCode(201)
                .extract().path("id");
        return UUID.fromString(id);
    }

    private void ecarter(UUID motId) {
        given().when().put("/api/preparations/" + preparation + "/ecartes/" + motId)
                .then().statusCode(204);
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
                .setParameter("album", rouleGalette)
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

    private UUID sensDeLImage(UUID imageId) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager
                .createNativeQuery("select sens_id from image where id = :id")
                .setParameter("id", imageId)
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

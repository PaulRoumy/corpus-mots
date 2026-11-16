package fr.corpusmots.preparations.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * {@code GET /preparations/{id}/detection} (story 2.7, partie 1) : Mots existants de même forme que la saisie, sans
 * casse ni accents, visibles de l'enseignant connecté (AD-2), avec leurs Sens, leurs Albums et leurs Images classées
 * par {@code vocabulaire} ; rien n'est écrit. Une ligne de test par ligne back de la matrice de la spec.
 */
@QuarkusTest
@TestSecurity(user = DetectionPreparationResourceTest.PAUL)
@OidcSecurity(claims = @Claim(key = "sub", value = DetectionPreparationResourceTest.PAUL))
class DetectionPreparationResourceTest {

    static final String PAUL = "0190f0a0-0000-7000-8000-000000000871";
    static final String ZOE = "0190f0a0-0000-7000-8000-000000000872";

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

    /** Album de la Préparation MS de Paul. */
    UUID pouleRousse;
    UUID preparation;

    @BeforeEach
    void donnees() {
        enseignants.seulsActifs(PAUL, ZOE);
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("delete from lien_image").executeUpdate();
            entityManager.createNativeQuery("delete from image_fichier").executeUpdate();
            entityManager.createNativeQuery("delete from image").executeUpdate();
            entityManager.createNativeQuery("delete from sens_retenu").executeUpdate();
            entityManager.createNativeQuery("delete from preparation").executeUpdate();
            entityManager.createNativeQuery("delete from sens").executeUpdate();
            entityManager.createNativeQuery("delete from mot").executeUpdate();
        });
        referentiels.effacer();
        pouleRousse = referentiels.album("La petite poule rousse", "Byron Barton");
        preparation = preparation(PAUL, pouleRousse, "ms");
    }

    @Test
    void unMotExistantMontreSonImageEtSaMarqueDejaUtilisee() {
        UUID farine = sens(mot("farine"), "à compléter", null);
        UUID image = image(PAUL, farine, "privee", "ms");

        detecter(preparation, "Farine")
                .statusCode(200)
                .body("forme", equalTo("Farine"))
                .body("mots", hasSize(1))
                .body("mots[0].forme", equalTo("farine"))
                .body("mots[0].dejaDansLaPreparation", equalTo(false))
                .body("mots[0].sens.libelle", contains("à compléter"))
                .body("mots[0].sens[0].aCompleter", equalTo(true))
                .body("mots[0].albums", empty())
                .body("mots[0].images", hasSize(1))
                .body("mots[0].images[0].id", equalTo(image.toString()))
                .body("mots[0].images[0].proprietaireId", equalTo(PAUL))
                .body("mots[0].images[0].etat", equalTo("privee"))
                .body("mots[0].images[0].aRemplacer", nullValue())
                .body("mots[0].images[0].reutilisable", equalTo(true))
                .body("mots[0].images[0].typeImage", equalTo("image_libre"))
                .body("mots[0].images[0].sections", contains("ms"))
                .body("mots[0].images[0].albumOrigine", nullValue())
                .body("mots[0].images[0].sens.id", equalTo(farine.toString()))
                .body("mots[0].images[0].dejaUtilisee", equalTo(false));

        UUID autreAlbum = referentiels.album("La Roule Galette", "Natha Caputo");
        // Liée par Zoé seule : pas « déjà utilisée » pour Paul.
        images.lien(image, UUID.fromString(ZOE), autreAlbum);
        detecter(preparation, "farine")
                .statusCode(200)
                .body("mots[0].images[0].dejaUtilisee", equalTo(false));
        images.lien(image, UUID.fromString(PAUL), autreAlbum);
        detecter(preparation, "farine")
                .statusCode(200)
                .body("mots[0].images[0].dejaUtilisee", equalTo(true));
    }

    @Test
    void sansCasseNiAccentsNiArticleMaisSansRecherchePartielle() {
        image(PAUL, sens(mot("côte"), "corps", "nom"), "privee", "ms");
        image(PAUL, sens(mot("côté"), "direction", "nom"), "privee", "ms");
        image(PAUL, sens(mot("farine"), "à compléter", null), "privee", "ms");

        detecter(preparation, "la cote")
                .statusCode(200)
                .body("forme", equalTo("cote"))
                .body("mots.forme", contains("côte", "côté"))
                .body("mots[0].sens.libelle", contains("corps"))
                .body("mots[1].sens.libelle", contains("direction"));
        detecter(preparation, "L’ARBRE").statusCode(200).body("forme", equalTo("ARBRE")).body("mots", empty());
        detecter(preparation, "far").statusCode(200).body("forme", equalTo("far")).body("mots", empty());
    }

    @Test
    void unMotQuiNExisteQueChezUnCollegueEstPresenteCommeNouveau() {
        MotVue loup = mot("loup");
        UUID animal = sens(loup, "animal", "nom");
        image(ZOE, animal, "privee", "ms");
        // Zoé l'a aussi dans l'une de ses Préparations : ce n'est pas une Préparation de Paul.
        images.sensRetenu(animal, UUID.fromString(ZOE), pouleRousse);

        detecter(preparation, "loup").statusCode(200).body("forme", equalTo("loup")).body("mots", empty());
    }

    @Test
    void uneImageVerseeDUnCollegueRendLeMotVisible() {
        image(ZOE, sens(mot("loup"), "animal", "nom"), "versee", "gs");

        detecter(preparation, "loup")
                .statusCode(200)
                .body("mots.forme", contains("loup"))
                .body("mots[0].images[0].proprietaireId", equalTo(ZOE))
                .body("mots[0].images[0].etat", equalTo("versee"));
    }

    @Test
    void unMotDeMesPreparationsSansImageExisteDejaSansImage() {
        UUID roule = referentiels.album("La Roule Galette", "Natha Caputo");
        UUID autre = preparation(PAUL, roule, "gs");
        ajouter(autre, "le four").statusCode(201);

        detecter(preparation, "four")
                .statusCode(200)
                .body("mots.forme", contains("four"))
                .body("mots[0].dejaDansLaPreparation", equalTo(false))
                .body("mots[0].images", empty())
                .body("mots[0].sens.libelle", contains("à compléter"))
                .body("mots[0].albums.titre", contains("La Roule Galette"));
    }

    @Test
    void unMotDejaDansCettePreparationLeDit() {
        ajouter(preparation, "four").statusCode(201);

        detecter(preparation, "Four")
                .statusCode(200)
                .body("mots.forme", contains("four"))
                .body("mots[0].dejaDansLaPreparation", equalTo(true))
                .body("mots[0].albums.titre", contains("La petite poule rousse"));
    }

    @Test
    void sectionPuisMesImagesPuisCellesDesCollegues() {
        UUID farine = sens(mot("farine"), "à compléter", null);
        UUID a = image(PAUL, farine, "privee", "gs");
        UUID c = image(PAUL, farine, "privee", "ms");
        // B est la plus récente : seule la propriété la place après C.
        UUID b = image(ZOE, farine, "versee", "ms");
        // Une Image privée de Zoé n'est jamais montrée.
        image(ZOE, farine, "privee", "ms");

        detecter(preparation, "farine")
                .statusCode(200)
                .body("mots[0].images.id", contains(c.toString(), b.toString(), a.toString()));
    }

    @Test
    void aSectionEgaleLImageLieeDansUnAutreAlbumPasseDevant() {
        UUID farine = sens(mot("farine"), "à compléter", null);
        UUID ancienne = image(PAUL, farine, "privee", "ms");
        UUID recente = image(PAUL, farine, "privee", "ms");

        detecter(preparation, "farine")
                .statusCode(200)
                .body("mots[0].images.id", contains(recente.toString(), ancienne.toString()));

        // Un lien dans l'Album de la Préparation ne compte pas ; un lien de Zoé dans un autre Album compte.
        images.lien(ancienne, UUID.fromString(PAUL), pouleRousse);
        detecter(preparation, "farine")
                .statusCode(200)
                .body("mots[0].images.id", contains(recente.toString(), ancienne.toString()));
        images.lien(ancienne, UUID.fromString(ZOE), referentiels.album("La Roule Galette", "Natha Caputo"));
        detecter(preparation, "farine")
                .statusCode(200)
                .body("mots[0].images.id", contains(ancienne.toString(), recente.toString()))
                .body("mots[0].images.dejaUtilisee", contains(true, false));
    }

    @Test
    void aSectionEgaleLImageDUnCollegueLieeAilleursPasseAvantLaMienne() {
        UUID farine = sens(mot("farine"), "à compléter", null);
        UUID deZoe = image(ZOE, farine, "versee", "ms");
        // La mienne est la plus récente, sans lien.
        UUID mienne = image(PAUL, farine, "privee", "ms");
        images.lien(deZoe, UUID.fromString(ZOE), referentiels.album("La Roule Galette", "Natha Caputo"));

        detecter(preparation, "farine")
                .statusCode(200)
                .body("mots[0].images.id", contains(deZoe.toString(), mienne.toString()))
                .body("mots[0].images.dejaUtilisee", contains(false, false));
    }

    @Test
    void lesSensSontParLibelleACompleterEnDernier() {
        MotVue loup = mot("loup");
        // Créés dans un autre ordre que celui attendu.
        UUID mechant = sens(loup, "méchant", "adjectif");
        UUID aCompleter = sens(loup, "à compléter", null);
        UUID animal = sens(loup, "animal", "nom");
        UUID gris = sens(loup, "gris", "adjectif");
        image(PAUL, mechant, "privee", "ms");
        image(PAUL, aCompleter, "privee", "ms");
        images.sensRetenu(gris, UUID.fromString(PAUL), pouleRousse);
        image(PAUL, animal, "privee", "ms");

        detecter(preparation, "loup")
                .statusCode(200)
                .body("mots[0].sens.libelle", contains("animal", "gris", "méchant", "à compléter"))
                .body("mots[0].sens.aCompleter", contains(false, false, false, true));
    }

    @Test
    void lesAlbumsSontParTitre() {
        UUID zebre = referentiels.album("Zèbre et compagnie", "Auteur Z");
        UUID arbre = referentiels.album("Arbre en automne", "Auteur A");
        UUID farine = sens(mot("farine"), "à compléter", null);
        images.image(UUID.fromString(PAUL), farine, "privee", "image_album", "usage_pedagogique_album", null, null,
                zebre);
        images.sensRetenu(farine, UUID.fromString(PAUL), arbre);

        detecter(preparation, "farine")
                .statusCode(200)
                .body("mots[0].albums.titre", contains("Arbre en automne", "Zèbre et compagnie"));
    }

    @Test
    void seulsLesAlbumsDOrigineEtCeuxDeMesPreparationsSontMontres() {
        UUID x = referentiels.album("Album X", "Auteur X");
        UUID y = referentiels.album("Album Y", "Auteur Y");
        UUID farine = sens(mot("farine"), "à compléter", null);
        UUID image = images.image(UUID.fromString(PAUL), farine, "privee", "image_album", "usage_pedagogique_album",
                null, null, x);
        // « farine » figure aussi dans une Préparation de Zoé, de l'Album Y.
        images.sensRetenu(farine, UUID.fromString(ZOE), y);

        detecter(preparation, "farine")
                .statusCode(200)
                .body("mots[0].albums.titre", contains("Album X"))
                .body("mots[0].images[0].id", equalTo(image.toString()))
                .body("mots[0].images[0].typeImage", equalTo("image_album"))
                .body("mots[0].images[0].albumOrigine.titre", equalTo("Album X"))
                .body("mots[0].images[0].sections", empty());
    }

    @Test
    void lesSensVisiblesSontCeuxDesImagesProposablesEtCeuxQueJAiRetenus() {
        MotVue loup = mot("loup");
        UUID animal = sens(loup, "animal", "nom");
        UUID mechant = sens(loup, "méchant", "adjectif");
        UUID gris = sens(loup, "gris", "adjectif");
        sens(loup, "à compléter", null);
        image(PAUL, animal, "privee", "ms");
        images.sensRetenu(mechant, UUID.fromString(PAUL), pouleRousse);
        // Retenu par Zoé seule, et illustré par une Image privée de Zoé : invisible pour Paul.
        images.sensRetenu(gris, UUID.fromString(ZOE), pouleRousse);
        image(ZOE, gris, "privee", "ms");

        detecter(preparation, "loup")
                .statusCode(200)
                .body("mots[0].sens.libelle", contains("animal", "méchant"))
                .body("mots[0].sens.categorie", contains("nom", "adjectif"))
                .body("mots[0].images", hasSize(1))
                .body("mots[0].images[0].sens.libelle", equalTo("animal"));
    }

    @Test
    void rienNEstEcritPendantLaDetection() {
        image(PAUL, sens(mot("farine"), "à compléter", null), "privee", "ms");
        List<Long> avant = nombres();

        detecter(preparation, "zébulon").statusCode(200).body("mots", empty());
        detecter(preparation, "farine").statusCode(200).body("mots", hasSize(1));

        assertEquals(avant, nombres());
    }

    @Test
    void uneSaisieTropCourteOuTropLongueEstRefusee() {
        invalide(detecter(preparation, "a"));
        invalide(detecter(preparation, "  l'a "));
        invalide(detecter(preparation, "   "));
        invalide(given().when().get("/api/preparations/" + preparation + "/detection").then());
        invalide(detecter(preparation, "b".repeat(101)));
        detecter(preparation, "b".repeat(100)).statusCode(200).body("mots", empty());
        // Un article seul est un Mot.
        detecter(preparation, "la").statusCode(200).body("forme", equalTo("la"));
    }

    @Test
    void laPreparationDUnCollegueEstIntrouvable() {
        image(ZOE, sens(mot("farine"), "à compléter", null), "versee", "ms");
        UUID deZoe = preparation(ZOE, pouleRousse, "ms");

        detecter(deZoe, "farine")
                .statusCode(404)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("ressource.introuvable"));
        detecter(UUID.randomUUID(), "farine").statusCode(404).body("code", equalTo("ressource.introuvable"));
    }

    @Test
    void moinsDUneSecondeSurCinqMilleImages() {
        UUID farine = sens(mot("farine"), "à compléter", null);
        UUID roule = referentiels.album("La Roule Galette", "Natha Caputo");
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("insert into mot (forme, forme_cle, forme_recherche)"
                    + " select 'mot' || g, 'mot' || g, 'mot' || g from generate_series(1, 990) g").executeUpdate();
            entityManager.createNativeQuery("insert into sens (mot_id, libelle, libelle_cle)"
                    + " select id, 'à compléter', 'à compléter' from mot where forme like 'mot%'").executeUpdate();
            // 4 950 Images versées par Zoé sur 990 autres Mots, et 50 Images de « farine », de Paul et de Zoé.
            entityManager.createNativeQuery("insert into image (proprietaire_id, sens_id, type_image, etat)"
                    + " select :zoe, s.id, 'inconnu', 'versee' from sens s join mot m on m.id = s.mot_id"
                    + " cross join generate_series(1, 5) g where m.forme like 'mot%'")
                    .setParameter("zoe", UUID.fromString(ZOE))
                    .executeUpdate();
            entityManager.createNativeQuery("insert into image (proprietaire_id, sens_id, type_image, etat)"
                    + " select case when g % 2 = 0 then :paul else :zoe end, :sens, 'image_libre',"
                    + " case when g % 2 = 0 then 'privee' else 'versee' end from generate_series(1, 50) g")
                    .setParameter("paul", UUID.fromString(PAUL))
                    .setParameter("zoe", UUID.fromString(ZOE))
                    .setParameter("sens", farine)
                    .executeUpdate();
            entityManager.createNativeQuery("insert into image_section (image_id, section)"
                    + " select id, case when random() < 0.5 then 'ms' else 'gs' end from image").executeUpdate();
            entityManager.createNativeQuery("insert into lien_image (preparation_id, preparation_mot_id, image_id,"
                    + " enseignant_id, album_id, section, origine) select uuidv7(), uuidv7(), id, proprietaire_id,"
                    + " :album, 'gs', 'reutilisee' from image where etat = 'versee'")
                    .setParameter("album", roule)
                    .executeUpdate();
            entityManager.createNativeQuery("analyze").executeUpdate();
        });
        assertEquals(5000L, nombre("image"));
        detecter(preparation, "mot1").statusCode(200);

        long debut = System.nanoTime();
        detecter(preparation, "farine").statusCode(200).body("mots[0].images", hasSize(50));
        long millisecondes = (System.nanoTime() - debut) / 1_000_000;

        assertTrue(millisecondes < 1000, "Détection en " + millisecondes + " ms sur 5 000 Images");
    }

    private ValidatableResponse detecter(UUID preparationId, String saisie) {
        return given().queryParam("saisie", saisie)
                .when().get("/api/preparations/" + preparationId + "/detection").then();
    }

    private static void invalide(ValidatableResponse reponse) {
        reponse.statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("requete.invalide"));
    }

    private ValidatableResponse ajouter(UUID preparationId, String saisie) {
        return given().contentType(ContentType.JSON).body(Map.of("saisie", saisie))
                .when().post("/api/preparations/" + preparationId + "/mots")
                .then();
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

    private UUID preparation(String proprietaire, UUID albumId, String section) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into preparation (proprietaire_id, album_id, section) values (:proprietaire, :album, :section)"
                        + " returning id")
                .setParameter("proprietaire", UUID.fromString(proprietaire))
                .setParameter("album", albumId)
                .setParameter("section", section)
                .getSingleResult());
    }

    /** Nombre de lignes de {@code mot}, {@code sens}, {@code sens_retenu} et {@code lien_image}. */
    private List<Long> nombres() {
        return List.of(nombre("mot"), nombre("sens"), nombre("sens_retenu"), nombre("lien_image"));
    }

    private long nombre(String table) {
        return QuarkusTransaction.requiringNew().call(() -> ((Number) entityManager
                .createNativeQuery("select count(*) from " + table).getSingleResult()).longValue());
    }
}

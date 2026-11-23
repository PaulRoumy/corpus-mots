package fr.corpusmots.vocabulaire.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import fr.corpusmots.commun.api.EnseignantsDeTest;
import fr.corpusmots.commun.api.ProblemeDto;
import fr.corpusmots.vocabulaire.persistance.ImageRepository;
import fr.corpusmots.vocabulaire.service.Lexique;
import fr.corpusmots.vocabulaire.service.MotVue;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.response.ValidatableResponse;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/**
 * Banque paginée (story 3.1, partie 1) : {@code GET /api/images?provenance=}. Une Image {@code privee} d'un collègue
 * n'apparaît dans aucune provenance, liée ou non ; {@code abandonnee} et {@code supprimee} non plus (AD-2).
 */
@QuarkusTest
@TestSecurity(user = BanqueImagesResourceTest.CLAIRE)
@OidcSecurity(claims = @Claim(key = "sub", value = BanqueImagesResourceTest.CLAIRE))
class BanqueImagesResourceTest {

    static final String CLAIRE = "0190f0a0-0000-7000-8000-000000000b01";
    static final String ZOE = "0190f0a0-0000-7000-8000-000000000b02";
    static final UUID ALBUM = UUID.fromString("0190f0a0-0000-7000-8000-000000000b99");

    @Inject
    EnseignantsDeTest enseignants;

    @Inject
    ImagesDeTest images;

    @Inject
    Lexique lexique;

    @Inject
    EntityManager entityManager;

    @Inject
    SessionFactory sessionFactory;

    @Inject
    ImageRepository repository;

    @BeforeEach
    void donnees() {
        enseignants.seulsActifs(CLAIRE, ZOE);
        images.effacer();
    }

    @Test
    void chaqueProvenanceMontreExactementSesImagesEtJamaisUnePriveeDunCollegue() {
        UUID sens = sens("loup", "animal", "nom");
        UUID claire = UUID.fromString(CLAIRE);
        UUID zoe = UUID.fromString(ZOE);
        UUID mienPrivee = images.image(claire, sens, "privee", new byte[] { 1 }, new byte[] { 2 });
        UUID mienVersee = images.image(claire, sens, "versee", new byte[] { 1 }, new byte[] { 2 });
        images.image(claire, sens, "abandonnee", new byte[] { 1 }, new byte[] { 2 });
        images.image(claire, sens, "supprimee", new byte[] { 1 }, new byte[] { 2 });
        UUID collegueVersee = images.image(zoe, sens, "versee", new byte[] { 1 }, new byte[] { 2 });
        UUID colleguePrivee = images.image(zoe, sens, "privee", new byte[] { 1 }, new byte[] { 2 });
        UUID colleguePriveeLiee = images.image(zoe, sens, "privee", new byte[] { 1 }, new byte[] { 2 });
        images.lien(colleguePriveeLiee, claire, ALBUM);
        UUID collegueAbandonneeLiee = images.image(zoe, sens, "abandonnee", new byte[] { 1 }, new byte[] { 2 });
        images.lien(collegueAbandonneeLiee, claire, ALBUM);

        assertEquals(Set.of(mienPrivee, mienVersee), identifiants(lister(null).statusCode(200).body("total", equalTo(2))));
        assertEquals(Set.of(mienPrivee, mienVersee),
                identifiants(lister("mes-mots").statusCode(200).body("total", equalTo(2))));
        assertEquals(Set.of(mienVersee, collegueVersee),
                identifiants(lister("banque").statusCode(200).body("total", equalTo(2))));
        assertEquals(Set.of(mienPrivee, mienVersee, collegueVersee),
                identifiants(lister("tout").statusCode(200).body("total", equalTo(3))));

        for (String provenance : new String[] { "mes-mots", "banque", "tout" }) {
            Set<UUID> vues = identifiants(lister(provenance));
            assertTrue(!vues.contains(colleguePrivee) && !vues.contains(colleguePriveeLiee)
                    && !vues.contains(collegueAbandonneeLiee), provenance);
        }
    }

    @Test
    void unElementPorteLImageSonMotSonSensEtSesSections() {
        UUID sens = sens("citrouille", "légume", "nom");
        UUID image = images.image(UUID.fromString(ZOE), sens, "versee", "photo_personnelle",
                "droits_auteur_enseignant", null, null, null);
        images.classer(image, null, List.of(), List.of("gs", "ps"));

        lister("banque").statusCode(200)
                .body("total", equalTo(1))
                .body("elements", hasSize(1))
                .body("elements[0].id", equalTo(image.toString()))
                .body("elements[0].proprietaireId", equalTo(ZOE))
                .body("elements[0].etat", equalTo("versee"))
                .body("elements[0].versee", equalTo(true))
                .body("elements[0].reutilisable", equalTo(true))
                .body("elements[0].typeImage", equalTo("photo_personnelle"))
                .body("elements[0].sections", equalTo(List.of("ps", "gs")))
                .body("elements[0].forme", equalTo("citrouille"))
                .body("elements[0].sensId", equalTo(sens.toString()))
                .body("elements[0].sensLibelle", equalTo("légume"))
                .body("elements[0].categorie", equalTo("nom"));
        lister("mes-mots").statusCode(200).body("total", equalTo(0)).body("elements", hasSize(0));
    }

    @Test
    void lesImagesSuiventLaFormeSansCasseNiAccentPuisLeSensPuisLaPlusRecente() {
        UUID claire = UUID.fromString(CLAIRE);
        UUID zebre = sens("zèbre", "animal", "nom");
        UUID etaleChute = sens("étalé", "chute", "adjectif");
        UUID etaleCuisine = sens("étalé", "cuisine", "adjectif");
        UUID citrouille = sens("Citrouille", "légume", "nom");
        UUID ancienne = images.image(claire, zebre, "privee", new byte[] { 1 }, new byte[] { 2 });
        UUID recente = images.image(claire, zebre, "privee", new byte[] { 1 }, new byte[] { 2 });
        dater(ancienne, "2026-11-01T10:00:00Z");
        dater(recente, "2026-11-02T10:00:00Z");
        UUID cuisine = images.image(claire, etaleCuisine, "privee", new byte[] { 1 }, new byte[] { 2 });
        UUID chute = images.image(claire, etaleChute, "versee", new byte[] { 1 }, new byte[] { 2 });
        UUID legume = images.image(claire, citrouille, "privee", new byte[] { 1 }, new byte[] { 2 });

        List<String> ordre = lister("mes-mots").statusCode(200).extract().path("elements.id");

        assertEquals(List.of(legume, chute, cuisine, recente, ancienne).stream().map(UUID::toString).toList(), ordre);
    }

    @Test
    void lesPagesSeSuiventSansDoublonNiTrou() {
        UUID claire = UUID.fromString(CLAIRE);
        UUID sens = sens("renard", "animal", "nom");
        for (int rang = 0; rang < 5; rang++) {
            images.image(claire, sens, "privee", new byte[] { 1 }, new byte[] { 2 });
        }

        List<String> tout = given().queryParam("taille", 5).when().get("/api/images").then().statusCode(200)
                .extract().path("elements.id");
        List<String> page0 = given().queryParam("taille", 2).queryParam("page", 0).when().get("/api/images").then()
                .statusCode(200).body("total", equalTo(5)).extract().path("elements.id");
        List<String> page1 = given().queryParam("taille", 2).queryParam("page", 1).when().get("/api/images").then()
                .statusCode(200).extract().path("elements.id");
        List<String> page2 = given().queryParam("taille", 2).queryParam("page", 2).when().get("/api/images").then()
                .statusCode(200).extract().path("elements.id");
        given().queryParam("taille", 2).queryParam("page", 3).when().get("/api/images").then()
                .statusCode(200).body("total", equalTo(5)).body("elements", hasSize(0));

        List<String> suite = new java.util.ArrayList<>(page0);
        suite.addAll(page1);
        suite.addAll(page2);
        assertEquals(tout, suite);
    }

    @ParameterizedTest
    @ValueSource(strings = { "provenance=autre", "provenance=", "taille=101", "taille=0", "taille=1.5", "page=-1",
            "page=abc" })
    void unParametreInvalideEstRefuse(String parametre) {
        String[] cle = parametre.split("=", 2);
        given().queryParam(cle[0], cle[1]).when().get("/api/images").then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("requete.invalide"));
    }

    @ParameterizedTest
    @ValueSource(strings = { "decalage", "taille" })
    void unParametreDeCritereNommeCommeLaPaginationEstRefuse(String nom) {
        Map<String, Object> parametres = Map.of(nom, 1);

        assertThrows(IllegalArgumentException.class, () -> repository.pageBanque("true", parametres, 0, 1));
        assertThrows(IllegalArgumentException.class, () -> repository.nombreBanque("true", parametres));
    }

    @Test
    void laTailleVautCentParDefaut() {
        insererEnMasse(UUID.fromString(CLAIRE), 130);

        lister("mes-mots").statusCode(200).body("total", equalTo(130)).body("elements", hasSize(100));
    }

    /** NFR-4 : avec 500 Images en base, la première page répond en moins de 2 s, en une requête paginée en base. */
    @Test
    void laPremierePageDeCinqCentsImagesRepondEnMoinsDeDeuxSecondes() {
        insererEnMasse(UUID.fromString(ZOE), 500);
        lister("banque").statusCode(200); // échauffement : connexions et plans de requête

        long debut = System.nanoTime();
        lister("banque").statusCode(200).body("total", equalTo(500)).body("elements", hasSize(100));
        long millis = (System.nanoTime() - debut) / 1_000_000;

        assertTrue(millis < 2000, "première page en " + millis + " ms");
    }

    /** Aucune requête par Image : une page de 100 Images coûte autant de requêtes SQL qu'une page d'une seule. */
    @Test
    void unePageDeCentImagesNeCoutePasPlusDeRequetesQuUnePageDUne() {
        insererEnMasse(UUID.fromString(ZOE), 150);
        lister("banque").statusCode(200); // échauffement

        Statistics statistiques = sessionFactory.getStatistics();
        statistiques.clear();
        given().queryParam("provenance", "banque").queryParam("taille", 1).when().get("/api/images").then()
                .statusCode(200).body("elements", hasSize(1));
        long pourUne = statistiques.getPrepareStatementCount();
        statistiques.clear();
        given().queryParam("provenance", "banque").queryParam("taille", 100).when().get("/api/images").then()
                .statusCode(200).body("elements", hasSize(100));
        long pourCent = statistiques.getPrepareStatementCount();

        assertEquals(pourUne, pourCent);
    }

    private ValidatableResponse lister(String provenance) {
        var requete = given();
        if (provenance != null) {
            requete.queryParam("provenance", provenance);
        }
        return requete.when().get("/api/images").then();
    }

    private static Set<UUID> identifiants(ValidatableResponse reponse) {
        List<String> ids = reponse.extract().path("elements.id");
        return Set.copyOf(ids.stream().map(UUID::fromString).toList());
    }

    private UUID sens(String forme, String libelle, String categorie) {
        MotVue mot = QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerMot(forme));
        return QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerSens(mot.id(), libelle, categorie))
                .id();
    }

    private void dater(UUID imageId, String creeLe) {
        QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(
                "update image set cree_le = cast(:creeLe as timestamptz) where id = :id")
                .setParameter("creeLe", creeLe)
                .setParameter("id", imageId)
                .executeUpdate());
    }

    /**
     * Insère {@code nombre} Images versées de ce propriétaire, une par Mot nouveau, avec Section et fichier, en trois
     * requêtes.
     */
    private void insererEnMasse(UUID proprietaire, int nombre) {
        String prefixe = "masse" + UUID.randomUUID().toString().substring(0, 8);
        Map<String, Object> parametres = new HashMap<>();
        parametres.put("prefixe", prefixe);
        parametres.put("nombre", nombre);
        parametres.put("proprietaire", proprietaire);
        QuarkusTransaction.requiringNew().run(() -> {
            executer("insert into mot (forme, forme_cle, forme_recherche) select :prefixe || n, :prefixe || n,"
                    + " :prefixe || n from generate_series(1, :nombre) n", parametres);
            executer("insert into sens (mot_id, libelle, libelle_cle, categorie) select id, 'sens', 'sens', 'nom'"
                    + " from mot where forme like :prefixe || '%'", Map.of("prefixe", prefixe));
            executer("insert into image (proprietaire_id, sens_id, type_image, licence, source, etat)"
                    + " select :proprietaire, s.id, 'image_libre', 'cc0_domaine_public', 'test', 'versee'"
                    + " from sens s join mot m on m.id = s.mot_id where m.forme like :prefixe || '%'",
                    Map.of("prefixe", prefixe, "proprietaire", proprietaire));
            executer("insert into image_section (image_id, section) select i.id, 'ms' from image i"
                    + " join sens s on s.id = i.sens_id join mot m on m.id = s.mot_id where m.forme like :prefixe || '%'",
                    Map.of("prefixe", prefixe));
            executer("insert into image_fichier (image_id, octets, miniature, type_mime, largeur, hauteur)"
                    + " select i.id, decode('01', 'hex'), decode('02', 'hex'), 'image/png', 10, 10 from image i"
                    + " join sens s on s.id = i.sens_id join mot m on m.id = s.mot_id where m.forme like :prefixe || '%'",
                    Map.of("prefixe", prefixe));
        });
    }

    private void executer(String sql, Map<String, Object> parametres) {
        var requete = entityManager.createNativeQuery(sql);
        parametres.forEach(requete::setParameter);
        requete.executeUpdate();
    }
}

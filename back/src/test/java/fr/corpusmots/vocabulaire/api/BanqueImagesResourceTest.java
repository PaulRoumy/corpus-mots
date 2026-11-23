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
    static final String LEA = "0190f0a0-0000-7000-8000-000000000b03";
    /** Collègue dont l'identifiant se classe avant celui de Claire. */
    static final String AVANT = "0190f0a0-0000-7000-8000-000000000a01";
    static final UUID ALBUM = UUID.fromString("0190f0a0-0000-7000-8000-000000000b99");
    static final UUID ALBUM_ORIGINE = UUID.fromString("0190f0a0-0000-7000-8000-000000000b98");
    static final UUID MODULE = UUID.fromString("0190f0a0-0000-7000-8000-000000000b97");
    static final UUID THEME = UUID.fromString("0190f0a0-0000-7000-8000-000000000b96");

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
        UUID sens = sens("tamanoir", "animal", "nom");
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
        // provenance= vide vaut la valeur par défaut, comme une provenance absente.
        assertEquals(Set.of(mienPrivee, mienVersee), identifiants(lister("").statusCode(200).body("total", equalTo(2))));
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
        UUID sens = sens("potimarron", "légume", "nom");
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
                .body("elements[0].forme", equalTo("potimarron"))
                .body("elements[0].sensId", equalTo(sens.toString()))
                .body("elements[0].sensLibelle", equalTo("légume"))
                .body("elements[0].categorie", equalTo("nom"));
        lister("mes-mots").statusCode(200).body("total", equalTo(0)).body("elements", hasSize(0));
    }

    @Test
    void lesImagesSuiventLaFormeSansCasseNiAccentPuisLeSensPuisLaPlusRecente() {
        UUID claire = UUID.fromString(CLAIRE);
        // « Zostère » commence par une capitale (avant toute minuscule en octets) et « écaillé » par un accent (après z
        // en octets) : l'ordre attendu, bergamote < écaillé < Zostère, ne tient que sans casse ni accent.
        UUID zostere = sens("Zostère", "plante", "nom");
        UUID ecailleChute = sens("écaillé", "chute", "adjectif");
        UUID ecailleCuisine = sens("écaillé", "cuisine", "adjectif");
        UUID bergamote = sens("bergamote", "fruit", "nom");
        UUID ancienne = images.image(claire, zostere, "privee", new byte[] { 1 }, new byte[] { 2 });
        UUID recente = images.image(claire, zostere, "privee", new byte[] { 1 }, new byte[] { 2 });
        dater(ancienne, "2026-11-01T10:00:00Z");
        dater(recente, "2026-11-02T10:00:00Z");
        UUID cuisine = images.image(claire, ecailleCuisine, "privee", new byte[] { 1 }, new byte[] { 2 });
        UUID chute = images.image(claire, ecailleChute, "versee", new byte[] { 1 }, new byte[] { 2 });
        UUID fruit = images.image(claire, bergamote, "privee", new byte[] { 1 }, new byte[] { 2 });

        List<String> ordre = lister("mes-mots").statusCode(200).extract().path("elements.id");

        assertEquals(List.of(fruit, chute, cuisine, recente, ancienne).stream().map(UUID::toString).toList(), ordre);
    }

    @Test
    void lesPagesSeSuiventSansDoublonNiTrou() {
        UUID claire = UUID.fromString(CLAIRE);
        UUID sens = sens("pangolin", "animal", "nom");
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
    @ValueSource(strings = { "provenance=autre", "taille=101", "taille=0", "taille=1.5", "page=-1",
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

    // Story 3.2, partie 1 : filtres. Formes propres à cette classe (narval, okapi, giroflée, sarcelle, tatou, harfang,
    // axolotl, ouistiti) : un Sens créé ailleurs avec une autre catégorie fausserait les filtres.

    /** Combinaison : {@code mot=narval&section=gs&categorie=verbe}, en ET entre eux et avec la provenance. */
    @Test
    void lesFiltresSeCombinentEnEtAvecLaProvenance() {
        UUID claire = UUID.fromString(CLAIRE);
        UUID zoe = UUID.fromString(ZOE);
        UUID nager = sens("narval", "nager", "verbe");
        UUID animal = sens("narval", "animal marin", "nom");
        UUID courir = sens("okapi", "courir", "verbe");
        UUID retenue = imageClassee(claire, nager, "privee", "gs");
        imageClassee(claire, nager, "privee", "ms");
        imageClassee(claire, animal, "privee", "gs");
        imageClassee(claire, courir, "privee", "gs");
        UUID collegueVersee = imageClassee(zoe, nager, "versee", "gs");
        imageClassee(zoe, nager, "privee", "gs");
        Map<String, String> filtres = Map.of("mot", "narval", "section", "gs", "categorie", "verbe");

        assertEquals(Set.of(retenue), identifiants(filtrer("mes-mots", filtres).statusCode(200)
                .body("total", equalTo(1))));
        assertEquals(Set.of(collegueVersee), identifiants(filtrer("banque", filtres).statusCode(200)
                .body("total", equalTo(1))));
        assertEquals(Set.of(retenue, collegueVersee), identifiants(filtrer("tout", filtres).statusCode(200)
                .body("total", equalTo(2))));
    }

    /** Tolérance de la détection : casse, accents et article initial ; le Mot exact, sans recherche par préfixe. */
    @ParameterizedTest
    @ValueSource(strings = { "la Giroflee", "  GIROFLÉE ", "giroflée", "une giroflée" })
    void leFiltreMotToleLaCasseLesAccentsEtLArticle(String saisie) {
        UUID claire = UUID.fromString(CLAIRE);
        UUID fleur = images.image(claire, sens("giroflée", "fleur", "nom"), "privee", new byte[] { 1 },
                new byte[] { 2 });
        images.image(claire, sens("sarcelle", "oiseau", "nom"), "privee", new byte[] { 1 }, new byte[] { 2 });

        assertEquals(Set.of(fleur), identifiants(filtrer("mes-mots", Map.of("mot", saisie)).statusCode(200)
                .body("total", equalTo(1))));
        filtrer("mes-mots", Map.of("mot", "girofl")).statusCode(200).body("total", equalTo(0));
    }

    /** Une saisie vide ou réduite à un article ne filtre pas sur le Mot. */
    @ParameterizedTest
    @ValueSource(strings = { "la", "l'", "Les", "   " })
    void unArticleSeulNeFiltrePas(String saisie) {
        UUID claire = UUID.fromString(CLAIRE);
        UUID fleur = images.image(claire, sens("giroflée", "fleur", "nom"), "privee", new byte[] { 1 },
                new byte[] { 2 });
        UUID oiseau = images.image(claire, sens("sarcelle", "oiseau", "nom"), "privee", new byte[] { 1 },
                new byte[] { 2 });

        assertEquals(Set.of(fleur, oiseau), identifiants(filtrer("mes-mots", Map.of("mot", saisie)).statusCode(200)
                .body("total", equalTo(2))));
    }

    /** Un Mot dont la seule Image est privée d'un collègue ne donne aucune Image, dans aucune provenance (AD-2). */
    @ParameterizedTest
    @ValueSource(strings = { "mes-mots", "banque", "tout" })
    void unMotPresentSeulementChezUnCollegueNeDonneRien(String provenance) {
        images.image(UUID.fromString(ZOE), sens("tatou", "animal", "nom"), "privee", new byte[] { 1 },
                new byte[] { 2 });

        filtrer(provenance, Map.of("mot", "tatou")).statusCode(200)
                .body("total", equalTo(0))
                .body("elements", hasSize(0));
    }

    /** Sous Mes mots, la Section d'une de mes Préparations qui lie l'Image suffit. */
    @Test
    void sousMesMotsLaSectionDUneDeMesPreparationsRetientLImage() {
        UUID claire = UUID.fromString(CLAIRE);
        UUID sens = sens("harfang", "chouette", "nom");
        UUID lieeEnGs = imageClassee(claire, sens, "privee", "ms");
        images.lien(lieeEnGs, claire, ALBUM, "gs");
        UUID lieeEnMs = imageClassee(claire, sens, "privee", "ms");
        images.lien(lieeEnMs, claire, ALBUM, "ms");
        UUID cocheeGs = imageClassee(claire, sens, "privee", "gs");

        assertEquals(Set.of(lieeEnGs, cocheeGs), identifiants(filtrer("mes-mots", Map.of("section", "gs"))
                .statusCode(200).body("total", equalTo(2))));
    }

    /** Sous Banque de l'école et Tout, seule la Section cochée compte : l'usage ne retient pas l'Image. */
    @ParameterizedTest
    @ValueSource(strings = { "banque", "tout" })
    void horsMesMotsLUsageNeRetientPasLImage(String provenance) {
        UUID claire = UUID.fromString(CLAIRE);
        UUID sens = sens("harfang", "chouette", "nom");
        UUID lieeEnGs = imageClassee(claire, sens, "versee", "ms");
        images.lien(lieeEnGs, claire, ALBUM, "gs");
        UUID cocheeGs = imageClassee(claire, sens, "versee", "gs");

        assertEquals(Set.of(cocheeGs), identifiants(filtrer(provenance, Map.of("section", "gs")).statusCode(200)
                .body("total", equalTo(1))));
        // Sans filtre, l'Image liée est bien montrée par cette provenance.
        assertTrue(identifiants(lister(provenance).statusCode(200)).contains(lieeEnGs));
    }

    /** Sous Mes mots, le lien d'un collègue vers mon Image, dans une Préparation de GS, ne la retient pas. */
    @Test
    void lUsageDUnCollegueNeRetientPasMonImage() {
        UUID claire = UUID.fromString(CLAIRE);
        UUID sens = sens("harfang", "chouette", "nom");
        UUID lieeParZoe = imageClassee(claire, sens, "versee", "ms");
        images.lien(lieeParZoe, UUID.fromString(ZOE), ALBUM, "gs");

        filtrer("mes-mots", Map.of("section", "gs")).statusCode(200).body("total", equalTo(0));
        assertEquals(Set.of(lieeParZoe), identifiants(filtrer("mes-mots", Map.of("section", "ms")).statusCode(200)));
    }

    /** Le filtre propriétaire ne montre que ce que la provenance montre : les seules Images versées d'un collègue. */
    @Test
    void leFiltreProprietaireNeMontreQueSesImagesVisibles() {
        UUID claire = UUID.fromString(CLAIRE);
        UUID zoe = UUID.fromString(ZOE);
        UUID sens = sens("ouistiti", "singe", "nom");
        UUID zoeVersee = images.image(zoe, sens, "versee", new byte[] { 1 }, new byte[] { 2 });
        images.image(zoe, sens, "privee", new byte[] { 1 }, new byte[] { 2 });
        UUID miennePrivee = images.image(claire, sens, "privee", new byte[] { 1 }, new byte[] { 2 });
        UUID mienneVersee = images.image(claire, sens, "versee", new byte[] { 1 }, new byte[] { 2 });

        assertEquals(Set.of(zoeVersee), identifiants(filtrer("tout", Map.of("proprietaireId", ZOE)).statusCode(200)
                .body("total", equalTo(1))));
        assertEquals(Set.of(miennePrivee, mienneVersee),
                identifiants(filtrer("tout", Map.of("proprietaireId", CLAIRE)).statusCode(200)));
        filtrer("mes-mots", Map.of("proprietaireId", ZOE)).statusCode(200).body("total", equalTo(0));
    }

    /** Chaque autre filtre (Sens, Album d'origine, Module, Thème, type, catégorie) ne retient que ses Images. */
    @Test
    void chaqueFiltreNeRetientQueSesImages() {
        UUID claire = UUID.fromString(CLAIRE);
        UUID amphibien = sens("axolotl", "amphibien", "nom");
        UUID jouet = sens("axolotl", "jouet", "autre");
        UUID dAlbum = images.image(claire, amphibien, "privee", "image_album", "usage_pedagogique_album", null, null,
                ALBUM_ORIGINE);
        // Une image libre qui porterait un album_id n'a pas d'Album d'origine.
        UUID libreAvecAlbum = images.image(claire, amphibien, "privee", "image_libre", "cc0_domaine_public", "test",
                null, ALBUM_ORIGINE);
        UUID classee = images.image(claire, jouet, "privee", new byte[] { 1 }, new byte[] { 2 });
        images.classer(classee, MODULE, List.of(THEME), List.of());
        UUID photo = images.image(claire, jouet, "privee", "photo_personnelle", "droits_auteur_enseignant", null, null,
                null);

        assertEquals(Set.of(dAlbum), filtrees(Map.of("albumId", ALBUM_ORIGINE.toString())));
        assertEquals(Set.of(classee), filtrees(Map.of("moduleId", MODULE.toString())));
        assertEquals(Set.of(classee), filtrees(Map.of("themeId", THEME.toString())));
        assertEquals(Set.of(photo), filtrees(Map.of("typeImage", "photo_personnelle")));
        assertEquals(Set.of(classee, photo), filtrees(Map.of("sensId", jouet.toString())));
        assertEquals(Set.of(classee, photo), filtrees(Map.of("categorie", "autre")));
        assertEquals(Set.of(dAlbum, libreAvecAlbum), filtrees(Map.of("categorie", "nom")));
        assertEquals(Set.of(classee), filtrees(Map.of("themeId", THEME.toString(), "typeImage", "image_libre")));
        // Un paramètre vide ne filtre pas.
        assertEquals(Set.of(dAlbum, libreAvecAlbum, classee, photo), filtrees(Map.of("themeId", "", "section", "")));
    }

    /** Liste des propriétaires : moi, toujours, puis les collègues qui ont versé ; jamais celui qui n'a rien versé. */
    @Test
    void lesProprietairesSontMoiEtLesColleguesQuiOntVerse() {
        enseignants.seulsActifs(CLAIRE, ZOE, LEA, AVANT);
        UUID sens = sens("ouistiti", "singe", "nom");
        UUID lea = UUID.fromString(LEA);
        images.image(lea, sens, "privee", new byte[] { 1 }, new byte[] { 2 });
        images.image(lea, sens, "abandonnee", new byte[] { 1 }, new byte[] { 2 });
        images.image(UUID.fromString(CLAIRE), sens, "privee", new byte[] { 1 }, new byte[] { 2 });

        assertEquals(List.of(CLAIRE), proprietaires());

        images.image(UUID.fromString(ZOE), sens, "versee", new byte[] { 1 }, new byte[] { 2 });
        images.image(UUID.fromString(ZOE), sens, "versee", new byte[] { 1 }, new byte[] { 2 });
        assertEquals(List.of(CLAIRE, ZOE), proprietaires());

        // Moi qui verse à mon tour : toujours une seule fois, en tête.
        images.image(UUID.fromString(CLAIRE), sens, "versee", new byte[] { 1 }, new byte[] { 2 });
        assertEquals(List.of(CLAIRE, ZOE), proprietaires());

        // Un collègue dont l'identifiant précède le mien : moi d'abord, puis les autres par identifiant.
        images.image(UUID.fromString(AVANT), sens, "versee", new byte[] { 1 }, new byte[] { 2 });
        assertEquals(List.of(CLAIRE, AVANT, ZOE), proprietaires());
    }

    @ParameterizedTest
    @ValueSource(strings = { "mot", "sensId", "section", "albumId", "moduleId", "themeId", "categorie", "typeImage",
            "proprietaireId" })
    void unFiltreRepeteEstRefuse(String nom) {
        String valeur = switch (nom) {
            case "mot" -> "narval";
            case "section" -> "gs";
            case "categorie" -> "nom";
            case "typeImage" -> "image_libre";
            default -> THEME.toString();
        };
        given().queryParam(nom, valeur, valeur).when().get("/api/images").then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("requete.invalide"));
        given().queryParam(nom, valeur).when().get("/api/images").then().statusCode(200);
    }

    @Test
    void unMotTropLongEstRefuse() {
        String limite = "a".repeat(Lexique.LONGUEUR_MAX_FORME);

        given().queryParam("mot", "  " + limite + "  ").when().get("/api/images").then().statusCode(200);
        given().queryParam("mot", limite + "a").when().get("/api/images").then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("requete.invalide"));
    }

    @ParameterizedTest
    @ValueSource(strings = { "section=cp", "albumId=abc", "typeImage=dessin", "categorie=pronom", "sensId=1-2-3-4-5",
            "moduleId=abc", "themeId=0190f0a0-0000-7000-8000", "proprietaireId=moi" })
    void unFiltreInvalideEstRefuse(String parametre) {
        String[] cle = parametre.split("=", 2);
        given().queryParam(cle[0], cle[1]).when().get("/api/images").then()
                .statusCode(400)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo("requete.invalide"));
    }

    @ParameterizedTest
    @ValueSource(strings = { "themeId", "albumId", "moduleId", "sensId", "proprietaireId" })
    void unIdentifiantInconnuDonneUneListeVide(String nom) {
        UUID claire = UUID.fromString(CLAIRE);
        images.image(claire, sens("ouistiti", "singe", "nom"), "versee", new byte[] { 1 }, new byte[] { 2 });

        filtrer("tout", Map.of(nom, "0190f0a0-0000-7000-8000-00000000beef")).statusCode(200)
                .body("total", equalTo(0))
                .body("elements", hasSize(0));
    }

    /** NFR-4, filtres compris : 500 Images en base, la première page filtrée répond en moins de 2 s. */
    @Test
    void laPremierePageFiltreeDeCinqCentsImagesRepondEnMoinsDeDeuxSecondes() {
        // 250 Images versées de Zoé et 250 de Claire : 500 en base, Mes mots de Claire non vide.
        String prefixe = insererEnMasse(UUID.fromString(ZOE), 250);
        insererEnMasse(UUID.fromString(CLAIRE), 250);
        Map<String, String> filtres = Map.of("section", "ms", "typeImage", "image_libre", "categorie", "nom",
                "proprietaireId", ZOE);
        filtrer("banque", filtres).statusCode(200); // échauffement : connexions et plans de requête
        filtrer("mes-mots", Map.of("section", "gs")).statusCode(200);
        proprietaires();

        chronometrer("banque filtrée", () -> filtrer("banque", filtres).statusCode(200)
                .body("total", equalTo(250)).body("elements", hasSize(100)));
        chronometrer("mot", () -> filtrer("tout", Map.of("mot", prefixe + "7", "section", "ms")).statusCode(200)
                .body("total", equalTo(1)));
        // Mes mots + Section : la branche « lien de l'enseignant » est évaluée pour chacune des 250 Images.
        chronometrer("Mes mots, section par usage", () -> filtrer("mes-mots", Map.of("section", "gs"))
                .statusCode(200).body("total", equalTo(0)));
        chronometrer("Mes mots, section cochée", () -> filtrer("mes-mots", Map.of("section", "ms"))
                .statusCode(200).body("total", equalTo(250)).body("elements", hasSize(100)));
        chronometrer("propriétaires", () -> assertEquals(List.of(CLAIRE, ZOE), proprietaires()));
    }

    private static void chronometrer(String nom, Runnable requete) {
        long debut = System.nanoTime();
        requete.run();
        long millis = (System.nanoTime() - debut) / 1_000_000;
        assertTrue(millis < 2000, nom + " en " + millis + " ms");
    }

    private ValidatableResponse filtrer(String provenance, Map<String, String> filtres) {
        var requete = given().queryParam("provenance", provenance);
        filtres.forEach(requete::queryParam);
        return requete.when().get("/api/images").then();
    }

    private Set<UUID> filtrees(Map<String, String> filtres) {
        return identifiants(filtrer("mes-mots", filtres).statusCode(200));
    }

    private static List<String> proprietaires() {
        return given().when().get("/api/images/proprietaires").then().statusCode(200)
                .extract().jsonPath().getList("$", String.class);
    }

    /** Image libre de ce propriétaire, à cet état, cochée dans cette seule Section. */
    private UUID imageClassee(UUID proprietaire, UUID sens, String etat, String section) {
        UUID image = images.image(proprietaire, sens, etat, new byte[] { 1 }, new byte[] { 2 });
        images.classer(image, null, List.of(), List.of(section));
        return image;
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
     * Insère {@code nombre} Images versées de ce propriétaire, une par Mot nouveau ({@code <préfixe><n>}, n de 1 à
     * {@code nombre}), image libre de Sens « sens » (nom), Section {@code ms}, avec fichier, en cinq requêtes.
     *
     * @return le préfixe des Mots du lot
     */
    private String insererEnMasse(UUID proprietaire, int nombre) {
        String prefixe = "masse" + UUID.randomUUID().toString().substring(0, 8);
        // Chaque requête ne reçoit que ses propres paramètres ; tous sont typés par cast, rien n'est laissé à l'inférence.
        String desMotsDuLot = " join sens s on s.id = i.sens_id join mot m on m.id = s.mot_id"
                + " where m.forme like cast(:prefixe as text) || '%'";
        QuarkusTransaction.requiringNew().run(() -> {
            executer("insert into mot (forme, forme_cle, forme_recherche)"
                    + " select cast(:prefixe as text) || n, cast(:prefixe as text) || n, cast(:prefixe as text) || n"
                    + " from generate_series(1, cast(:nombre as integer)) n",
                    Map.of("prefixe", prefixe, "nombre", nombre));
            executer("insert into sens (mot_id, libelle, libelle_cle, categorie) select id, 'sens', 'sens', 'nom'"
                    + " from mot where forme like cast(:prefixe as text) || '%'", Map.of("prefixe", prefixe));
            executer("insert into image (proprietaire_id, sens_id, type_image, licence, source, etat)"
                    + " select cast(:proprietaire as uuid), s.id, 'image_libre', 'cc0_domaine_public', 'test', 'versee'"
                    + " from sens s join mot m on m.id = s.mot_id where m.forme like cast(:prefixe as text) || '%'",
                    Map.of("prefixe", prefixe, "proprietaire", proprietaire.toString()));
            executer("insert into image_section (image_id, section) select i.id, 'ms' from image i" + desMotsDuLot,
                    Map.of("prefixe", prefixe));
            executer("insert into image_fichier (image_id, octets, miniature, type_mime, largeur, hauteur)"
                    + " select i.id, decode('01', 'hex'), decode('02', 'hex'), 'image/png', 10, 10 from image i"
                    + desMotsDuLot, Map.of("prefixe", prefixe));
        });
        return prefixe;
    }

    private void executer(String sql, Map<String, Object> parametres) {
        var requete = entityManager.createNativeQuery(sql);
        parametres.forEach(requete::setParameter);
        requete.executeUpdate();
    }
}

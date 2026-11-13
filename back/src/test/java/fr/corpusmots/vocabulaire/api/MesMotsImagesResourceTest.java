package fr.corpusmots.vocabulaire.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import fr.corpusmots.commun.api.EnseignantsDeTest;
import fr.corpusmots.commun.api.ProblemeDto;
import fr.corpusmots.referentiels.api.ReferentielsDeTest;
import fr.corpusmots.vocabulaire.service.FichiersDeTest;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.builder.MultiPartSpecBuilder;
import io.restassured.response.ValidatableResponse;
import io.restassured.specification.RequestSpecification;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * « + › Ajouter une image » (story 2.5, partie 2) : une Image ajoutée dans Mes mots, sans Préparation. Une ligne de
 * test par ligne de la matrice de la spec ; aucun lien d'Image, Sens retenu ni Mot de Préparation n'est jamais écrit.
 */
@QuarkusTest
@TestSecurity(user = MesMotsImagesResourceTest.CLAIRE)
@OidcSecurity(claims = @Claim(key = "sub", value = MesMotsImagesResourceTest.CLAIRE))
class MesMotsImagesResourceTest {

    static final String CLAIRE = "0190f0a0-0000-7000-8000-000000000621";
    static final String ZOE = "0190f0a0-0000-7000-8000-000000000622";

    @Inject
    EnseignantsDeTest enseignants;

    @Inject
    ReferentielsDeTest referentiels;

    @Inject
    ImagesDeTest imagesDeTest;

    @Inject
    EntityManager entityManager;

    UUID rouleGalette;

    @BeforeEach
    void donnees() {
        enseignants.seulsActifs(CLAIRE, ZOE);
        imagesDeTest.effacer();
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("delete from sens_retenu").executeUpdate();
            entityManager.createNativeQuery("delete from preparation").executeUpdate();
            entityManager.createNativeQuery("delete from sens").executeUpdate();
            entityManager.createNativeQuery("delete from mot").executeUpdate();
        });
        referentiels.effacer();
        rouleGalette = referentiels.album("La Roule Galette", "Natha Caputo");
    }

    @Test
    void unMotNouveauEstCreeEtLImageVaDansMesMotsSurLeSensACompleter() {
        String imageId = ajouter(FichiersDeTest.png(2400, 1200), "citrouille.png",
                champs("Les Citrouilles", "image_libre", "https://openclipart.org", "cc0_domaine_public", "Anne", null))
                .statusCode(201)
                .body("id", notNullValue())
                .body("proprietaireId", equalTo(CLAIRE))
                .body("etat", equalTo("privee"))
                .body("aRemplacer", nullValue())
                .body("reutilisable", equalTo(true))
                .body("typeImage", equalTo("image_libre"))
                .body("aCompleter", equalTo(false))
                .body("forme", equalTo("Citrouilles"))
                .body("motId", notNullValue())
                .body("sens.libelle", equalTo("à compléter"))
                .body("sens.categorie", nullValue())
                .extract().path("id");

        UUID image = UUID.fromString(imageId);
        assertEquals(List.of("Citrouilles"), formesDesMots());
        assertEquals("Citrouilles|à compléter", motEtSensDeLImage(image));
        assertEquals("privee|image_libre|cc0_domaine_public|https://openclipart.org|Anne|null|" + CLAIRE + "|image|0",
                ligneImage(image));
        assertEquals("1600x800|image/jpeg", fichierEnBase(image));
        aucunUsage();
    }

    @Test
    void unMotExistantEstReutiliseSansDoublon() {
        ajouter(FichiersDeTest.png(10, 10), "a.png", champs("citrouille", "inconnu", null, null, null, null))
                .statusCode(201).body("forme", equalTo("citrouille"));
        ajouter(FichiersDeTest.png(10, 10), "b.png", champs("La Citrouille", "inconnu", null, null, null, null))
                .statusCode(201).body("forme", equalTo("citrouille"));
        ajouter(FichiersDeTest.png(10, 10), "c.png", champs("l’Écureuil", "inconnu", null, null, null, null))
                .statusCode(201).body("forme", equalTo("Écureuil"));

        assertEquals(List.of("citrouille", "Écureuil"), formesDesMots());
        assertEquals(2L, nombre("select count(*) from sens"));
        assertEquals(3L, nombre("select count(*) from image"));
        aucunUsage();
    }

    @Test
    void unDoubleArticleNEnPerdQuUnCommeEnPreparation() {
        String motId = ajouter(FichiersDeTest.png(10, 10), "a.png",
                champs("le l'ours", "inconnu", null, null, null, null))
                .statusCode(201).body("forme", equalTo("l'ours")).extract().path("motId");
        // Même saisie, même Mot : « l'ours » est la forme que donne aussi la Préparation (MotsPreparationResourceTest).
        ajouter(FichiersDeTest.png(10, 10), "b.png", champs("Le l'ours", "inconnu", null, null, null, null))
                .statusCode(201).body("motId", equalTo(motId)).body("forme", equalTo("l'ours"));

        assertEquals(List.of("l'ours"), formesDesMots());
    }

    @Test
    void unMotDejaRetenuPrendLeSensRetenuLePlusRecemment() {
        UUID citrouille = mot("citrouille");
        UUID legume = sens(citrouille, "légume", "nom");
        UUID personnage = sens(citrouille, "personnage", "nom");
        retenir(personnage, CLAIRE, "2026-11-01T10:00:00Z");
        retenir(legume, CLAIRE, "2026-11-02T10:00:00Z");

        String imageId = ajouter(FichiersDeTest.png(10, 10), "a.png",
                champs("citrouille", "inconnu", null, null, null, null))
                .statusCode(201)
                .body("motId", equalTo(citrouille.toString()))
                .body("sens.id", equalTo(legume.toString()))
                .body("sens.libelle", equalTo("légume"))
                .body("sens.categorie", equalTo("nom"))
                .extract().path("id");

        assertEquals("citrouille|légume", motEtSensDeLImage(UUID.fromString(imageId)));
        assertEquals(2L, nombre("select count(*) from sens_retenu"));
        assertEquals(0L, nombre("select count(*) from lien_image"));
    }

    @Test
    void leSensRetenuParUnCollegueNEstJamaisPris() {
        UUID citrouille = mot("citrouille");
        retenir(sens(citrouille, "personnage", "nom"), ZOE, "2026-11-01T10:00:00Z");

        String imageId = ajouter(FichiersDeTest.png(10, 10), "a.png",
                champs("citrouille", "inconnu", null, null, null, null))
                .statusCode(201)
                .body("sens.libelle", equalTo("à compléter"))
                .extract().path("id");

        assertEquals("citrouille|à compléter", motEtSensDeLImage(UUID.fromString(imageId)));
        assertEquals(1L, nombre("select count(*) from sens_retenu"));
    }

    @Test
    void uneImageDAlbumEstReduiteA400AvecSonAlbumDOrigine() {
        String imageId = ajouter(FichiersDeTest.jpeg(3000, 2000), "page.jpg",
                champs("galette", "image_album", null, "cc0_domaine_public", null, rouleGalette.toString()))
                .statusCode(201)
                .body("typeImage", equalTo("image_album"))
                .extract().path("id");

        UUID image = UUID.fromString(imageId);
        assertTrue(ligneImage(image).startsWith("privee|image_album|usage_pedagogique_album|null|null|" + rouleGalette
                + "|"));
        assertEquals("400x267|image/jpeg", fichierEnBase(image));
        aucunUsage();
    }

    @Test
    void lAlbumEnvoyePourUnAutreTypeEstIgnore() {
        String imageId = ajouter(FichiersDeTest.png(10, 10), "a.png",
                champs("galette", "image_libre", null, null, null, rouleGalette.toString()))
                .statusCode(201).extract().path("id");

        assertTrue(ligneImage(UUID.fromString(imageId)).contains("|null|" + CLAIRE + "|"));
    }

    @Test
    void uneImageDAlbumSansAlbumEstRefusee() {
        refus(ajouter(FichiersDeTest.png(10, 10), "a.png", champs("galette", "image_album", null, null, null, null)),
                400, "image.album_requis");
        refus(ajouter(FichiersDeTest.png(10, 10), "a.png", champs("galette", "image_album", null, null, null, "  ")),
                400, "image.album_requis");
        rienNEstEnregistre();
    }

    @Test
    void unAlbumInconnuEstRefuse() {
        refus(ajouter(FichiersDeTest.png(10, 10), "a.png",
                champs("galette", "image_album", null, null, null, UUID.randomUUID().toString())),
                400, "image.album_introuvable");
        refus(ajouter(FichiersDeTest.png(10, 10), "a.png",
                champs("galette", "image_album", null, null, null, "pas-un-uuid")), 400, "requete.invalide");
        rienNEstEnregistre();
    }

    @Test
    void unMotInvalideEstRefuse() {
        for (String saisie : new String[] { "", "   ", " \t  ", "a".repeat(101), "la " + "b".repeat(101) }) {
            refus(ajouter(FichiersDeTest.png(10, 10), "a.png", champs(saisie, "inconnu", null, null, null, null)),
                    400, "image.mot_invalide");
        }
        refus(ajouter(FichiersDeTest.png(10, 10), "a.png", champs(null, "inconnu", null, null, null, null)), 400,
                "image.mot_invalide");
        rienNEstEnregistre();

        // L'article retiré, la forme compte 100 caractères : acceptée.
        ajouter(FichiersDeTest.png(10, 10), "a.png", champs("le " + "c".repeat(100), "inconnu", null, null, null,
                null)).statusCode(201);
    }

    @Test
    void unFichierTropLourdOuQuiNEstPasUneImageEstRefuse() {
        byte[] lourd = new byte[21 * 1024 * 1024];
        System.arraycopy(FichiersDeTest.png(10, 10), 0, lourd, 0, 50);
        refus(ajouter(lourd, "lourd.png", champs("citrouille", "image_libre", null, null, null, null)), 413,
                "requete.trop_volumineuse");
        for (byte[] octets : List.of("%PDF-1.7\n%âãÏÓ".getBytes(StandardCharsets.UTF_8),
                "bonjour".getBytes(StandardCharsets.UTF_8))) {
            refus(ajouter(octets, "faux.png", champs("citrouille", "image_libre", null, null, null, null)), 415,
                    "format.non_supporte");
        }
        rienNEstEnregistre();
    }

    @Test
    void unTypeUneLicenceOuUnFichierInvalidesSontRefuses() {
        byte[] png = FichiersDeTest.png(10, 10);
        refus(ajouter(png, "a.png", champs("citrouille", null, null, null, null, null)), 400, "requete.invalide");
        refus(ajouter(png, "a.png", champs("citrouille", "dessin", null, null, null, null)), 400, "requete.invalide");
        refus(ajouter(png, "a.png", champs("citrouille", "image_libre", null, "gratuite", null, null)), 400,
                "requete.invalide");
        refus(given().multiPart("typeImage", "image_libre").multiPart("mot", "citrouille")
                .when().post("/api/images").then(), 400, "requete.invalide");
        rienNEstEnregistre();
    }

    @Test
    void unRefusApresLaCreationDuMotNeLaissePasDeMotNiDeSens() {
        // Le Mot et son Sens « à compléter » sont écrits avant que televerser() ne refuse : tout est annulé.
        refus(ajouter(FichiersDeTest.png(10, 10), "a.png",
                champs("potiron", "image_libre", "s".repeat(501), null, null, null)), 400, "requete.invalide");
        refus(ajouter(FichiersDeTest.png(10, 10), "a.png",
                champs("potiron", "image_libre", null, "droits_auteur_enseignant", null, null)), 400,
                "requete.invalide");
        rienNEstEnregistre();
    }

    @Test
    void leProprietaireLitLeFichierDeLImageEnregistree() {
        String imageId = ajouter(FichiersDeTest.png(400, 200), "a.png",
                champs("citrouille", "image_libre", null, null, null, null))
                .statusCode(201).extract().path("id");

        byte[] miniature = given().when().get("/api/images/" + imageId + "/fichier?taille=miniature")
                .then().statusCode(200).extract().asByteArray();
        assertEquals(256, FichiersDeTest.lire(miniature).getWidth());
    }

    @Test
    @TestSecurity(user = ZOE)
    @OidcSecurity(claims = @Claim(key = "sub", value = ZOE))
    void unCollegueNeLitPasLeFichierDUneImageDeMesMots() {
        UUID sens = sens(mot("citrouille"), "à compléter", null);
        UUID deClaire = imagesDeTest.image(UUID.fromString(CLAIRE), sens, "privee", new byte[] { 1 },
                new byte[] { 2 });

        given().when().get("/api/images/" + deClaire + "/fichier?taille=miniature")
                .then()
                .statusCode(404)
                .body("code", equalTo("ressource.introuvable"));
    }

    // --- Outils ---

    private static Map<String, String> champs(String mot, String type, String source, String licence, String auteur,
            String albumId) {
        Map<String, String> champs = new HashMap<>();
        champs.put("mot", mot);
        champs.put("typeImage", type);
        champs.put("source", source);
        champs.put("licence", licence);
        champs.put("auteur", auteur);
        champs.put("albumId", albumId);
        return champs;
    }

    private static ValidatableResponse ajouter(byte[] octets, String nom, Map<String, String> champs) {
        RequestSpecification requete = given().multiPart("fichier", nom, octets, "application/octet-stream");
        champs.forEach((champ, valeur) -> {
            if (valeur != null) {
                // Texte en UTF-8, comme le FormData du navigateur.
                requete.multiPart(new MultiPartSpecBuilder(valeur).controlName(champ)
                        .charset(StandardCharsets.UTF_8).build());
            }
        });
        return requete.when().post("/api/images").then();
    }

    private static void refus(ValidatableResponse reponse, int statut, String code) {
        reponse.statusCode(statut)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo(code));
    }

    private void rienNEstEnregistre() {
        assertEquals(0L, nombre("select count(*) from image"));
        assertEquals(0L, nombre("select count(*) from image_fichier"));
        assertEquals(0L, nombre("select count(*) from mot"));
        assertEquals(0L, nombre("select count(*) from sens"));
        aucunUsage();
    }

    private void aucunUsage() {
        assertEquals(0L, nombre("select count(*) from lien_image"));
        assertEquals(0L, nombre("select count(*) from sens_retenu"));
        assertEquals(0L, nombre("select count(*) from preparation_mot"));
    }

    private UUID mot(String forme) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into mot (forme, forme_cle, forme_recherche) values (:forme, :forme, :forme) returning id")
                .setParameter("forme", forme)
                .getSingleResult());
    }

    private UUID sens(UUID motId, String libelle, String categorie) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into sens (mot_id, libelle, libelle_cle, categorie) values (:mot, :libelle, :libelle,"
                        + " cast(:categorie as text)) returning id")
                .setParameter("mot", motId)
                .setParameter("libelle", libelle)
                .setParameter("categorie", categorie)
                .getSingleResult());
    }

    /** Sens retenu par cet enseignant pour un Mot d'une de ses Préparations (identifiants quelconques). */
    private void retenir(UUID sensId, String enseignant, String creeLe) {
        QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(
                "insert into sens_retenu (preparation_id, preparation_mot_id, sens_id, enseignant_id, album_id,"
                        + " section, cree_le) values (uuidv7(), uuidv7(), :sens, :enseignant, :album, 'ms',"
                        + " cast(:creeLe as timestamptz))")
                .setParameter("sens", sensId)
                .setParameter("enseignant", UUID.fromString(enseignant))
                .setParameter("album", rouleGalette)
                .setParameter("creeLe", creeLe)
                .executeUpdate());
    }

    @SuppressWarnings("unchecked")
    private List<String> formesDesMots() {
        return QuarkusTransaction.requiringNew().call(() -> (List<String>) entityManager
                .createNativeQuery("select forme from mot order by forme").getResultList());
    }

    /** « forme|libellé » du Mot et du Sens qu'illustre l'Image. */
    private String motEtSensDeLImage(UUID imageId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Object[] ligne = (Object[]) entityManager.createNativeQuery(
                    "select m.forme, s.libelle from image i join sens s on s.id = i.sens_id"
                            + " join mot m on m.id = s.mot_id where i.id = :id")
                    .setParameter("id", imageId)
                    .getSingleResult();
            return ligne[0] + "|" + ligne[1];
        });
    }

    /** Image en base : « etat|type|licence|source|auteur|album|propriétaire|type_media|version ». */
    private String ligneImage(UUID imageId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Object[] ligne = (Object[]) entityManager.createNativeQuery(
                    "select etat, type_image, licence, source, auteur, album_id, proprietaire_id, type_media, version"
                            + " from image where id = :id")
                    .setParameter("id", imageId)
                    .getSingleResult();
            StringBuilder texte = new StringBuilder();
            for (Object valeur : ligne) {
                texte.append(texte.isEmpty() ? "" : "|").append(valeur);
            }
            return texte.toString();
        });
    }

    /** Fichier en base : « largeurxhauteur|type_mime ». */
    private String fichierEnBase(UUID imageId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Object[] ligne = (Object[]) entityManager.createNativeQuery(
                    "select largeur, hauteur, type_mime from image_fichier where image_id = :id")
                    .setParameter("id", imageId)
                    .getSingleResult();
            return ligne[0] + "x" + ligne[1] + "|" + ligne[2];
        });
    }

    private long nombre(String requete) {
        return QuarkusTransaction.requiringNew().call(() -> ((Number) entityManager.createNativeQuery(requete)
                .getSingleResult()).longValue());
    }
}

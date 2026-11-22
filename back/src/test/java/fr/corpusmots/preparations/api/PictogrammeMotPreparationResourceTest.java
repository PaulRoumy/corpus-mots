package fr.corpusmots.preparations.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import fr.corpusmots.commun.api.EnseignantsDeTest;
import fr.corpusmots.commun.api.ProblemeDto;
import fr.corpusmots.referentiels.api.ReferentielsDeTest;
import fr.corpusmots.vocabulaire.api.ImagesDeTest;
import fr.corpusmots.vocabulaire.service.ArasaacIndisponible;
import fr.corpusmots.vocabulaire.service.FichiersDeTest;
import fr.corpusmots.vocabulaire.service.PictogrammeArasaac;
import fr.corpusmots.vocabulaire.service.SourceArasaac;
import fr.corpusmots.vocabulaire.service.SourceArasaacHttp;
import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusMock;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import io.quarkus.test.security.oidc.Claim;
import io.quarkus.test.security.oidc.OidcSecurity;
import io.restassured.http.ContentType;
import io.restassured.response.ValidatableResponse;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Choisir un pictogramme ARASAAC depuis la Carte « à illustrer » (story 2.4, partie 2) : une ligne de test par ligne
 * back de la matrice de la spec, avec une fausse {@link SourceArasaac} (aucun appel à Internet).
 */
@QuarkusTest
@TestSecurity(user = PictogrammeMotPreparationResourceTest.CLAIRE)
@OidcSecurity(claims = @Claim(key = "sub", value = PictogrammeMotPreparationResourceTest.CLAIRE))
class PictogrammeMotPreparationResourceTest {

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

    FausseSource source;
    UUID rouleGalette;
    UUID preparation;
    UUID renard;

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
        source = new FausseSource();
        source.fichiers.put(2349L, FichiersDeTest.pngTransparent(300, 300));
        QuarkusMock.installMockForType(source, SourceArasaac.class);
        rouleGalette = referentiels.album("La Roule Galette", "Natha Caputo");
        preparation = preparation(CLAIRE);
        renard = UUID.fromString(ajouter(preparation, "renard"));
    }

    @Test
    void choisirUnPictogrammeIllustreLeMot() {
        String imageId = choisir(preparation, renard, 2349L)
                .statusCode(201)
                .body("id", equalTo(renard.toString()))
                .body("illustre", equalTo(true))
                .body("image.id", notNullValue())
                .body("image.proprietaireId", equalTo(CLAIRE))
                .body("image.etat", equalTo("privee"))
                .body("image.aRemplacer", nullValue())
                .body("image.reutilisable", equalTo(true))
                .body("image.typeImage", equalTo("image_libre"))
                .body("image.aCompleter", equalTo(false))
                .extract().path("image.id");

        UUID image = UUID.fromString(imageId);
        assertEquals(List.of(2349L), source.pictogrammesDemandes);
        assertEquals("privee|image_libre|arasaac_cc_by_nc_sa|ARASAAC (https://arasaac.org), pictogramme n° 2349"
                + "|Sergio Palao, propriété du Gouvernement d'Aragon|null|" + CLAIRE + "|image|0", ligneImage(image));
        assertEquals(sensRetenu(renard), sensDeLImage(image));
        assertEquals("300x300|image/png", fichierEnBase(image));
        assertEquals(preparation + "|" + image + "|" + CLAIRE + "|" + rouleGalette + "|ms|nouvelle",
                lienEnBase(renard));
        BufferedImage miniature = FichiersDeTest.lire(fichier(image, "miniature"));
        assertTrue(Math.max(miniature.getWidth(), miniature.getHeight()) <= 256);

        // La Carte d'identité montre la licence ARASAAC, la source et l'auteur.
        given().when().get("/api/images/" + image)
                .then()
                .statusCode(200)
                .body("licence", equalTo("arasaac_cc_by_nc_sa"))
                .body("source", equalTo("ARASAAC (https://arasaac.org), pictogramme n° 2349"))
                .body("auteur", equalTo("Sergio Palao, propriété du Gouvernement d'Aragon"));
        given().when().get("/api/preparations/" + preparation)
                .then()
                .statusCode(200)
                .body("nombreIllustres", equalTo(1));
    }

    @Test
    void arasaacIndisponibleNEcritRien() {
        source.indisponible = true;

        refus(choisir(preparation, renard, 2349L), 503, "arasaac.indisponible");
        rienNEstEnregistre();
    }

    @Test
    void unPictogrammeInexistantNEcritRien() {
        refus(choisir(preparation, renard, 999_999L), 404, "arasaac.pictogramme_introuvable");
        assertEquals(List.of(999_999L), source.pictogrammesDemandes);
        rienNEstEnregistre();
    }

    @Test
    void unFichierIllisibleDArasaacNEcritRien() {
        source.fichiers.put(7L, new byte[] { (byte) 0x89, 'P', 'N', 'G', 1, 2, 3 });

        refus(choisir(preparation, renard, 7L), 503, "arasaac.indisponible");
        rienNEstEnregistre();
    }

    @Test
    void unMotDejaIllustreEstRefuse() {
        choisir(preparation, renard, 2349L).statusCode(201);

        refus(choisir(preparation, renard, 2349L), 409, "preparation.mot_deja_illustre");
        // Refusé avant le téléchargement : ARASAAC n'est appelé que pour le premier choix.
        assertEquals(List.of(2349L), source.pictogrammesDemandes);
        assertEquals(1L, nombre("select count(*) from image"));
        assertEquals(1L, nombre("select count(*) from image_fichier"));
        assertEquals(1L, nombre("select count(*) from lien_image"));
    }

    @Test
    void laPreparationOuLeMotDUnCollegueSontIntrouvablesSansAppelerArasaac() {
        UUID deZoe = preparation(ZOE);
        UUID motDeZoe = motDePreparation(deZoe, motDe(renard), 1);
        UUID autre = preparation(CLAIRE);

        for (UUID[] cible : new UUID[][] { { deZoe, motDeZoe }, { UUID.randomUUID(), renard }, { autre, renard },
                { preparation, UUID.randomUUID() } }) {
            refus(choisir(cible[0], cible[1], 2349L), 404, "ressource.introuvable");
        }
        assertEquals(List.of(), source.pictogrammesDemandes);
        rienNEstEnregistre();
    }

    @Test
    void unIdentifiantAbsentNulOuNegatifEstRefuse() {
        for (Long id : new Long[] { null, 0L, -3L }) {
            refus(choisir(preparation, renard, id), 400, "requete.invalide");
        }
        refus(given().contentType(ContentType.JSON).body("{}").when().post(chemin(preparation, renard)).then(), 400,
                "requete.invalide");
        assertEquals(List.of(), source.pictogrammesDemandes);
        rienNEstEnregistre();
    }

    // --- Outils ---

    private static String chemin(UUID preparationId, UUID motPreparationId) {
        return "/api/preparations/" + preparationId + "/mots/" + motPreparationId + "/pictogramme";
    }

    private static ValidatableResponse choisir(UUID preparationId, UUID motPreparationId, Long idArasaac) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("idArasaac", idArasaac);
        return given().contentType(ContentType.JSON).body(corps)
                .when().post(chemin(preparationId, motPreparationId)).then();
    }

    private static void refus(ValidatableResponse reponse, int statut, String code) {
        reponse.statusCode(statut)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo(code));
    }

    private void rienNEstEnregistre() {
        assertEquals(0L, nombre("select count(*) from image"));
        assertEquals(0L, nombre("select count(*) from image_fichier"));
        assertEquals(0L, nombre("select count(*) from lien_image"));
    }

    private static byte[] fichier(UUID imageId, String taille) {
        return given().when().get("/api/images/" + imageId + "/fichier?taille=" + taille)
                .then().statusCode(200).extract().asByteArray();
    }

    private static String ajouter(UUID preparationId, String saisie) {
        return given().contentType(ContentType.JSON).body(Map.of("saisie", saisie))
                .when().post("/api/preparations/" + preparationId + "/mots")
                .then().statusCode(201).extract().path("id");
    }

    private UUID preparation(String proprietaire) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into preparation (proprietaire_id, album_id, section) values (:proprietaire, :album, 'ms')"
                        + " returning id")
                .setParameter("proprietaire", UUID.fromString(proprietaire))
                .setParameter("album", rouleGalette)
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

    private UUID sensDeLImage(UUID imageId) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager
                .createNativeQuery("select sens_id from image where id = :id")
                .setParameter("id", imageId)
                .getSingleResult());
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

    /** Lien du Mot de Préparation en base : « préparation|image|enseignant|album|section|origine ». */
    private String lienEnBase(UUID preparationMotId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            List<?> lignes = entityManager.createNativeQuery(
                    "select preparation_id, image_id, enseignant_id, album_id, section, origine from lien_image"
                            + " where preparation_mot_id = :id")
                    .setParameter("id", preparationMotId)
                    .getResultList();
            if (lignes.isEmpty()) {
                return null;
            }
            Object[] ligne = (Object[]) lignes.get(0);
            return ligne[0] + "|" + ligne[1] + "|" + ligne[2] + "|" + ligne[3] + "|" + ligne[4] + "|" + ligne[5];
        });
    }

    private long nombre(String requete) {
        return QuarkusTransaction.requiringNew()
                .call(() -> ((Number) entityManager.createNativeQuery(requete).getSingleResult()).longValue());
    }

    /** Fausse source ARASAAC : {@code QuarkusMock} exige une instance de la classe du bean, sans appel réseau. */
    static class FausseSource extends SourceArasaacHttp {

        final Map<Long, byte[]> fichiers = new HashMap<>();
        final List<Long> pictogrammesDemandes = new ArrayList<>();
        boolean indisponible;

        @Override
        public List<PictogrammeArasaac> rechercher(String texte) {
            return List.of();
        }

        @Override
        public Optional<byte[]> pictogramme(long id) {
            pictogrammesDemandes.add(id);
            if (indisponible) {
                throw new ArasaacIndisponible("hors service");
            }
            return Optional.ofNullable(fichiers.get(id));
        }
    }
}

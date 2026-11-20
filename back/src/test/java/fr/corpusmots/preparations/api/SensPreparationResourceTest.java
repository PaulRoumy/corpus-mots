package fr.corpusmots.preparations.api;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

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
 * Sens modifiable dans le Panneau de choix d'Image (story 2.8, partie 1) :
 * {@code PUT /preparations/{id}/mots/{motPreparationId}/sens} et le paramètre {@code sensId} des propositions ;
 * Création de Sens (partie 2) : {@code POST /preparations/{id}/mots/{motPreparationId}/sens} ; Sens à l'ajout depuis
 * le Panneau de détection (partie 3) : {@code sensId} ou {@code nouveauSens} de {@code POST /preparations/{id}/mots}.
 * Une ligne de test par ligne back de la matrice de la spec ; tout refus ne change rien.
 */
@QuarkusTest
@TestSecurity(user = SensPreparationResourceTest.PAUL)
@OidcSecurity(claims = @Claim(key = "sub", value = SensPreparationResourceTest.PAUL))
class SensPreparationResourceTest {

    static final String PAUL = "0190f0a0-0000-7000-8000-000000000893";
    static final String ZOE = "0190f0a0-0000-7000-8000-000000000894";

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
    void changerDeSensDelieLImageDeLAncienSensSansLaToucher() {
        MotVue etale = mot("étalé");
        UUID cuisine = sens(etale, "cuisine", "adjectif");
        UUID chute = sens(etale, "chute", "adjectif");
        UUID x = image(PAUL, cuisine, "privee");
        image(PAUL, chute, "privee");
        UUID motPreparation = UUID.fromString(reutiliser(etale.id(), x));
        String ligneX = ligneImage(x);

        changer(preparation, motPreparation, chute)
                .statusCode(200)
                .body("id", equalTo(motPreparation.toString()))
                .body("forme", equalTo("étalé"))
                .body("sens.id", equalTo(chute.toString()))
                .body("sens.libelle", equalTo("chute"))
                .body("sens.categorie", equalTo("adjectif"))
                .body("illustre", equalTo(false))
                .body("image", nullValue());

        assertEquals(chute, sensRetenu(motPreparation));
        assertNull(lienEnBase(motPreparation));
        assertEquals(0L, nombre("select count(*) from lien_image"));
        assertEquals(1L, nombre("select count(*) from sens_retenu"));
        assertEquals(ligneX, ligneImage(x));
        given().when().get("/api/preparations/" + preparation)
                .then().statusCode(200).body("nombreIllustres", equalTo(0));
    }

    @Test
    void changerLeSensDUnMotAIllustrerNeLieRien() {
        UUID motPreparation = UUID.fromString(ajouter("avocat"));
        UUID aCompleter = sensRetenu(motPreparation);
        UUID fruit = sens(motDe(motPreparation), "fruit", "nom");
        image(PAUL, fruit, "privee");

        changer(preparation, motPreparation, fruit)
                .statusCode(200)
                .body("sens.id", equalTo(fruit.toString()))
                .body("sens.libelle", equalTo("fruit"))
                .body("illustre", equalTo(false));

        assertEquals(fruit, sensRetenu(motPreparation));
        assertEquals(0L, nombre("select count(*) from lien_image"));
        assertEquals(1L, nombre("select count(*) from sens_retenu"));
        // Aucun Sens n'est créé ni supprimé (AD-19).
        assertEquals(1L, nombre("select count(*) from sens where id = '" + aCompleter + "'"));
    }

    @Test
    void unSensRetenuDansUneAutrePreparationEstVisible() {
        UUID motPreparation = UUID.fromString(ajouter("avocat"));
        UUID metier = sens(motDe(motPreparation), "métier", "nom");
        images.sensRetenu(metier, UUID.fromString(PAUL), pouleRousse);

        changer(preparation, motPreparation, metier)
                .statusCode(200)
                .body("sens.id", equalTo(metier.toString()));
        assertEquals(metier, sensRetenu(motPreparation));
    }

    @Test
    void choisirLeSensRetenuNEcritRien() {
        MotVue farine = mot("farine");
        UUID sensFarine = sens(farine, "farine", "nom");
        UUID x = image(PAUL, sensFarine, "privee");
        UUID motPreparation = UUID.fromString(reutiliser(farine.id(), x));
        String avant = etat(motPreparation);

        changer(preparation, motPreparation, sensFarine)
                .statusCode(200)
                .body("sens.id", equalTo(sensFarine.toString()))
                .body("image.id", equalTo(x.toString()));

        assertEquals(avant, etat(motPreparation));
    }

    @Test
    void unSensNonVisibleOuInconnuEstRefuse() {
        MotVue avocat = mot("avocat");
        UUID fruit = sens(avocat, "fruit", "nom");
        UUID deZoe = sens(avocat, "plaideur", "nom");
        UUID x = image(PAUL, fruit, "privee");
        // Seule une Image privée de Zoé illustre ce Sens, que Paul n'a jamais retenu.
        image(ZOE, deZoe, "privee");
        UUID motPreparation = UUID.fromString(reutiliser(avocat.id(), x));
        String avant = etat(motPreparation);

        for (UUID sens : new UUID[] { deZoe, UUID.randomUUID() }) {
            refus(changer(preparation, motPreparation, sens), 400, "preparation.sens_invalide");
        }
        assertEquals(avant, etat(motPreparation));
    }

    @Test
    void unSensRetenuSeulementParUnCollegueEstRefuse() {
        MotVue avocat = mot("avocat");
        UUID fruit = sens(avocat, "fruit", "nom");
        UUID plaideur = sens(avocat, "plaideur", "nom");
        UUID x = image(PAUL, fruit, "privee");
        // Zoé a retenu ce Sens dans sa Préparation ; seule une Image privée de Zoé l'illustre (AD-2).
        images.sensRetenu(plaideur, UUID.fromString(ZOE), pouleRousse);
        image(ZOE, plaideur, "privee");
        UUID motPreparation = UUID.fromString(reutiliser(avocat.id(), x));
        String avant = etat(motPreparation);

        refus(changer(preparation, motPreparation, plaideur), 400, "preparation.sens_invalide");
        assertEquals(avant, etat(motPreparation));
    }

    @Test
    void leSensDUnAutreMotEstRefuse() {
        MotVue cote = mot("côte");
        UUID x = image(PAUL, sens(cote, "corps", "nom"), "privee");
        UUID direction = sens(mot("côté"), "direction", "nom");
        image(PAUL, direction, "privee");
        UUID motPreparation = UUID.fromString(reutiliser(cote.id(), x));
        String avant = etat(motPreparation);

        refus(changer(preparation, motPreparation, direction), 400, "preparation.sens_invalide");
        assertEquals(avant, etat(motPreparation));
    }

    @Test
    void laPreparationOuLeMotDUnCollegueSontIntrouvables() {
        MotVue avocat = mot("avocat");
        UUID fruit = sens(avocat, "fruit", "nom");
        UUID metier = sens(avocat, "métier", "nom");
        UUID x = image(PAUL, fruit, "privee");
        image(PAUL, metier, "privee");
        UUID motPreparation = UUID.fromString(reutiliser(avocat.id(), x));
        UUID deZoe = preparation(ZOE);
        UUID motDeZoe = motDePreparation(deZoe, avocat.id());
        String avant = etat(motPreparation);

        for (UUID[] cible : new UUID[][] { { deZoe, motDeZoe }, { UUID.randomUUID(), motPreparation },
                { deZoe, motPreparation }, { preparation, motDeZoe }, { preparation, UUID.randomUUID() } }) {
            refus(changer(cible[0], cible[1], metier), 404, "ressource.introuvable");
        }
        assertEquals(avant, etat(motPreparation));
        assertEquals(0L, nombre("select count(*) from sens_retenu where preparation_mot_id = '" + motDeZoe + "'"));
    }

    @Test
    void unCorpsOuUnChampManquantEstRefuse() {
        MotVue farine = mot("farine");
        UUID x = image(PAUL, sens(farine, "farine", "nom"), "privee");
        UUID motPreparation = UUID.fromString(reutiliser(farine.id(), x));
        String avant = etat(motPreparation);

        refus(given().contentType(ContentType.JSON)
                .when().put("/api/preparations/" + preparation + "/mots/" + motPreparation + "/sens").then(),
                400, "requete.invalide");
        refus(changer(preparation, motPreparation, null), 400, "requete.invalide");
        assertEquals(avant, etat(motPreparation));
    }

    @Test
    void lesPropositionsSeLimitentAuSensDemande() {
        MotVue avocat = mot("avocat");
        UUID fruit = sens(avocat, "fruit", "nom");
        UUID metier = sens(avocat, "métier", "nom");
        UUID a = image(PAUL, fruit, "privee");
        UUID b = image(PAUL, metier, "privee");
        UUID motPreparation = UUID.fromString(reutiliser(avocat.id(), a));
        List<Long> avant = nombres();

        given().queryParam("sensId", fruit.toString())
                .when().get("/api/preparations/" + preparation + "/mots/" + motPreparation + "/propositions")
                .then().statusCode(200)
                .body("images.id", contains(a.toString()))
                .body("sens", hasSize(2))
                .body("sens.libelle", contains("fruit", "métier"));
        given().queryParam("sensId", metier.toString())
                .when().get("/api/preparations/" + preparation + "/mots/" + motPreparation + "/propositions")
                .then().statusCode(200)
                .body("images.id", contains(b.toString()))
                .body("sens", hasSize(2));
        given().when().get("/api/preparations/" + preparation + "/mots/" + motPreparation + "/propositions")
                .then().statusCode(200)
                .body("images", hasSize(2));
        assertEquals(avant, nombres());
    }

    // --- Création de Sens (story 2.8, partie 2) ---

    @Test
    void creerUnSensLeRetientEtDelieLImageDUnAutreSens() {
        MotVue etale = mot("étalé");
        UUID cuisine = sens(etale, "cuisine", "adjectif");
        UUID x = image(PAUL, cuisine, "privee");
        UUID motPreparation = UUID.fromString(reutiliser(etale.id(), x));
        String ligneX = ligneImage(x);
        long sensAvant = nombre("select count(*) from sens");

        String chute = creer(preparation, motPreparation, "chute", "nom")
                .statusCode(200)
                .body("id", equalTo(motPreparation.toString()))
                .body("forme", equalTo("étalé"))
                .body("sens.libelle", equalTo("chute"))
                .body("sens.categorie", equalTo("nom"))
                .body("illustre", equalTo(false))
                .body("image", nullValue())
                .extract().path("sens.id");

        assertEquals(sensAvant + 1, nombre("select count(*) from sens"));
        assertEquals(UUID.fromString(chute), sensRetenu(motPreparation));
        assertEquals("chute|nom|" + etale.id(), ligneSens(UUID.fromString(chute)));
        assertNull(lienEnBase(motPreparation));
        assertEquals(1L, nombre("select count(*) from sens_retenu"));
        assertEquals(ligneX, ligneImage(x));
    }

    @Test
    void unLibelleDejaConnuReutiliseCeSensEtSaCategorie() {
        MotVue etale = mot("étalé");
        UUID cuisine = sens(etale, "cuisine", "adjectif");
        UUID chute = sens(etale, "chute", "nom");
        UUID x = image(PAUL, cuisine, "privee");
        UUID motPreparation = UUID.fromString(reutiliser(etale.id(), x));
        long sensAvant = nombre("select count(*) from sens");

        creer(preparation, motPreparation, "  Chute ", "verbe")
                .statusCode(200)
                .body("sens.id", equalTo(chute.toString()))
                .body("sens.libelle", equalTo("chute"))
                .body("sens.categorie", equalTo("nom"))
                .body("image", nullValue());

        assertEquals(sensAvant, nombre("select count(*) from sens"));
        assertEquals(chute, sensRetenu(motPreparation));
        assertNull(lienEnBase(motPreparation));
    }

    @Test
    void creerLeSensDejaRetenuNEcritRien() {
        MotVue farine = mot("farine");
        UUID sensFarine = sens(farine, "poudre", "nom");
        UUID x = image(PAUL, sensFarine, "privee");
        UUID motPreparation = UUID.fromString(reutiliser(farine.id(), x));
        String avant = etat(motPreparation);

        creer(preparation, motPreparation, "Poudre", "nom")
                .statusCode(200)
                .body("sens.id", equalTo(sensFarine.toString()))
                .body("image.id", equalTo(x.toString()));
        assertEquals(avant, etat(motPreparation));
    }

    @Test
    void unLibelleVideTropLongOuReserveEstRefuseSansCreerDeSens() {
        MotVue farine = mot("farine");
        UUID x = image(PAUL, sens(farine, "poudre", "nom"), "privee");
        UUID motPreparation = UUID.fromString(reutiliser(farine.id(), x));
        String avant = etat(motPreparation);

        for (String libelle : new String[] { "", "   ", null, "a".repeat(41), "à compléter", " À  Compléter " }) {
            refus(creer(preparation, motPreparation, libelle, "nom"), 400, "sens.libelle_invalide");
        }
        assertEquals(avant, etat(motPreparation));
        creer(preparation, motPreparation, "b".repeat(40), "nom").statusCode(200);
    }

    @Test
    void uneCategorieAbsenteOuHorsListeEstRefuseeSansCreerDeSens() {
        MotVue farine = mot("farine");
        UUID x = image(PAUL, sens(farine, "poudre", "nom"), "privee");
        UUID motPreparation = UUID.fromString(reutiliser(farine.id(), x));
        String avant = etat(motPreparation);

        for (String categorie : new String[] { "pronom", "Nom", null }) {
            refus(creer(preparation, motPreparation, "ingrédient", categorie), 400, "requete.invalide");
        }
        refus(given().contentType(ContentType.JSON)
                .when().post("/api/preparations/" + preparation + "/mots/" + motPreparation + "/sens").then(),
                400, "requete.invalide");
        assertEquals(avant, etat(motPreparation));
    }

    @Test
    void creerPourLaPreparationOuLeMotDUnCollegueEstIntrouvable() {
        MotVue avocat = mot("avocat");
        UUID x = image(PAUL, sens(avocat, "fruit", "nom"), "privee");
        UUID motPreparation = UUID.fromString(reutiliser(avocat.id(), x));
        UUID deZoe = preparation(ZOE);
        UUID motDeZoe = motDePreparation(deZoe, avocat.id());
        String avant = etat(motPreparation);

        for (UUID[] cible : new UUID[][] { { deZoe, motDeZoe }, { UUID.randomUUID(), motPreparation },
                { deZoe, motPreparation }, { preparation, motDeZoe }, { preparation, UUID.randomUUID() } }) {
            refus(creer(cible[0], cible[1], "métier", "nom"), 404, "ressource.introuvable");
        }
        assertEquals(avant, etat(motPreparation));
    }

    // --- Sens dans le Panneau de détection (story 2.8, partie 3) : POST /preparations/{id}/mots ---

    @Test
    void ajouterAvecUnSensVisibleLeRetient() {
        MotVue etale = mot("étalé");
        sens(etale, "cuisine", "adjectif");
        UUID chute = sens(etale, "chute", "nom");
        image(PAUL, chute, "privee");
        long sensAvant = nombre("select count(*) from sens");

        String motPreparation = ajouterAvec(Map.of("saisie", "étalé", "sensId", chute.toString()))
                .statusCode(201)
                .body("forme", equalTo("étalé"))
                .body("sens.id", equalTo(chute.toString()))
                .body("sens.libelle", equalTo("chute"))
                .body("illustre", equalTo(false))
                .extract().path("id");

        assertEquals(chute, sensRetenu(UUID.fromString(motPreparation)));
        assertEquals(sensAvant, nombre("select count(*) from sens"));
        assertEquals(0L, nombre("select count(*) from lien_image"));
    }

    @Test
    void ajouterAvecLeSensDUnAutreMotEstRefuse() {
        MotVue cote = mot("côte");
        image(PAUL, sens(cote, "corps", "nom"), "privee");
        UUID direction = sens(mot("côté"), "direction", "nom");
        image(PAUL, direction, "privee");
        List<Long> avant = nombresAvecMots();

        refus(ajouterAvec(Map.of("saisie", "cote", "motId", cote.id().toString(), "sensId", direction.toString())),
                400, "preparation.sens_invalide");
        assertEquals(avant, nombresAvecMots());
    }

    @Test
    void ajouterAvecUnSensNonVisibleOuInconnuEstRefuse() {
        MotVue avocat = mot("avocat");
        image(PAUL, sens(avocat, "fruit", "nom"), "privee");
        UUID deZoe = sens(avocat, "plaideur", "nom");
        image(ZOE, deZoe, "privee");
        List<Long> avant = nombresAvecMots();

        for (UUID sens : new UUID[] { deZoe, UUID.randomUUID() }) {
            refus(ajouterAvec(Map.of("saisie", "avocat", "sensId", sens.toString())), 400,
                    "preparation.sens_invalide");
            refus(ajouterAvec(Map.of("saisie", "avocat", "motId", avocat.id().toString(), "sensId", sens.toString())),
                    400, "preparation.sens_invalide");
        }
        assertEquals(avant, nombresAvecMots());
    }

    @Test
    void ajouterUnMotExistantAvecUnNouveauSensCreeCeSens() {
        MotVue etale = mot("étalé");
        image(PAUL, sens(etale, "cuisine", "adjectif"), "privee");
        long sensAvant = nombre("select count(*) from sens");

        String chute = ajouterAvec(Map.of("saisie", "etale", "motId", etale.id().toString(),
                "nouveauSens", Map.of("libelle", "chute", "categorie", "nom")))
                .statusCode(201)
                .body("motId", equalTo(etale.id().toString()))
                .body("forme", equalTo("étalé"))
                .body("sens.libelle", equalTo("chute"))
                .body("sens.categorie", equalTo("nom"))
                .extract().path("sens.id");

        assertEquals(sensAvant + 1, nombre("select count(*) from sens"));
        assertEquals("chute|nom|" + etale.id(), ligneSens(UUID.fromString(chute)));
        assertEquals(1L, nombre("select count(*) from sens_retenu where sens_id = '" + chute + "'"));
    }

    @Test
    void ajouterUnMotNouveauAvecUnNouveauSensCreeLeMotEtLeSens() {
        long motsAvant = nombre("select count(*) from mot");

        String gateau = ajouterAvec(Map.of("saisie", "la galette",
                "nouveauSens", Map.of("libelle", "gâteau", "categorie", "nom")))
                .statusCode(201)
                .body("forme", equalTo("galette"))
                .body("sens.libelle", equalTo("gâteau"))
                .body("sens.categorie", equalTo("nom"))
                .extract().path("sens.id");

        assertEquals(motsAvant + 1, nombre("select count(*) from mot"));
        assertEquals(1L, nombre("select count(*) from sens s join mot m on m.id = s.mot_id where m.forme = 'galette'"));
        assertEquals(1L, nombre("select count(*) from sens_retenu where sens_id = '" + gateau + "'"));
    }

    @Test
    void ajouterAvecUnLibelleDejaConnuReutiliseCeSens() {
        MotVue etale = mot("étalé");
        UUID chute = sens(etale, "chute", "nom");
        long sensAvant = nombre("select count(*) from sens");

        ajouterAvec(Map.of("saisie", "étalé", "motId", etale.id().toString(),
                "nouveauSens", Map.of("libelle", " Chute ", "categorie", "verbe")))
                .statusCode(201)
                .body("sens.id", equalTo(chute.toString()))
                .body("sens.categorie", equalTo("nom"));
        assertEquals(sensAvant, nombre("select count(*) from sens"));
    }

    @Test
    void ajouterAvecUnLibelleInvalideNeCreeNiMotNiSens() {
        MotVue etale = mot("étalé");
        List<Long> avant = nombresAvecMots();

        for (String libelle : new String[] { "à compléter", "", "a".repeat(41) }) {
            Map<String, Object> nouveauSens = new HashMap<>();
            nouveauSens.put("libelle", libelle);
            nouveauSens.put("categorie", "nom");
            refus(ajouterAvec(Map.of("saisie", "galette", "nouveauSens", nouveauSens)), 400,
                    "sens.libelle_invalide");
            refus(ajouterAvec(Map.of("saisie", "étalé", "motId", etale.id().toString(), "nouveauSens", nouveauSens)),
                    400, "sens.libelle_invalide");
        }
        assertEquals(avant, nombresAvecMots());
    }

    @Test
    void ajouterAvecUneCategorieAbsenteOuHorsListeEstRefuse() {
        List<Long> avant = nombresAvecMots();

        for (String categorie : new String[] { "pronom", null }) {
            Map<String, Object> nouveauSens = new HashMap<>();
            nouveauSens.put("libelle", "gâteau");
            nouveauSens.put("categorie", categorie);
            refus(ajouterAvec(Map.of("saisie", "galette", "nouveauSens", nouveauSens)), 400, "requete.invalide");
        }
        assertEquals(avant, nombresAvecMots());
    }

    @Test
    void ajouterAvecUnSensEtUnNouveauSensEstRefuse() {
        MotVue etale = mot("étalé");
        UUID chute = sens(etale, "chute", "nom");
        image(PAUL, chute, "privee");
        List<Long> avant = nombresAvecMots();

        refus(ajouterAvec(Map.of("saisie", "étalé", "sensId", chute.toString(),
                "nouveauSens", Map.of("libelle", "cuisine", "categorie", "adjectif"))), 400, "requete.invalide");
        assertEquals(avant, nombresAvecMots());
    }

    @Test
    void ajouterAvecUnSensUnMotDejaPresentNeCreeAucunSens() {
        MotVue etale = mot("étalé");
        UUID chute = sens(etale, "chute", "nom");
        image(PAUL, chute, "privee");
        ajouter("étalé");
        List<Long> avant = nombresAvecMots();

        refus(ajouterAvec(Map.of("saisie", "étalé", "motId", etale.id().toString(),
                "nouveauSens", Map.of("libelle", "cuisine", "categorie", "adjectif"))), 409,
                "preparation.mot_deja_present");
        refus(ajouterAvec(Map.of("saisie", "étalé", "sensId", chute.toString())), 409,
                "preparation.mot_deja_present");
        assertEquals(avant, nombresAvecMots());
    }

    @Test
    void unMotSansSensEstRefuse() {
        MotVue etale = mot("étalé");
        List<Long> avant = nombresAvecMots();

        refus(ajouterAvec(Map.of("saisie", "étalé", "motId", etale.id().toString())), 400, "requete.invalide");
        assertEquals(avant, nombresAvecMots());
    }

    @Test
    void unMotInconnuAvecUnSensEstIntrouvable() {
        MotVue etale = mot("étalé");
        UUID chute = sens(etale, "chute", "nom");
        image(PAUL, chute, "privee");
        List<Long> avant = nombresAvecMots();
        String inconnu = UUID.randomUUID().toString();

        refus(ajouterAvec(Map.of("saisie", "étalé", "motId", inconnu, "sensId", chute.toString())), 404,
                "ressource.introuvable");
        refus(ajouterAvec(Map.of("saisie", "galette", "motId", inconnu,
                "nouveauSens", Map.of("libelle", "gâteau", "categorie", "nom"))), 404, "ressource.introuvable");
        assertEquals(avant, nombresAvecMots());
    }

    // --- Outils ---

    private ValidatableResponse ajouterAvec(Map<String, Object> corps) {
        return given().contentType(ContentType.JSON).body(corps)
                .when().post("/api/preparations/" + preparation + "/mots")
                .then();
    }

    /** {@link #nombres()} suivi du nombre de lignes de {@code mot}. */
    private List<Long> nombresAvecMots() {
        return List.of(nombre("select count(*) from preparation_mot"), nombre("select count(*) from sens_retenu"),
                nombre("select count(*) from lien_image"), nombre("select count(*) from image"),
                nombre("select count(*) from sens"), nombre("select count(*) from mot"));
    }

    private static void refus(ValidatableResponse reponse, int statut, String code) {
        reponse.statusCode(statut)
                .contentType(ProblemeDto.MEDIA_TYPE)
                .body("code", equalTo(code));
    }

    private static ValidatableResponse changer(UUID preparationId, UUID motPreparationId, UUID sensId) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("sensId", sensId == null ? null : sensId.toString());
        return given().contentType(ContentType.JSON).body(corps)
                .when().put("/api/preparations/" + preparationId + "/mots/" + motPreparationId + "/sens")
                .then();
    }

    private static ValidatableResponse creer(UUID preparationId, UUID motPreparationId, String libelle,
            String categorie) {
        Map<String, Object> corps = new HashMap<>();
        corps.put("libelle", libelle);
        corps.put("categorie", categorie);
        return given().contentType(ContentType.JSON).body(corps)
                .when().post("/api/preparations/" + preparationId + "/mots/" + motPreparationId + "/sens")
                .then();
    }

    /** Sens en base : « libellé|catégorie|mot ». */
    private String ligneSens(UUID sensId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Object[] ligne = (Object[]) entityManager.createNativeQuery(
                    "select libelle, categorie, mot_id from sens where id = :id")
                    .setParameter("id", sensId)
                    .getSingleResult();
            return ligne[0] + "|" + ligne[1] + "|" + ligne[2];
        });
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

    private MotVue motDe(UUID preparationMotId) {
        UUID motId = QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager
                .createNativeQuery("select mot_id from preparation_mot where id = :id")
                .setParameter("id", preparationMotId)
                .getSingleResult());
        return new MotVue(motId, null);
    }

    private UUID sens(MotVue mot, String libelle, String categorie) {
        return QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(mot.id(), libelle, categorie)).id();
    }

    /** Image libre de ce propriétaire, à cet état, qui coche la Section MS. */
    private UUID image(String proprietaire, UUID sensId, String etat) {
        UUID image = images.image(UUID.fromString(proprietaire), sensId, etat, "image_libre", "cc0_domaine_public",
                "site web", null, null);
        images.classer(image, null, List.of(), List.of("ms"));
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

    private UUID sensRetenu(UUID preparationMotId) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager
                .createNativeQuery("select sens_id from sens_retenu where preparation_mot_id = :id")
                .setParameter("id", preparationMotId)
                .getSingleResult());
    }

    /** Lien du Mot de Préparation en base : « identifiant|image|origine », null sans lien. */
    private String lienEnBase(UUID preparationMotId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            List<?> lignes = entityManager.createNativeQuery(
                    "select id, image_id, origine from lien_image where preparation_mot_id = :id")
                    .setParameter("id", preparationMotId)
                    .getResultList();
            if (lignes.isEmpty()) {
                return null;
            }
            Object[] ligne = (Object[]) lignes.get(0);
            return ligne[0] + "|" + ligne[1] + "|" + ligne[2];
        });
    }

    /**
     * Ligne {@code sens_retenu} du Mot de Préparation : « identifiant|sens|xmin ». {@code xmin} change à toute écriture
     * de la ligne, même sans changement de valeur.
     */
    private String ligneSensRetenu(UUID preparationMotId) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Object[] ligne = (Object[]) entityManager.createNativeQuery(
                    "select id, sens_id, xmin::text from sens_retenu where preparation_mot_id = :id")
                    .setParameter("id", preparationMotId)
                    .getSingleResult();
            return ligne[0] + "|" + ligne[1] + "|" + ligne[2];
        });
    }

    /** État complet du Mot de Préparation : lien, Sens retenu, nombres de lignes. */
    private String etat(UUID preparationMotId) {
        return lienEnBase(preparationMotId) + "|" + ligneSensRetenu(preparationMotId) + "|" + nombres();
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

    /** Nombre de lignes de {@code preparation_mot}, {@code sens_retenu}, {@code lien_image}, {@code image}, {@code sens}. */
    private List<Long> nombres() {
        return List.of(nombre("select count(*) from preparation_mot"), nombre("select count(*) from sens_retenu"),
                nombre("select count(*) from lien_image"), nombre("select count(*) from image"),
                nombre("select count(*) from sens"));
    }

    private long nombre(String requete) {
        return QuarkusTransaction.requiringNew()
                .call(() -> ((Number) entityManager.createNativeQuery(requete).getSingleResult()).longValue());
    }
}

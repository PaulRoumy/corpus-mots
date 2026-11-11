package fr.corpusmots.vocabulaire.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/**
 * Jeu de tests partagé du Lexique (AD-10) : normalisation pure, clés des Mots, et idempotence de
 * {@code obtenirOuCreerMot} et {@code obtenirOuCreerSens} face à des appels simultanés (AD-19).
 */
@QuarkusTest
class LexiqueTest {

    @Inject
    Lexique lexique;

    @Inject
    EntityManager entityManager;

    @BeforeEach
    void viderLeLexique() {
        QuarkusTransaction.requiringNew().run(() -> {
            entityManager.createNativeQuery("delete from sens_retenu").executeUpdate();
            entityManager.createNativeQuery("delete from preparation_mot").executeUpdate();
            entityManager.createNativeQuery("delete from sens").executeUpdate();
            entityManager.createNativeQuery("delete from mot").executeUpdate();
        });
    }

    @ParameterizedTest(name = "« {0} » → « {1} »")
    @CsvSource(delimiter = '|', quoteCharacter = '"', value = {
            // Jeu partagé d'AD-10
            "côte|côte",
            "côté|côté",
            "l’arbre|arbre",
            "l'arbre|arbre",
            "Lapin|Lapin",
            "des|des",
            // Articles, espaces et apostrophes
            "\" La  citrouille \"|citrouille",
            "le loup|loup",
            "LES enfants|enfants",
            "un ours|ours",
            "une poule|poule",
            "des   galettes|galettes",
            "L’Écureuil|Écureuil",
            "l' âne|âne",
            "le|le",
            "l'|l'",
            "lexique|lexique",
            "laine|laine",
            "lesquels|lesquels",
            "aujourd’hui|aujourd'hui",
            "\"pomme de\tterre \"|pomme de terre",
    })
    void normaliserRetireArticleEspacesEtApostrophes(String saisie, String forme) {
        assertEquals(forme, Lexique.normaliser(saisie));
    }

    @Test
    void uneSaisieBlancheOuNulleDonneUneFormeVide() {
        assertEquals("", Lexique.normaliser(null));
        assertEquals("", Lexique.normaliser(""));
        assertEquals("", Lexique.normaliser(" \t  "));
    }

    @Test
    void laFormeEstEnNfc() {
        // « é » décomposé (e + accent aigu combinant) et composé donnent la même forme.
        assertEquals("côté", Lexique.normaliser("côté"));
    }

    @Test
    void coteEtCoteSontDeuxMotsLapinEtLapinUnSeul() {
        MotVue cote = enTransaction("côte");
        MotVue coteAccent = enTransaction("côté");
        MotVue lapin = enTransaction("Lapin");
        MotVue lapinMinuscule = enTransaction("le lapin");
        MotVue arbre = enTransaction("l’arbre");
        MotVue des = enTransaction("des");

        assertNotEquals(cote.id(), coteAccent.id());
        assertEquals(lapin.id(), lapinMinuscule.id());
        assertEquals("Lapin", lapinMinuscule.forme(), "un Mot existant garde sa première forme");
        assertEquals("arbre", arbre.forme());
        assertEquals("des", des.forme());
        assertEquals("cote", formeRecherche("côte"));
        assertEquals("cote", formeRecherche("côté"));
        assertEquals(1L, nombre("select count(*) from mot where forme_cle = 'lapin'"));
    }

    @Test
    void unSensDeMemeLibelleNormaliseEstReutilise() {
        MotVue lapin = enTransaction("lapin");
        SensVue animal = QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(lapin.id(), "animal", "nom"));
        SensVue memeSens = QuarkusTransaction.requiringNew()
                .call(() -> lexique.obtenirOuCreerSens(lapin.id(), "  Animal ", null));

        assertEquals(animal.id(), memeSens.id());
        assertEquals("animal", memeSens.libelle());
        assertEquals("nom", memeSens.categorie(), "un Sens existant garde sa catégorie");
    }

    @Test
    void deuxCreationsSimultaneesDuMemeMotNEnFontQuUn() throws Exception {
        CountDownLatch premierInsere = new CountDownLatch(1);
        CountDownLatch secondLance = new CountDownLatch(1);

        // Le premier insère « citrouille » sans valider, puis attend que le second soit bloqué sur la même clé.
        CompletableFuture<MotVue> premier = CompletableFuture.supplyAsync(() -> QuarkusTransaction.requiringNew()
                .call(() -> {
                    MotVue mot = lexique.obtenirOuCreerMot("la citrouille");
                    lexique.obtenirOuCreerSens(mot.id(), "à compléter", null);
                    premierInsere.countDown();
                    attendre(secondLance);
                    Thread.sleep(500);
                    return mot;
                }));
        CompletableFuture<MotVue> second = CompletableFuture.supplyAsync(() -> {
            attendre(premierInsere);
            return QuarkusTransaction.requiringNew().call(() -> {
                secondLance.countDown();
                MotVue mot = lexique.obtenirOuCreerMot("Citrouille");
                lexique.obtenirOuCreerSens(mot.id(), "à compléter", null);
                return mot;
            });
        });

        MotVue motPremier = premier.get(30, TimeUnit.SECONDS);
        MotVue motSecond = second.get(30, TimeUnit.SECONDS);

        assertEquals(motPremier.id(), motSecond.id());
        assertEquals("citrouille", motSecond.forme());
        assertEquals(1L, nombre("select count(*) from mot where forme_cle = 'citrouille'"));
        assertEquals(1L, nombre("select count(*) from sens"));
    }

    private MotVue enTransaction(String saisie) {
        return QuarkusTransaction.requiringNew().call(() -> lexique.obtenirOuCreerMot(saisie));
    }

    private String formeRecherche(String formeCle) {
        return QuarkusTransaction.requiringNew().call(() -> (String) entityManager
                .createNativeQuery("select forme_recherche from mot where forme_cle = :cle")
                .setParameter("cle", formeCle)
                .getSingleResult());
    }

    private long nombre(String requete) {
        return QuarkusTransaction.requiringNew()
                .call(() -> ((Number) entityManager.createNativeQuery(requete).getSingleResult()).longValue());
    }

    private static void attendre(CountDownLatch signal) {
        try {
            assertTrue(signal.await(20, TimeUnit.SECONDS), "signal attendu");
        } catch (InterruptedException interruption) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(interruption);
        }
    }
}

package fr.corpusmots.vocabulaire.service;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * {@link SourceArasaacHttp} contre un faux serveur ARASAAC local : URL, lecture, 404, erreurs, taille et délai de 3 s
 * de l'appel entier.
 */
class SourceArasaacHttpTest {

    HttpServer serveur;
    /** Fils du faux serveur, à part : une réponse qui traîne ne bloque ni le répartiteur ni l'arrêt. */
    ExecutorService fils;
    SourceArasaacHttp source;

    /** Chemin brut de la dernière requête reçue. */
    final AtomicReference<String> chemin = new AtomicReference<>();
    volatile int statut = 200;
    volatile byte[] corps = new byte[0];
    volatile String typeContenu = "application/json";
    /** Attente avant les en-têtes. */
    volatile long attenteMs;
    /** Attente entre les en-têtes et la fin du corps (corps lent). */
    volatile long attenteCorpsMs;

    @BeforeEach
    void demarrer() throws IOException {
        serveur = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        serveur.createContext("/", this::repondre);
        fils = Executors.newCachedThreadPool();
        serveur.setExecutor(fils);
        serveur.start();
        String url = "http://127.0.0.1:" + serveur.getAddress().getPort();
        source = new SourceArasaacHttp();
        source.apiUrl = url + "/api/";
        source.staticUrl = url + "/static";
        source.json = new ObjectMapper();
    }

    @AfterEach
    void arreter() {
        fils.shutdownNow();
        serveur.stop(0);
    }

    private void repondre(HttpExchange echange) throws IOException {
        chemin.set(echange.getRequestURI().getRawPath());
        try {
            if (attenteMs > 0) {
                Thread.sleep(attenteMs);
            }
            echange.getResponseHeaders().set("Content-Type", typeContenu);
            echange.sendResponseHeaders(statut, corps.length == 0 ? -1 : corps.length);
            if (corps.length > 0) {
                if (attenteCorpsMs > 0) {
                    echange.getResponseBody().write(corps, 0, 1);
                    echange.getResponseBody().flush();
                    Thread.sleep(attenteCorpsMs);
                    echange.getResponseBody().write(corps, 1, corps.length - 1);
                } else {
                    echange.getResponseBody().write(corps);
                }
            }
        } catch (InterruptedException | IOException erreur) {
            // Client parti (délai dépassé) : rien à faire.
        } finally {
            echange.close();
        }
    }

    @Test
    void rechercherLitLesPictogrammesEtLeursMotsClesDansLOrdre() {
        corps = """
                [{"_id": 2459, "keywords": [{"keyword": "citrouille"}, {"keyword": "potiron"}]},
                 {"_id": 37172, "keywords": []},
                 {"sans": "identifiant"}, {"_id": 0}, {"_id": -5}, {"_id": "12"}, {"_id": 1.5}]
                """.getBytes(StandardCharsets.UTF_8);

        List<PictogrammeArasaac> resultats = source.rechercher("pomme de terre");

        assertEquals(List.of(new PictogrammeArasaac(2459, List.of("citrouille", "potiron")),
                new PictogrammeArasaac(37172, List.of())), resultats);
        assertEquals("/api/v1/pictograms/fr/search/pomme%20de%20terre", chemin.get());
    }

    @Test
    void leMotArriveChezArasaacEnUnSeulSegmentEncode() {
        corps = "[]".getBytes(StandardCharsets.UTF_8);

        source.rechercher("l'œuf");
        assertEquals("/api/v1/pictograms/fr/search/l%27%C5%93uf", chemin.get());

        source.rechercher("pomme/poire?x=1");
        assertEquals("/api/v1/pictograms/fr/search/pomme%2Fpoire%3Fx%3D1", chemin.get());

        source.rechercher("..");
        assertEquals("/api/v1/pictograms/fr/search/%2E%2E", chemin.get());
    }

    @Test
    void rechercherRepondu404RenvoieUneListeVide() {
        statut = 404;

        assertEquals(List.of(), source.rechercher("zorglub"));
    }

    @Test
    void rechercherEnErreurOuIllisibleEstIndisponible() {
        statut = 500;
        assertThrows(ArasaacIndisponible.class, () -> source.rechercher("four"));

        statut = 200;
        corps = "pas du json".getBytes(StandardCharsets.UTF_8);
        assertThrows(ArasaacIndisponible.class, () -> source.rechercher("four"));
    }

    @Test
    void pictogrammeLitLeFichierDe300Px() {
        typeContenu = "image/png";
        corps = new byte[] { 1, 2, 3 };

        Optional<byte[]> fichier = source.pictogramme(2459);

        assertArrayEquals(new byte[] { 1, 2, 3 }, fichier.orElseThrow());
        assertEquals("/static/pictograms/2459/2459_300.png", chemin.get());
    }

    @Test
    void pictogrammeInconnuEstVideEtErreurIndisponible() {
        statut = 404;
        assertTrue(source.pictogramme(1).isEmpty());

        statut = 503;
        assertThrows(ArasaacIndisponible.class, () -> source.pictogramme(1));
    }

    @Test
    void pictogrammeVideOuNonPngEstIndisponible() {
        typeContenu = "text/html; charset=utf-8";
        corps = "<html></html>".getBytes(StandardCharsets.UTF_8);
        assertThrows(ArasaacIndisponible.class, () -> source.pictogramme(1));

        typeContenu = "image/png";
        corps = new byte[0];
        assertThrows(ArasaacIndisponible.class, () -> source.pictogramme(1));
    }

    @Test
    void reponseDePlusDeDeuxMegaOctetsEstIndisponible() {
        typeContenu = "image/png";
        corps = new byte[SourceArasaacHttp.TAILLE_MAX + 1];

        assertThrows(ArasaacIndisponible.class, () -> source.pictogramme(1));
    }

    @Test
    void auDelaDeTroisSecondesArasaacEstIndisponible() {
        attenteMs = 4_000;

        assertAbandonVersTroisSecondes(() -> source.rechercher("four"));
    }

    @Test
    void unCorpsQuiTraineAuDelaDeTroisSecondesEstIndisponible() {
        typeContenu = "image/png";
        corps = new byte[] { 1, 2, 3 };
        attenteCorpsMs = 4_000;

        assertAbandonVersTroisSecondes(() -> source.pictogramme(1));
    }

    private static void assertAbandonVersTroisSecondes(org.junit.jupiter.api.function.Executable appel) {
        long debut = System.nanoTime();
        assertThrows(ArasaacIndisponible.class, appel);
        long dureeMs = (System.nanoTime() - debut) / 1_000_000;

        assertTrue(dureeMs >= 2_500 && dureeMs < 3_900, "abandon après " + dureeMs + " ms");
    }

    @Test
    void serveurInjoignableEstIndisponible() throws IOException {
        try (ServerSocket libre = new ServerSocket(0, 1, InetAddress.getLoopbackAddress())) {
            source.apiUrl = "http://127.0.0.1:" + libre.getLocalPort();
        }

        assertThrows(ArasaacIndisponible.class, () -> source.rechercher("four"));
    }
}

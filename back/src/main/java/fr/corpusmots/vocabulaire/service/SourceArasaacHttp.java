package fr.corpusmots.vocabulaire.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Flow;
import java.util.concurrent.TimeUnit;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * {@link SourceArasaac} par l'API publique d'ARASAAC ({@code corpusmots.arasaac.api-url} pour la recherche,
 * {@code corpusmots.arasaac.static-url} pour les fichiers), avec le client HTTP du JDK. Chaque appel entier (corps
 * compris) tient en 3 s et son corps en {@link #TAILLE_MAX} octets ; au-delà, ARASAAC est indisponible.
 */
@ApplicationScoped
public class SourceArasaacHttp implements SourceArasaac {

    static final Duration DELAI = Duration.ofSeconds(3);

    /** Taille maximale d'une réponse d'ARASAAC (recherche ou fichier). */
    static final int TAILLE_MAX = 2 * 1024 * 1024;

    static final String PNG = "image/png";

    private final HttpClient client = HttpClient.newBuilder()
            .connectTimeout(DELAI)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    @ConfigProperty(name = "corpusmots.arasaac.api-url")
    String apiUrl;

    @ConfigProperty(name = "corpusmots.arasaac.static-url")
    String staticUrl;

    @Inject
    ObjectMapper json;

    @Override
    public List<PictogrammeArasaac> rechercher(String texte) {
        // Un seul segment de chemin : « / », « ? », « . » et « .. » sont encodés et ne changent pas le chemin.
        String segment = URLEncoder.encode(texte, StandardCharsets.UTF_8).replace("+", "%20").replace(".", "%2E");
        HttpResponse<byte[]> reponse = envoyer(sansBarreFinale(apiUrl) + "/v1/pictograms/fr/search/" + segment);
        if (reponse.statusCode() == 404) {
            // ARASAAC répond 404 quand il ne trouve rien : ce n'est pas une panne.
            return List.of();
        }
        verifierSucces(reponse);
        JsonNode racine;
        try {
            racine = json.readTree(reponse.body());
        } catch (IOException erreur) {
            throw new ArasaacIndisponible("Réponse de recherche ARASAAC illisible", erreur);
        }
        if (racine == null || !racine.isArray()) {
            throw new ArasaacIndisponible("Réponse de recherche ARASAAC inattendue");
        }
        List<PictogrammeArasaac> pictogrammes = new ArrayList<>();
        for (JsonNode noeud : racine) {
            JsonNode id = noeud.get("_id");
            if (id == null || !id.isIntegralNumber() || !id.canConvertToLong() || id.asLong() <= 0) {
                continue;
            }
            List<String> motsCles = new ArrayList<>();
            for (JsonNode motCle : noeud.path("keywords")) {
                String valeur = motCle.path("keyword").asText("").strip();
                if (!valeur.isEmpty()) {
                    motsCles.add(valeur);
                }
            }
            pictogrammes.add(new PictogrammeArasaac(id.asLong(), motsCles));
        }
        return pictogrammes;
    }

    @Override
    public Optional<byte[]> pictogramme(long id) {
        HttpResponse<byte[]> reponse = envoyer(
                sansBarreFinale(staticUrl) + "/pictograms/" + id + "/" + id + "_300.png");
        if (reponse.statusCode() == 404) {
            return Optional.empty();
        }
        verifierSucces(reponse);
        String type = reponse.headers().firstValue("Content-Type").orElse("");
        if (reponse.body().length == 0 || !type.split(";")[0].strip().toLowerCase(Locale.ROOT).equals(PNG)) {
            throw new ArasaacIndisponible("Fichier ARASAAC vide ou non PNG (" + type + ")");
        }
        return Optional.of(reponse.body());
    }

    private HttpResponse<byte[]> envoyer(String url) {
        CompletableFuture<HttpResponse<byte[]>> reponse;
        try {
            HttpRequest requete = HttpRequest.newBuilder(URI.create(url)).timeout(DELAI).GET().build();
            reponse = client.sendAsync(requete, infos -> corpsLimite());
        } catch (IllegalArgumentException erreur) {
            throw new ArasaacIndisponible("Adresse ARASAAC invalide", erreur);
        }
        try {
            // Délai de l'appel entier, corps compris : HttpRequest.timeout s'arrête aux en-têtes.
            return reponse.orTimeout(DELAI.toMillis(), TimeUnit.MILLISECONDS).get();
        } catch (ExecutionException erreur) {
            reponse.cancel(true);
            throw new ArasaacIndisponible("ARASAAC injoignable, en erreur ou trop lent", erreur.getCause());
        } catch (InterruptedException erreur) {
            reponse.cancel(true);
            Thread.currentThread().interrupt();
            throw new ArasaacIndisponible("Appel ARASAAC interrompu", erreur);
        }
    }

    /** Corps en octets, abandonné au-delà de {@link #TAILLE_MAX}. */
    private static HttpResponse.BodySubscriber<byte[]> corpsLimite() {
        return new HttpResponse.BodySubscriber<>() {
            private final CompletableFuture<byte[]> resultat = new CompletableFuture<>();
            private final ByteArrayOutputStream octets = new ByteArrayOutputStream();
            private Flow.Subscription abonnement;

            @Override
            public CompletionStage<byte[]> getBody() {
                return resultat;
            }

            @Override
            public void onSubscribe(Flow.Subscription nouvelAbonnement) {
                abonnement = nouvelAbonnement;
                abonnement.request(Long.MAX_VALUE);
            }

            @Override
            public void onNext(List<ByteBuffer> morceaux) {
                for (ByteBuffer morceau : morceaux) {
                    if (resultat.isDone()) {
                        return;
                    }
                    if (octets.size() + morceau.remaining() > TAILLE_MAX) {
                        abonnement.cancel();
                        resultat.completeExceptionally(new ArasaacIndisponible("Réponse ARASAAC trop volumineuse"));
                        return;
                    }
                    byte[] lus = new byte[morceau.remaining()];
                    morceau.get(lus);
                    octets.writeBytes(lus);
                }
            }

            @Override
            public void onError(Throwable erreur) {
                resultat.completeExceptionally(erreur);
            }

            @Override
            public void onComplete() {
                resultat.complete(octets.toByteArray());
            }
        };
    }

    private static void verifierSucces(HttpResponse<byte[]> reponse) {
        if (reponse.statusCode() != 200) {
            throw new ArasaacIndisponible("ARASAAC a répondu " + reponse.statusCode());
        }
    }

    private static String sansBarreFinale(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}

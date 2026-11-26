package fr.corpusmots.vocabulaire.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Migration {@code V202611261000__vocabulaire_image_arasaac} (story 2.11, partie 3) : la colonne {@code arasaac_id}
 * et son index existent, et le remplissage des Images existantes reprend l'identifiant de leur source ARASAAC. Le
 * remplissage est rejoué tel qu'il est écrit dans la migration, sur des Images insérées sans identifiant.
 */
@QuarkusTest
class MigrationImageArasaacTest {

    private static final String MIGRATION = "db/migration/V202611261000__vocabulaire_image_arasaac.sql";
    private static final String SOURCE = "ARASAAC (https://arasaac.org), pictogramme n° ";

    @Inject
    EntityManager entityManager;

    @Test
    void laColonneEtSonIndexExistent() {
        assertEquals("bigint", QuarkusTransaction.requiringNew().call(() -> (String) entityManager.createNativeQuery(
                "select data_type from information_schema.columns where table_name = 'image'"
                        + " and column_name = 'arasaac_id'")
                .getSingleResult()));
        String index = QuarkusTransaction.requiringNew().call(() -> (String) entityManager.createNativeQuery(
                "select indexdef from pg_indexes where indexname = 'image_proprietaire_arasaac'")
                .getSingleResult());
        assertTrue(index.contains("(proprietaire_id, arasaac_id)"), index);
    }

    @Test
    void leRemplissageReprendLIdentifiantDesSourcesArasaac() throws IOException {
        UUID proprietaire = UUID.randomUUID();
        String cle = "migration-arasaac-" + UUID.randomUUID();
        UUID mot = QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into mot (forme, forme_cle, forme_recherche) values (:cle, :cle, :cle) returning id")
                .setParameter("cle", cle)
                .getSingleResult());
        UUID sens = QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into sens (mot_id, libelle, libelle_cle) values (:mot, 'animal', 'animal') returning id")
                .setParameter("mot", mot)
                .getSingleResult());
        // Attendu par Image : identifiant repris, ou null.
        Map<UUID, Long> attendus = new LinkedHashMap<>();
        try {
            attendus.put(image(proprietaire, sens, "'arasaac_cc_by_nc_sa'", "'" + SOURCE + "2349'"), 2349L);
            attendus.put(image(proprietaire, sens, "'arasaac_cc_by_nc_sa'", "'" + SOURCE + "7'"), 7L);
            // Source modifiée par l'enseignant après coup : rien n'est deviné.
            attendus.put(image(proprietaire, sens, "'arasaac_cc_by_nc_sa'", "'" + SOURCE + "2349, recadré'"), null);
            // Autre licence, source absente, identifiant nul : pas une Image ARASAAC reconnaissable.
            attendus.put(image(proprietaire, sens, "'cc0_domaine_public'", "'" + SOURCE + "12'"), null);
            attendus.put(image(proprietaire, sens, "'arasaac_cc_by_nc_sa'", "null"), null);
            attendus.put(image(proprietaire, sens, "'arasaac_cc_by_nc_sa'", "'" + SOURCE + "0'"), null);
            attendus.put(image(proprietaire, sens, "null", "'photo de classe'"), null);

            String remplissage = remplissage();
            QuarkusTransaction.requiringNew().run(() -> entityManager.createNativeQuery(remplissage).executeUpdate());

            for (Map.Entry<UUID, Long> attendu : attendus.entrySet()) {
                assertEquals(attendu.getValue(), arasaacId(attendu.getKey()), "Image " + attendu.getKey());
            }
        } finally {
            QuarkusTransaction.requiringNew().run(() -> {
                entityManager.createNativeQuery("delete from image where sens_id = :sens")
                        .setParameter("sens", sens).executeUpdate();
                entityManager.createNativeQuery("delete from sens where id = :sens")
                        .setParameter("sens", sens).executeUpdate();
                entityManager.createNativeQuery("delete from mot where id = :mot")
                        .setParameter("mot", mot).executeUpdate();
            });
        }
    }

    /** L'instruction {@code UPDATE} de la migration, telle qu'elle est écrite. */
    private static String remplissage() throws IOException {
        String migration;
        try (InputStream flux = Thread.currentThread().getContextClassLoader().getResourceAsStream(MIGRATION)) {
            migration = new String(flux.readAllBytes(), StandardCharsets.UTF_8);
        }
        int debut = migration.indexOf("UPDATE image");
        assertTrue(debut >= 0, "UPDATE introuvable dans " + MIGRATION);
        return migration.substring(debut, migration.indexOf(';', debut));
    }

    /** Image insérée sans identifiant ARASAAC ; licence et source sont des littéraux SQL écrits par le test. */
    private UUID image(UUID proprietaire, UUID sens, String licence, String source) {
        return QuarkusTransaction.requiringNew().call(() -> (UUID) entityManager.createNativeQuery(
                "insert into image (proprietaire_id, sens_id, type_image, licence, source) values (:proprietaire,"
                        + " :sens, 'image_libre', " + licence + ", " + source + ") returning id")
                .setParameter("proprietaire", proprietaire)
                .setParameter("sens", sens)
                .getSingleResult());
    }

    private Long arasaacId(UUID image) {
        return QuarkusTransaction.requiringNew().call(() -> {
            Object valeur = entityManager.createNativeQuery("select arasaac_id from image where id = :id")
                    .setParameter("id", image)
                    .getSingleResult();
            return valeur == null ? null : ((Number) valeur).longValue();
        });
    }
}

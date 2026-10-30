package fr.corpusmots.commun.api;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.agroal.api.AgroalDataSource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

/** La première migration Flyway installe les extensions de recherche (AD-10, AD-22). */
@QuarkusTest
class MigrationInitialeTest {

    @Inject
    AgroalDataSource dataSource;

    @Test
    void lesExtensionsUnaccentEtPgTrgmSontInstallees() throws SQLException {
        List<String> extensions = new ArrayList<>();
        try (Connection connexion = dataSource.getConnection();
                Statement requete = connexion.createStatement();
                ResultSet resultat = requete.executeQuery(
                        "select extname from pg_extension where extname in ('unaccent', 'pg_trgm') order by extname")) {
            while (resultat.next()) {
                extensions.add(resultat.getString(1));
            }
        }

        assertEquals(List.of("pg_trgm", "unaccent"), extensions);
    }
}

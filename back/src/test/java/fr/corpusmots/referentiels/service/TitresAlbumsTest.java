package fr.corpusmots.referentiels.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

/** Forme de recherche des titres d'Albums : casse, accents, espaces, apostrophes et article initial. */
class TitresAlbumsTest {

    @ParameterizedTest(name = "« {0} » → « {1} »")
    @CsvSource(delimiter = '|', textBlock = """
            La Roule Galette                     | roule galette
            L’Ogre                               | ogre
            L'ogre                               | ogre
            Les                                  | les
            les                                  | les
            '  Le   loup   qui voulait  changer ' | loup qui voulait changer
            Une petite poule rousse              | petite poule rousse
            Un                                   | un
            Des souris dans la maison            | souris dans la maison
            La petite poule rousse               | petite poule rousse
            Élmer l’éléphant                     | elmer l'elephant
            Lesquels                             | lesquels
            Lapin                                | lapin
            Leçon de cuisine                     | lecon de cuisine
            L’                                   | l'
            """)
    void normaliseLeTitre(String titre, String attendu) {
        assertEquals(attendu, TitresAlbums.normaliser(titre));
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', textBlock = """
            'la roule gal'        | roule gal
            'ROULE GALETTE'  | roule galette
            """)
    void normaliseLeTexteCherche(String texte, String attendu) {
        assertEquals(attendu, TitresAlbums.normaliser(texte));
    }

    @Test
    void nullDonneUneChaineVide() {
        assertEquals("", TitresAlbums.normaliser(null));
    }
}

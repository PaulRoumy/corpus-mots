package fr.corpusmots.vocabulaire.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;
import static org.junit.jupiter.api.Assertions.assertTrue;

import fr.corpusmots.commun.api.ErreurMetier;
import io.quarkus.runtime.configuration.MemorySizeConverter;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

/** Seule réduction des Images (AD-8) : tailles, formats, orientation EXIF, métadonnées et fichiers pièges. */
class ReductionImagesTest {

    ReductionImages reduction;

    @BeforeEach
    void reduction() {
        reduction = new ReductionImages();
        reduction.tailleMaximale = new MemorySizeConverter().convert("20M");
    }

    @Test
    void preparerUnTeleversementLitTypeLicenceEtReduitLeFichier(@TempDir Path dossier) throws Exception {
        Path chemin = Files.write(dossier.resolve("page.jpg"), FichiersDeTest.jpeg(3000, 2000));

        FichierTeleverseVue prepare = reduction.preparerTeleversement(chemin, Files.size(chemin), "image_album",
                "cc0_domaine_public");
        FichierTeleverseVue sansLicence = reduction.preparerTeleversement(chemin, Files.size(chemin), "image_libre",
                "  ");

        assertEquals(TypeImage.IMAGE_ALBUM, prepare.typeImage());
        assertEquals(Licence.CC0_DOMAINE_PUBLIC, prepare.licence());
        assertEquals(400, prepare.fichier().largeur());
        assertEquals(TypeImage.IMAGE_LIBRE, sansLicence.typeImage());
        assertNull(sansLicence.licence());
        assertEquals(1600, sansLicence.fichier().largeur());
    }

    @Test
    void preparerUnTeleversementRefuseTypeLicenceTailleEtFormat(@TempDir Path dossier) throws Exception {
        Path png = Files.write(dossier.resolve("a.png"), FichiersDeTest.png(10, 10));
        Path texte = Files.write(dossier.resolve("b.png"), "bonjour".getBytes(StandardCharsets.UTF_8));
        Path absent = dossier.resolve("absent.png");

        assertRefus(400, "requete.invalide", () -> reduction.preparerTeleversement(png, 10, null, null));
        assertRefus(400, "requete.invalide", () -> reduction.preparerTeleversement(png, 10, "dessin", null));
        assertRefus(400, "requete.invalide",
                () -> reduction.preparerTeleversement(png, 10, "image_libre", "gratuite"));
        // 413 sur la taille annoncée, avant toute lecture : le fichier n'a pas besoin d'exister.
        assertRefus(413, "requete.trop_volumineuse",
                () -> reduction.preparerTeleversement(absent, 21L * 1024 * 1024, "image_libre", null));
        assertRefus(415, "format.non_supporte",
                () -> reduction.preparerTeleversement(texte, Files.size(texte), "image_libre", null));
    }

    private static void assertRefus(int statut, String code, Executable appel) {
        ErreurMetier erreur = assertThrows(ErreurMetier.class, appel);
        assertEquals(statut, erreur.status());
        assertEquals(code, erreur.code());
    }

    @Test
    void uneImageDAlbumTientDans400Sur400() {
        ImageReduiteVue reduite = reduction.reduire(FichiersDeTest.jpeg(3000, 2000), TypeImage.IMAGE_ALBUM);

        assertEquals(400, reduite.largeur());
        assertEquals(267, reduite.hauteur());
        assertDimensions(reduite.octets(), 400, 267);
        assertEquals("image/jpeg", reduite.typeMime());
        assertDimensions(reduite.miniature(), 256, 171);
    }

    @Test
    void lesAutresTypesTiennentDans1600SurLeGrandCote() {
        for (TypeImage type : new TypeImage[] { TypeImage.IMAGE_LIBRE, TypeImage.PHOTO_PERSONNELLE,
                TypeImage.INCONNU }) {
            ImageReduiteVue reduite = reduction.reduire(FichiersDeTest.png(2000, 4000), type);

            assertEquals(800, reduite.largeur());
            assertEquals(1600, reduite.hauteur());
            assertDimensions(reduite.octets(), 800, 1600);
            assertDimensions(reduite.miniature(), 128, 256);
        }
    }

    @Test
    void unGifEstReduitEtUnGifATransparenceDePalettePasseEnPng() {
        ImageReduiteVue opaque = reduction.reduire(FichiersDeTest.gif(2000, 1000), TypeImage.IMAGE_LIBRE);
        ImageReduiteVue transparent = reduction.reduire(FichiersDeTest.gifTransparent(800, 400),
                TypeImage.IMAGE_ALBUM);

        assertEquals("image/jpeg", opaque.typeMime());
        assertDimensions(opaque.octets(), 1600, 800);
        assertDimensions(opaque.miniature(), 256, 128);
        assertEquals("image/png", transparent.typeMime());
        assertDimensions(transparent.octets(), 400, 200);
        BufferedImage lue = FichiersDeTest.lire(transparent.octets());
        assertTrue(lue.getColorModel().hasAlpha());
        assertEquals(0, lue.getRGB(10, 100) >>> 24);
        assertEquals(0xFFFF0000, lue.getRGB(390, 100));
        assertTrue(FichiersDeTest.lire(transparent.miniature()).getColorModel().hasAlpha());
    }

    @Test
    void unePetiteImageNEstPasAgrandie() {
        ImageReduiteVue reduite = reduction.reduire(FichiersDeTest.png(120, 80), TypeImage.IMAGE_LIBRE);

        assertDimensions(reduite.octets(), 120, 80);
        assertDimensions(reduite.miniature(), 120, 80);
    }

    @Test
    void uneImageTransparenteResteEnPngEtUneOpaquePasseEnJpeg() {
        ImageReduiteVue transparente = reduction.reduire(FichiersDeTest.pngTransparent(300, 300),
                TypeImage.IMAGE_LIBRE);
        ImageReduiteVue opaque = reduction.reduire(FichiersDeTest.png(300, 300), TypeImage.IMAGE_LIBRE);
        ImageReduiteVue gif = reduction.reduire(FichiersDeTest.gif(300, 300), TypeImage.IMAGE_LIBRE);

        assertEquals("image/png", transparente.typeMime());
        assertTrue(FichiersDeTest.lire(transparente.octets()).getColorModel().hasAlpha());
        assertTrue(FichiersDeTest.lire(transparente.miniature()).getColorModel().hasAlpha());
        assertEquals("image/jpeg", opaque.typeMime());
        assertEquals("image/jpeg", gif.typeMime());
    }

    @Test
    void lOrientationExifEstAppliqueePuisLesMetadonneesSupprimees() {
        byte[] oriente = FichiersDeTest.avecOrientationExif(FichiersDeTest.jpeg(400, 200), 6);
        assertEquals(6, ReductionImages.orientationExif(oriente));

        ImageReduiteVue reduite = reduction.reduire(oriente, TypeImage.PHOTO_PERSONNELLE);

        // Tourné de 90° dans le sens horaire : la moitié gauche (rouge) passe en haut.
        BufferedImage image = FichiersDeTest.lire(reduite.octets());
        assertEquals(200, image.getWidth());
        assertEquals(400, image.getHeight());
        assertProcheDe(Color.RED, new Color(image.getRGB(100, 50)));
        assertProcheDe(Color.BLUE, new Color(image.getRGB(100, 350)));
        assertFalse(FichiersDeTest.contient(reduite.octets(), "Exif"));
        assertFalse(FichiersDeTest.contient(reduite.miniature(), "Exif"));
        assertEquals(1, ReductionImages.orientationExif(reduite.octets()));
    }

    @Test
    void chaqueOrientationExifDonneLesBonnesDimensions() {
        for (int orientation = 1; orientation <= 8; orientation++) {
            BufferedImage redressee = ReductionImages.redresser(FichiersDeTest.lire(FichiersDeTest.png(40, 20)),
                    orientation);
            boolean tourne = orientation >= 5;
            assertEquals(tourne ? 20 : 40, redressee.getWidth(), "orientation " + orientation);
            assertEquals(tourne ? 40 : 20, redressee.getHeight(), "orientation " + orientation);
        }
    }

    @Test
    void uneImageGeanteEstRefuseeAvantLeDecodage() {
        byte[] piege = FichiersDeTest.pngGeant(30_000, 30_000);

        ErreurMetier erreur = assertTimeoutPreemptively(Duration.ofSeconds(2),
                () -> assertThrows(ErreurMetier.class, () -> reduction.reduire(piege, TypeImage.IMAGE_LIBRE)));

        assertEquals(415, erreur.status());
        assertEquals("format.non_supporte", erreur.code());
        assertTrue(erreur.getMessage().contains("30000"), erreur.getMessage());
    }

    static Stream<byte[]> fichiersRefuses() {
        return Stream.of(new byte[0], "%PDF-1.7 pas une image".getBytes(StandardCharsets.US_ASCII),
                "texte renommé en .png".getBytes(StandardCharsets.UTF_8), FichiersDeTest.webp(),
                FichiersDeTest.bmp(10, 10));
    }

    @ParameterizedTest
    @MethodSource("fichiersRefuses")
    void unFichierQuiNEstPasUnJpegPngOuGifEstRefuse(byte[] octets) {
        ErreurMetier erreur = assertThrows(ErreurMetier.class, () -> reduction.reduire(octets, TypeImage.IMAGE_LIBRE));

        assertEquals(415, erreur.status());
        assertEquals("format.non_supporte", erreur.code());
    }

    @Test
    void unFichierTropLourdEstRefuse() {
        reduction.tailleMaximale = new MemorySizeConverter().convert("1K");

        ErreurMetier erreur = assertThrows(ErreurMetier.class,
                () -> reduction.reduire(FichiersDeTest.png(600, 600), TypeImage.IMAGE_LIBRE));
        ErreurMetier avantLecture = assertThrows(ErreurMetier.class, () -> reduction.verifierTaille(1025));

        assertEquals(413, erreur.status());
        assertEquals("requete.trop_volumineuse", erreur.code());
        assertEquals("requete.trop_volumineuse", avantLecture.code());
        reduction.verifierTaille(1024);
    }

    private static void assertDimensions(byte[] octets, int largeur, int hauteur) {
        BufferedImage image = FichiersDeTest.lire(octets);
        assertEquals(largeur, image.getWidth(), "largeur");
        assertEquals(hauteur, image.getHeight(), "hauteur");
    }

    private static void assertProcheDe(Color attendue, Color lue) {
        int ecart = Math.abs(attendue.getRed() - lue.getRed()) + Math.abs(attendue.getGreen() - lue.getGreen())
                + Math.abs(attendue.getBlue() - lue.getBlue());
        assertTrue(ecart < 60, "attendu " + attendue + ", lu " + lue);
    }
}

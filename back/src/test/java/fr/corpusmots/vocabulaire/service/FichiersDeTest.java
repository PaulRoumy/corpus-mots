package fr.corpusmots.vocabulaire.service;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.awt.image.IndexColorModel;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.zip.CRC32;
import javax.imageio.ImageIO;

/** Fichiers image des tests, fabriqués par le JDK : aucune ressource binaire versionnée. */
public final class FichiersDeTest {

    private FichiersDeTest() {
    }

    /** JPEG de {@code largeur} × {@code hauteur} px : moitié gauche rouge, moitié droite bleue. */
    public static byte[] jpeg(int largeur, int hauteur) {
        return ecrire(deuxCouleurs(largeur, hauteur, BufferedImage.TYPE_INT_RGB), "jpeg");
    }

    /** PNG opaque de {@code largeur} × {@code hauteur} px. */
    public static byte[] png(int largeur, int hauteur) {
        return ecrire(deuxCouleurs(largeur, hauteur, BufferedImage.TYPE_INT_RGB), "png");
    }

    /** PNG avec transparence (moitié droite transparente) de {@code largeur} × {@code hauteur} px. */
    public static byte[] pngTransparent(int largeur, int hauteur) {
        BufferedImage image = new BufferedImage(largeur, hauteur, BufferedImage.TYPE_INT_ARGB);
        Graphics2D dessin = image.createGraphics();
        dessin.setColor(Color.RED);
        dessin.fillRect(0, 0, largeur / 2, hauteur);
        dessin.dispose();
        return ecrire(image, "png");
    }

    /** GIF de {@code largeur} × {@code hauteur} px. */
    public static byte[] gif(int largeur, int hauteur) {
        return ecrire(deuxCouleurs(largeur, hauteur, BufferedImage.TYPE_INT_RGB), "gif");
    }

    /** GIF à palette dont l'index 0 est transparent : moitié gauche transparente, moitié droite rouge. */
    public static byte[] gifTransparent(int largeur, int hauteur) {
        IndexColorModel palette = new IndexColorModel(8, 2, new byte[] { 0, (byte) 255 }, new byte[] { 0, 0 },
                new byte[] { 0, 0 }, 0);
        BufferedImage image = new BufferedImage(largeur, hauteur, BufferedImage.TYPE_BYTE_INDEXED, palette);
        for (int y = 0; y < hauteur; y++) {
            for (int x = largeur / 2; x < largeur; x++) {
                image.getRaster().setSample(x, y, 0, 1);
            }
        }
        return ecrire(image, "gif");
    }

    /** BMP, format que le JDK lit mais que l'application refuse. */
    public static byte[] bmp(int largeur, int hauteur) {
        return ecrire(deuxCouleurs(largeur, hauteur, BufferedImage.TYPE_INT_RGB), "bmp");
    }

    /** En-tête WebP (RIFF … WEBP VP8 ) suivi d'octets quelconques : format non accepté. */
    public static byte[] webp() {
        byte[] octets = new byte[64];
        System.arraycopy("RIFF".getBytes(StandardCharsets.US_ASCII), 0, octets, 0, 4);
        System.arraycopy("WEBPVP8 ".getBytes(StandardCharsets.US_ASCII), 0, octets, 8, 8);
        return octets;
    }

    /**
     * PNG valide de 1 × 1 px dont l'en-tête (IHDR) annonce {@code largeur} × {@code hauteur} px, CRC recalculé : un
     * fichier piège que seul le décodage révélerait.
     */
    public static byte[] pngGeant(int largeur, int hauteur) {
        byte[] octets = png(1, 1);
        // Signature (8) + longueur (4) + « IHDR » (4) : largeur à 16, hauteur à 20, CRC à 29.
        ByteBuffer tampon = ByteBuffer.wrap(octets);
        tampon.putInt(16, largeur);
        tampon.putInt(20, hauteur);
        CRC32 crc = new CRC32();
        crc.update(octets, 12, 17);
        tampon.putInt(29, (int) crc.getValue());
        return octets;
    }

    /**
     * JPEG {@code jpeg} avec un segment APP1 EXIF (TIFF gros-boutiste) portant l'orientation {@code orientation},
     * inséré après le segment JFIF (APP0) qui suit le marqueur SOI.
     */
    public static byte[] avecOrientationExif(byte[] jpeg, int orientation) {
        ByteBuffer tiff = ByteBuffer.allocate(26);
        tiff.put((byte) 'M').put((byte) 'M').putShort((short) 42).putInt(8);
        tiff.putShort((short) 1);
        tiff.putShort((short) 0x0112).putShort((short) 3).putInt(1).putShort((short) orientation).putShort((short) 0);
        tiff.putInt(0);
        byte[] exif = "Exif\0\0".getBytes(StandardCharsets.US_ASCII);
        int longueur = 2 + exif.length + tiff.capacity();
        int insertion = 2;
        if ((jpeg[2] & 0xFF) == 0xFF && (jpeg[3] & 0xFF) == 0xE0) {
            insertion = 4 + (((jpeg[4] & 0xFF) << 8) | (jpeg[5] & 0xFF));
        }
        ByteArrayOutputStream sortie = new ByteArrayOutputStream();
        sortie.write(jpeg, 0, insertion);
        sortie.write(0xFF);
        sortie.write(0xE1);
        sortie.write(longueur >> 8);
        sortie.write(longueur & 0xFF);
        sortie.write(exif, 0, exif.length);
        sortie.write(tiff.array(), 0, tiff.capacity());
        sortie.write(jpeg, insertion, jpeg.length - insertion);
        return sortie.toByteArray();
    }

    /** Image décodée par le JDK. */
    public static BufferedImage lire(byte[] octets) {
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(octets));
            if (image == null) {
                throw new IllegalArgumentException("Fichier illisible");
            }
            return image;
        } catch (IOException erreur) {
            throw new UncheckedIOException(erreur);
        }
    }

    /** Vrai si {@code octets} contient la suite ASCII {@code texte}. */
    public static boolean contient(byte[] octets, String texte) {
        byte[] motif = texte.getBytes(StandardCharsets.US_ASCII);
        for (int debut = 0; debut + motif.length <= octets.length; debut++) {
            int rang = 0;
            while (rang < motif.length && octets[debut + rang] == motif[rang]) {
                rang++;
            }
            if (rang == motif.length) {
                return true;
            }
        }
        return false;
    }

    private static BufferedImage deuxCouleurs(int largeur, int hauteur, int type) {
        BufferedImage image = new BufferedImage(largeur, hauteur, type);
        Graphics2D dessin = image.createGraphics();
        dessin.setColor(Color.RED);
        dessin.fillRect(0, 0, largeur / 2, hauteur);
        dessin.setColor(Color.BLUE);
        dessin.fillRect(largeur / 2, 0, largeur - largeur / 2, hauteur);
        dessin.dispose();
        return image;
    }

    private static byte[] ecrire(BufferedImage image, String format) {
        try {
            ByteArrayOutputStream sortie = new ByteArrayOutputStream();
            if (!ImageIO.write(image, format, sortie)) {
                throw new IllegalStateException("Aucun encodeur " + format);
            }
            return sortie.toByteArray();
        } catch (IOException erreur) {
            throw new UncheckedIOException(erreur);
        }
    }
}

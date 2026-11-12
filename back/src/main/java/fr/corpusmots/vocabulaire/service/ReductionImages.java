package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.api.ErreurMetier;
import io.quarkus.runtime.configuration.MemorySize;
import jakarta.enterprise.context.ApplicationScoped;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.ImageOutputStream;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Seule réduction des Images (AD-8), appelée à l'enregistrement quelle que soit l'origine du fichier. JPEG, PNG et GIF
 * sont lus par le JDK seul ; tout autre format, ou un fichier illisible, donne {@code 415 format.non_supporte}.
 *
 * <ul>
 *   <li>Les dimensions sont lues dans l'en-tête et plafonnées avant tout décodage ({@value #COTE_MAX_SOURCE} px de
 *       côté, {@value #PIXELS_MAX_SOURCE} pixels) : un fichier piège est refusé sans être décodé.</li>
 *   <li>L'orientation EXIF d'un JPEG est appliquée aux pixels, puis le fichier est réécrit sans aucune métadonnée.</li>
 *   <li>Image d'album : {@value #COTE_MAX_ALBUM} × {@value #COTE_MAX_ALBUM} px au plus ; autres types :
 *       {@value #COTE_MAX} px au plus sur le grand côté ; miniature : {@value #COTE_MAX_MINIATURE} px au plus. Une
 *       image plus petite n'est pas agrandie.</li>
 *   <li>Format écrit : PNG si la source a de la transparence, sinon JPEG ; même format pour la miniature.</li>
 * </ul>
 */
@ApplicationScoped
public class ReductionImages {

    public static final int COTE_MAX_ALBUM = 400;
    public static final int COTE_MAX = 1600;
    public static final int COTE_MAX_MINIATURE = 256;

    /** Plus grand côté accepté dans l'en-tête d'un fichier, avant décodage. */
    static final int COTE_MAX_SOURCE = 12_000;

    /** Plus grand nombre de pixels accepté dans l'en-tête d'un fichier, avant décodage. */
    static final long PIXELS_MAX_SOURCE = 50_000_000L;

    static final String CODE_FORMAT_NON_SUPPORTE = "format.non_supporte";
    static final String CODE_TROP_VOLUMINEUX = "requete.trop_volumineuse";
    static final String JPEG = "image/jpeg";
    static final String PNG = "image/png";

    private static final Set<String> FORMATS_ACCEPTES = Set.of("jpeg", "png", "gif");
    private static final float QUALITE_JPEG = 0.88f;
    private static final int ORIENTATION_EXIF = 0x0112;

    /** Taille maximale d'un fichier téléversé ({@code corpusmots.limites.taille-fichier}). */
    @ConfigProperty(name = "corpusmots.limites.taille-fichier")
    MemorySize tailleMaximale;

    /**
     * Refuse un fichier plus lourd que {@code corpusmots.limites.taille-fichier}, avant de le lire.
     *
     * @throws ErreurMetier {@code 413 requete.trop_volumineuse}
     */
    public void verifierTaille(long taille) {
        if (taille > tailleMaximale.asLongValue()) {
            throw new ErreurMetier(413, CODE_TROP_VOLUMINEUX,
                    "Le fichier dépasse " + tailleMaximale.asLongValue() + " octets");
        }
    }

    /** Plus grand côté d'une Image de ce type, une fois réduite. */
    public static int coteMaximal(TypeImage type) {
        return type == TypeImage.IMAGE_ALBUM ? COTE_MAX_ALBUM : COTE_MAX;
    }

    /**
     * Réduit le fichier {@code octets} pour une Image de type {@code type} (voir la classe).
     *
     * @throws ErreurMetier {@code 413 requete.trop_volumineuse} si le fichier dépasse la taille maximale ;
     *         {@code 415 format.non_supporte} s'il est vide, illisible, d'un format non accepté ou trop grand
     */
    public ImageReduiteVue reduire(byte[] octets, TypeImage type) {
        if (octets == null || octets.length == 0) {
            throw formatNonSupporte("Fichier vide");
        }
        verifierTaille(octets.length);
        int cote = coteMaximal(type);
        BufferedImage source = redresser(decoder(octets, cote), orientationExif(octets));
        boolean transparence = source.getColorModel().hasAlpha();
        BufferedImage grande = reduireA(source, cote);
        BufferedImage miniature = reduireA(grande, COTE_MAX_MINIATURE);
        return new ImageReduiteVue(encoder(grande, transparence), encoder(miniature, transparence),
                transparence ? PNG : JPEG, grande.getWidth(), grande.getHeight());
    }

    /**
     * Décode la première image du fichier, après avoir vérifié son format et ses dimensions dans l'en-tête. Une source
     * bien plus grande que {@code cote} est décodée en sous-échantillonnage (au moins deux fois {@code cote}), pour
     * limiter la mémoire.
     */
    static BufferedImage decoder(byte[] octets, int cote) {
        try (ImageInputStream flux = ImageIO.createImageInputStream(new ByteArrayInputStream(octets))) {
            Iterator<ImageReader> lecteurs = flux == null ? null : ImageIO.getImageReaders(flux);
            if (lecteurs == null || !lecteurs.hasNext()) {
                throw formatNonSupporte("Format non reconnu");
            }
            ImageReader lecteur = lecteurs.next();
            try {
                String format = lecteur.getFormatName().toLowerCase(Locale.ROOT);
                if (!FORMATS_ACCEPTES.contains(format)) {
                    throw formatNonSupporte("Format non accepté : " + format);
                }
                lecteur.setInput(flux, true, true);
                int largeur = lecteur.getWidth(0);
                int hauteur = lecteur.getHeight(0);
                if (largeur <= 0 || hauteur <= 0 || largeur > COTE_MAX_SOURCE || hauteur > COTE_MAX_SOURCE
                        || (long) largeur * hauteur > PIXELS_MAX_SOURCE) {
                    throw formatNonSupporte("Dimensions refusées : " + largeur + " × " + hauteur);
                }
                ImageReadParam parametres = lecteur.getDefaultReadParam();
                int pas = Math.max(1, Math.max(largeur, hauteur) / (2 * cote));
                if (pas > 1) {
                    parametres.setSourceSubsampling(pas, pas, 0, 0);
                }
                BufferedImage image = lecteur.read(0, parametres);
                if (image == null) {
                    throw formatNonSupporte("Image vide");
                }
                return image;
            } finally {
                lecteur.dispose();
            }
        } catch (ErreurMetier erreur) {
            throw erreur;
        } catch (IOException | RuntimeException erreur) {
            throw formatNonSupporte("Fichier illisible : " + erreur.getMessage());
        }
    }

    /**
     * Orientation EXIF (tag {@code 0x0112}) d'un JPEG, de 1 à 8 ; 1 (aucune transformation) pour un autre format, un
     * JPEG sans EXIF ou une valeur illisible.
     */
    static int orientationExif(byte[] octets) {
        if (octets.length < 4 || (octets[0] & 0xFF) != 0xFF || (octets[1] & 0xFF) != 0xD8) {
            return 1;
        }
        int position = 2;
        while (position + 4 <= octets.length) {
            if ((octets[position] & 0xFF) != 0xFF) {
                return 1;
            }
            int marqueur = octets[position + 1] & 0xFF;
            if (marqueur == 0xFF) {
                position++;
                continue;
            }
            if (marqueur == 0x01 || (marqueur >= 0xD0 && marqueur <= 0xD8)) {
                position += 2;
                continue;
            }
            if (marqueur == 0xDA || marqueur == 0xD9) {
                return 1;
            }
            int longueur = ((octets[position + 2] & 0xFF) << 8) | (octets[position + 3] & 0xFF);
            int fin = position + 2 + longueur;
            if (longueur < 2 || fin > octets.length) {
                return 1;
            }
            if (marqueur == 0xE1 && longueur >= 16 && estExif(octets, position + 4)) {
                int orientation = orientationTiff(octets, position + 10, fin);
                if (orientation != 0) {
                    return orientation;
                }
            }
            position = fin;
        }
        return 1;
    }

    private static boolean estExif(byte[] octets, int debut) {
        return octets[debut] == 'E' && octets[debut + 1] == 'x' && octets[debut + 2] == 'i' && octets[debut + 3] == 'f'
                && octets[debut + 4] == 0 && octets[debut + 5] == 0;
    }

    /** Orientation lue dans l'IFD0 de l'en-tête TIFF qui commence à {@code debut} ; 0 si elle est absente. */
    private static int orientationTiff(byte[] octets, int debut, int fin) {
        if (debut + 8 > fin) {
            return 0;
        }
        boolean petitBoutiste;
        if (octets[debut] == 'I' && octets[debut + 1] == 'I') {
            petitBoutiste = true;
        } else if (octets[debut] == 'M' && octets[debut + 1] == 'M') {
            petitBoutiste = false;
        } else {
            return 0;
        }
        long decalage = lire32(octets, debut + 4, petitBoutiste);
        if (decalage < 8 || debut + decalage + 2 > fin) {
            return 0;
        }
        int ifd = (int) (debut + decalage);
        int entrees = lire16(octets, ifd, petitBoutiste);
        for (int rang = 0; rang < entrees; rang++) {
            int entree = ifd + 2 + 12 * rang;
            if (entree + 12 > fin) {
                return 0;
            }
            if (lire16(octets, entree, petitBoutiste) == ORIENTATION_EXIF) {
                // Type SHORT (3), valeur dans les deux premiers octets du champ de valeur.
                if (lire16(octets, entree + 2, petitBoutiste) != 3) {
                    return 0;
                }
                int valeur = lire16(octets, entree + 8, petitBoutiste);
                return valeur >= 1 && valeur <= 8 ? valeur : 0;
            }
        }
        return 0;
    }

    private static int lire16(byte[] octets, int position, boolean petitBoutiste) {
        int a = octets[position] & 0xFF;
        int b = octets[position + 1] & 0xFF;
        return petitBoutiste ? (b << 8) | a : (a << 8) | b;
    }

    private static long lire32(byte[] octets, int position, boolean petitBoutiste) {
        long a = octets[position] & 0xFF;
        long b = octets[position + 1] & 0xFF;
        long c = octets[position + 2] & 0xFF;
        long d = octets[position + 3] & 0xFF;
        return petitBoutiste ? (d << 24) | (c << 16) | (b << 8) | a : (a << 24) | (b << 16) | (c << 8) | d;
    }

    /**
     * Applique l'orientation EXIF {@code orientation} (1 à 8) et convertit l'image en RVB, avec alpha si la source a de
     * la transparence : les étapes suivantes ne voient que ces deux types de pixels.
     */
    static BufferedImage redresser(BufferedImage source, int orientation) {
        int l = source.getWidth();
        int h = source.getHeight();
        boolean tourne = orientation >= 5 && orientation <= 8;
        AffineTransform transformation = switch (orientation) {
            case 2 -> new AffineTransform(-1, 0, 0, 1, l, 0);
            case 3 -> new AffineTransform(-1, 0, 0, -1, l, h);
            case 4 -> new AffineTransform(1, 0, 0, -1, 0, h);
            case 5 -> new AffineTransform(0, 1, 1, 0, 0, 0);
            case 6 -> new AffineTransform(0, 1, -1, 0, h, 0);
            case 7 -> new AffineTransform(0, -1, -1, 0, h, l);
            case 8 -> new AffineTransform(0, -1, 1, 0, 0, l);
            default -> new AffineTransform();
        };
        BufferedImage cible = new BufferedImage(tourne ? h : l, tourne ? l : h, typeDe(source));
        Graphics2D dessin = cible.createGraphics();
        try {
            dessin.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_NEAREST_NEIGHBOR);
            dessin.drawImage(source, transformation, null);
        } finally {
            dessin.dispose();
        }
        return cible;
    }

    /**
     * Image dont le grand côté vaut au plus {@code cote}, proportions gardées ; l'image elle-même si elle est déjà assez
     * petite. Réduction par moitiés successives, puis bicubique, pour une image nette.
     */
    static BufferedImage reduireA(BufferedImage image, int cote) {
        int l = image.getWidth();
        int h = image.getHeight();
        if (Math.max(l, h) <= cote) {
            return image;
        }
        double rapport = (double) cote / Math.max(l, h);
        int largeurCible = Math.max(1, (int) Math.round(l * rapport));
        int hauteurCible = Math.max(1, (int) Math.round(h * rapport));
        BufferedImage courante = image;
        while (courante.getWidth() / 2 >= largeurCible && courante.getHeight() / 2 >= hauteurCible) {
            courante = redimensionner(courante, courante.getWidth() / 2, courante.getHeight() / 2,
                    RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        }
        if (courante.getWidth() != largeurCible || courante.getHeight() != hauteurCible) {
            courante = redimensionner(courante, largeurCible, hauteurCible, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        }
        return courante;
    }

    private static BufferedImage redimensionner(BufferedImage image, int largeur, int hauteur, Object interpolation) {
        BufferedImage cible = new BufferedImage(largeur, hauteur, typeDe(image));
        Graphics2D dessin = cible.createGraphics();
        try {
            dessin.setRenderingHint(RenderingHints.KEY_INTERPOLATION, interpolation);
            dessin.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            dessin.drawImage(image, 0, 0, largeur, hauteur, null);
        } finally {
            dessin.dispose();
        }
        return cible;
    }

    private static int typeDe(BufferedImage image) {
        return image.getColorModel().hasAlpha() ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;
    }

    /** PNG avec transparence, sinon JPEG ; aucune métadonnée n'est écrite. */
    static byte[] encoder(BufferedImage image, boolean transparence) {
        ByteArrayOutputStream sortie = new ByteArrayOutputStream();
        try {
            if (transparence) {
                if (!ImageIO.write(image, "png", sortie)) {
                    throw new IllegalStateException("Aucun encodeur PNG");
                }
                return sortie.toByteArray();
            }
            ImageWriter encodeur = ImageIO.getImageWritersByFormatName("jpeg").next();
            try (ImageOutputStream flux = ImageIO.createImageOutputStream(sortie)) {
                ImageWriteParam parametres = encodeur.getDefaultWriteParam();
                parametres.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                parametres.setCompressionQuality(QUALITE_JPEG);
                encodeur.setOutput(flux);
                encodeur.write(null, new IIOImage(image, null, null), parametres);
            } finally {
                encodeur.dispose();
            }
            return sortie.toByteArray();
        } catch (IOException erreur) {
            throw new UncheckedIOException(erreur);
        }
    }

    private static ErreurMetier formatNonSupporte(String detail) {
        return new ErreurMetier(415, CODE_FORMAT_NON_SUPPORTE, detail);
    }
}

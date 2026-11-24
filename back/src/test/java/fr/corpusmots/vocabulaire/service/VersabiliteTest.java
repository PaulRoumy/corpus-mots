package fr.corpusmots.vocabulaire.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

/** Règle de versabilité d'AD-4 ({@link Versabilite#de}) : un cas par motif, dans l'ordre de la règle. */
class VersabiliteTest {

    @ParameterizedTest
    @EnumSource(value = Licence.class,
            names = { "ARASAAC_CC_BY_NC_SA", "SCLERA_CC_BY_NC", "MULBERRY_CC_BY_SA", "CC0_DOMAINE_PUBLIC" })
    void uneImageLibreSourceeSousLicencePartageableEstVersable(Licence licence) {
        assertEquals(Versabilite.VERSABLE, Versabilite.de(TypeImage.IMAGE_LIBRE, licence, "Wikimedia", false));
    }

    @ParameterizedTest
    @EnumSource(value = Licence.class,
            names = { "PIXABAY", "AUTRE_INCONNUE", "DROITS_AUTEUR_ENSEIGNANT", "USAGE_PEDAGOGIQUE_ALBUM" })
    void uneImageLibreSousUneAutreLicenceNEstPasVersable(Licence licence) {
        assertEquals(Versabilite.LICENCE_NON_VERSABLE,
                Versabilite.de(TypeImage.IMAGE_LIBRE, licence, "Wikimedia", false));
    }

    @Test
    void uneImageLibreSansLicenceNEstPasVersable() {
        assertEquals(Versabilite.LICENCE_NON_VERSABLE, Versabilite.de(TypeImage.IMAGE_LIBRE, null, "Wikimedia", false));
    }

    @Test
    void uneImageLibreSansSourceNEstPasVersable() {
        assertEquals(Versabilite.SOURCE_MANQUANTE,
                Versabilite.de(TypeImage.IMAGE_LIBRE, Licence.CC0_DOMAINE_PUBLIC, null, false));
        assertEquals(Versabilite.SOURCE_MANQUANTE,
                Versabilite.de(TypeImage.IMAGE_LIBRE, Licence.CC0_DOMAINE_PUBLIC, "", false));
        assertEquals(Versabilite.SOURCE_MANQUANTE,
                Versabilite.de(TypeImage.IMAGE_LIBRE, Licence.CC0_DOMAINE_PUBLIC, "  ", false));
    }

    @Test
    void laSourceManquantePasseAvantLaLicence() {
        assertEquals(Versabilite.SOURCE_MANQUANTE, Versabilite.de(TypeImage.IMAGE_LIBRE, Licence.PIXABAY, null, false));
    }

    @Test
    void unePhotoPersonnelleEstToujoursVersable() {
        assertEquals(Versabilite.VERSABLE,
                Versabilite.de(TypeImage.PHOTO_PERSONNELLE, Licence.DROITS_AUTEUR_ENSEIGNANT, null, false));
        assertEquals(Versabilite.VERSABLE, Versabilite.de(TypeImage.PHOTO_PERSONNELLE, null, "", false));
    }

    @Test
    void uneImageDAlbumNEstJamaisVersable() {
        assertEquals(Versabilite.IMAGE_ALBUM,
                Versabilite.de(TypeImage.IMAGE_ALBUM, Licence.USAGE_PEDAGOGIQUE_ALBUM, "Album", false));
    }

    @Test
    void unTypeInconnuNEstPasVersable() {
        assertEquals(Versabilite.TYPE_INCONNU,
                Versabilite.de(TypeImage.INCONNU, Licence.CC0_DOMAINE_PUBLIC, "Wikimedia", false));
        assertEquals(Versabilite.TYPE_INCONNU, Versabilite.de(null, Licence.CC0_DOMAINE_PUBLIC, "Wikimedia", false));
    }

    @Test
    void unRetraitAdminLEmporteSurToutAutreMotif() {
        assertEquals(Versabilite.RETRAIT_ADMIN,
                Versabilite.de(TypeImage.PHOTO_PERSONNELLE, Licence.DROITS_AUTEUR_ENSEIGNANT, null, true));
        assertEquals(Versabilite.RETRAIT_ADMIN,
                Versabilite.de(TypeImage.IMAGE_ALBUM, Licence.USAGE_PEDAGOGIQUE_ALBUM, null, true));
        assertEquals(Versabilite.RETRAIT_ADMIN, Versabilite.de(TypeImage.IMAGE_LIBRE, null, null, true));
    }

    @Test
    void lesValeursSontLesCodesStables() {
        assertEquals("versable", Versabilite.VERSABLE.valeur());
        assertEquals("image.versement.retrait_admin", Versabilite.RETRAIT_ADMIN.valeur());
        assertEquals("image.versement.image_album", Versabilite.IMAGE_ALBUM.valeur());
        assertEquals("image.versement.type_inconnu", Versabilite.TYPE_INCONNU.valeur());
        assertEquals("image.versement.source_manquante", Versabilite.SOURCE_MANQUANTE.valeur());
        assertEquals("image.versement.licence_non_versable", Versabilite.LICENCE_NON_VERSABLE.valeur());
    }
}

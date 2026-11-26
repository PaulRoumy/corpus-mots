package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.service.Section;
import fr.corpusmots.referentiels.service.AlbumVue;
import java.util.List;

/**
 * Image proposable montrée par la détection (FR-8) : ses Sections cochées (ordre PS, MS, GS), son Album d'origine
 * ({@code null} sauf pour une image d'album), le Sens qu'elle illustre, et {@code dejaUtilisee}, vrai si l'enseignant
 * courant l'a déjà liée dans l'une de ses Préparations, et {@code idArasaac}, l'identifiant du pictogramme ARASAAC
 * dont elle a été créée ({@code null} pour une autre Image, story 2.11).
 */
public record ImageDetecteeVue(ImageVue image, List<Section> sections, AlbumVue albumOrigine, SensProposeVue sens,
        boolean dejaUtilisee, Long idArasaac) {
}

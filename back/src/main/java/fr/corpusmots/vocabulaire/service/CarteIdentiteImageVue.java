package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.commun.service.Section;
import fr.corpusmots.referentiels.service.AlbumVue;
import fr.corpusmots.referentiels.service.ModuleVue;
import fr.corpusmots.referentiels.service.ThemeVue;
import java.util.List;

/**
 * Carte d'identité d'une Image consultable par l'enseignant courant (FR-14) : l'Image (AD-16), le Mot et le Sens
 * qu'elle illustre, {@code sensACompleter} vrai pour le Sens par défaut « à compléter », l'Album d'origine
 * ({@code null} hors image d'album), la licence, la source et l'auteur ({@code null} s'ils ne sont pas renseignés) ;
 * ses Sections (ordre PS, MS, GS), son Module et l'Album de ce Module ({@code null} sans Module), et ses Thèmes, par
 * nom.
 */
public record CarteIdentiteImageVue(ImageVue image, MotVue mot, SensVue sens, boolean sensACompleter,
        AlbumVue albumOrigine, Licence licence, String source, String auteur, List<Section> sections,
        ModuleVue module, AlbumVue albumModule, List<ThemeVue> themes) {
}

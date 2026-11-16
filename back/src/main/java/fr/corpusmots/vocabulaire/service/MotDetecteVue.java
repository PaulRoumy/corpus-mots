package fr.corpusmots.vocabulaire.service;

import fr.corpusmots.referentiels.service.AlbumVue;
import java.util.List;

/**
 * Mot existant et visible de l'enseignant courant, montré par la détection (FR-8, AD-2) : ses Sens visibles (ceux de
 * ses Images proposables et ceux que l'enseignant a retenus), par libellé, « à compléter » en dernier ; ses Albums
 * (albums d'origine des Images proposables et Albums des Préparations de l'enseignant où il figure), par titre ; ses
 * Images proposables, classées par {@link DetectionMots} (FR-9).
 */
public record MotDetecteVue(MotVue mot, List<SensProposeVue> sens, List<AlbumVue> albums,
        List<ImageDetecteeVue> images) {
}

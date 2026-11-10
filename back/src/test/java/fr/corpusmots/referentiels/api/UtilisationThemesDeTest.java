package fr.corpusmots.referentiels.api;

import fr.corpusmots.referentiels.service.UtilisationThemes;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Module aval factice des {@code @QuarkusTest} : utilise les Thèmes qu'on lui désigne. Aucune implémentation de
 * {@link UtilisationThemes} n'existe en production avant la story 2.6 ; celle-ci rend testable le refus
 * {@code 409 theme.utilise}. Vide par défaut, à vider après chaque test qui la remplit.
 */
@ApplicationScoped
public class UtilisationThemesDeTest implements UtilisationThemes {

    private final Set<UUID> utilises = ConcurrentHashMap.newKeySet();

    @Override
    public boolean utilise(UUID themeId) {
        return utilises.contains(themeId);
    }

    /** Le Thème {@code themeId} est désormais utilisé. */
    public void utiliser(UUID themeId) {
        utilises.add(themeId);
    }

    /** Plus aucun Thème n'est utilisé. */
    public void oublier() {
        utilises.clear();
    }
}

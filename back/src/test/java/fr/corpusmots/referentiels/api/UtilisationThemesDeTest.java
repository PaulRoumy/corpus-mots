package fr.corpusmots.referentiels.api;

import fr.corpusmots.referentiels.service.UtilisationThemes;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Module aval factice des {@code @QuarkusTest} : utilise les Thèmes qu'on lui désigne, pour tester le refus
 * {@code 409 theme.utilise} sans Image. S'ajoute à l'implémentation de production ({@code vocabulaire}, story 2.6,
 * partie 3, testée par {@code ClassementImageResourceTest}). Vide par défaut, à vider après chaque test qui la remplit.
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

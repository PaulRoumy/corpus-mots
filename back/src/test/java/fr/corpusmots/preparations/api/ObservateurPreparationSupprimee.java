package fr.corpusmots.preparations.api;

import fr.corpusmots.preparations.service.PreparationSupprimee;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Observateur de test de {@link PreparationSupprimee} (story 2.10) : il retient chaque événement reçu et ce qu'il voit
 * de la base à cet instant, dans la transaction de l'émetteur (AD-15) : la Préparation existe encore, ses usages sont
 * déjà libérés.
 */
@ApplicationScoped
public class ObservateurPreparationSupprimee {

    /** Un événement reçu et l'état vu dans la transaction de l'émetteur. */
    public record Reception(PreparationSupprimee evenement, boolean preparationPresente, long usagesRestants) {
    }

    @Inject
    EntityManager entityManager;

    /** Vrai : l'observateur échoue après avoir retenu l'événement, pour vérifier que toute la suppression est annulée. */
    static volatile boolean echouer;

    private final List<Reception> receptions = new CopyOnWriteArrayList<>();

    void observer(@Observes PreparationSupprimee evenement) {
        try {
            retenir(evenement);
        } finally {
            if (echouer) {
                throw new IllegalStateException("Échec simulé d'un observateur de PreparationSupprimee");
            }
        }
    }

    private void retenir(PreparationSupprimee evenement) {
        UUID id = evenement.preparationId();
        boolean presente = nombre("select count(*) from preparation where id = :id", id) == 1;
        long usages = nombre("select count(*) from sens_retenu where preparation_id = :id", id)
                + nombre("select count(*) from lien_image where preparation_id = :id", id);
        receptions.add(new Reception(evenement, presente, usages));
    }

    public List<Reception> receptions() {
        return List.copyOf(receptions);
    }

    public void effacer() {
        receptions.clear();
        echouer = false;
    }

    private long nombre(String requete, UUID id) {
        return ((Number) entityManager.createNativeQuery(requete).setParameter("id", id).getSingleResult())
                .longValue();
    }
}

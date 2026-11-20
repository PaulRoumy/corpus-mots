package fr.corpusmots.preparations.api;

import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

/** « Tout reprendre » : les Mots affichés par l'Encart « mots déjà illustrés » (story 2.9). */
public record RepriseMotsPreparationDto(
        @Schema(required = true, minItems = 1, maxItems = PreparationsResource.REPRISES_MAXIMUM,
                description = "Identifiants des Mots du Lexique à reprendre, de 1 à 200")
        List<UUID> motIds) {
}

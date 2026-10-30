package fr.corpusmots.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.joining;

import com.tngtech.archunit.core.domain.Dependency;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Règles d'architecture du back, paramétrées par le paquetage racine pour pouvoir être éprouvées sur des
 * classes fixtures en violation.
 *
 * <ul>
 *   <li>AD-1 : un module n'en appelle un autre que par sa couche {@code service}, et seulement dans le sens du
 *       graphe ci-dessous ; tout module peut dépendre de {@code commun} ({@code api} et {@code service}),
 *       qui ne dépend de rien.</li>
 *   <li>Structure : toute classe réside dans {@code <module connu>.<api|service|persistance>}.</li>
 *   <li>AD-16 : les DTO (suffixe {@code Dto}) ont un nom unique dans tout le back.</li>
 * </ul>
 */
public final class ReglesArchitecture {

    public static final String RACINE = "fr.corpusmots";

    static final String COMMUN = "commun";

    static final Set<String> COUCHES = Set.of("api", "service", "persistance");

    /** Graphe AD-1 exact : module → modules dont il peut appeler la couche service ({@code commun} implicite). */
    static final Map<String, Set<String>> GRAPHE = Map.ofEntries(
            Map.entry(COMMUN, Set.of()),
            Map.entry("comptes", Set.of("vocabulaire", "preparations", "importation", "fiches", "notifications")),
            Map.entry("referentiels", Set.of()),
            Map.entry("vocabulaire", Set.of("referentiels", "notifications")),
            Map.entry("notifications", Set.of()),
            Map.entry("preparations", Set.of("vocabulaire", "referentiels")),
            Map.entry("importation", Set.of("preparations", "vocabulaire", "referentiels")),
            Map.entry("fiches", Set.of("preparations", "vocabulaire", "referentiels")),
            Map.entry("moderation", Set.of("vocabulaire")),
            Map.entry("indicateurs", Set.of("comptes", "preparations", "vocabulaire")));

    private ReglesArchitecture() {
    }

    public static ArchRule dependancesEntreModules(String racine) {
        return classes().that().resideInAPackage(racine + "..")
                .should(new ArchCondition<JavaClass>(
                        "ne dépendre d'un autre module que par sa couche service, dans le sens du graphe AD-1") {
                    @Override
                    public void check(JavaClass classe, ConditionEvents events) {
                        Optional<Emplacement> origine = Emplacement.de(racine, classe.getPackageName());
                        if (origine.isEmpty()) {
                            return;
                        }
                        for (Dependency dependance : classe.getDirectDependenciesFromSelf()) {
                            Optional<Emplacement> cible = Emplacement.de(racine,
                                    dependance.getTargetClass().getBaseComponentType().getPackageName());
                            if (cible.isEmpty() || cible.get().module().equals(origine.get().module())) {
                                continue;
                            }
                            raisonDeRefus(origine.get().module(), cible.get()).ifPresent(raison -> events.add(
                                    SimpleConditionEvent.violated(dependance,
                                            dependance.getDescription() + " : " + raison)));
                        }
                    }
                })
                .because("AD-1 fige le graphe des modules et réserve leurs couches api et persistance");
    }

    public static ArchRule classesDansUnModuleEtUneCouche(String racine) {
        return classes().that().resideInAPackage(racine + "..")
                .should(new ArchCondition<JavaClass>(
                        "résider dans <module connu>.<api|service|persistance>") {
                    @Override
                    public void check(JavaClass classe, ConditionEvents events) {
                        String paquetage = classe.getPackageName();
                        String[] segments = paquetage.equals(racine) ? new String[0]
                                : paquetage.substring(racine.length() + 1).split("\\.");
                        if (segments.length < 2 || !GRAPHE.containsKey(segments[0])
                                || !COUCHES.contains(segments[1])) {
                            events.add(SimpleConditionEvent.violated(classe, classe.getName()
                                    + " hors de <module connu>.<api|service|persistance> (paquetage " + paquetage + ")"));
                        }
                    }
                })
                .because("un module ou une couche inconnus échapperaient aux règles d'AD-1");
    }

    public static ArchRule nomsDeDtoUniques(String racine) {
        return classes().that().resideInAPackage(racine + "..").and().haveSimpleNameEndingWith("Dto")
                .should(new ArchCondition<JavaClass>("porter un nom unique dans tout le back") {
                    private Map<String, List<JavaClass>> parNom = Map.of();

                    @Override
                    public void init(Collection<JavaClass> dtos) {
                        parNom = dtos.stream().collect(groupingBy(JavaClass::getSimpleName));
                    }

                    @Override
                    public void check(JavaClass dto, ConditionEvents events) {
                        List<JavaClass> homonymes = parNom.getOrDefault(dto.getSimpleName(), List.of());
                        if (homonymes.size() > 1) {
                            String autres = homonymes.stream().filter(autre -> !autre.equals(dto))
                                    .map(JavaClass::getName).collect(joining(", "));
                            events.add(SimpleConditionEvent.violated(dto,
                                    dto.getName() + " porte le même nom que " + autres));
                        }
                    }
                })
                .allowEmptyShould(true)
                .because("AD-16 : deux DTO de même nom faussent le client généré");
    }

    private static Optional<String> raisonDeRefus(String origine, Emplacement cible) {
        if (origine.equals(COMMUN)) {
            return Optional.of("commun ne dépend d'aucun module");
        }
        if (cible.module().equals(COMMUN)) {
            return cible.couche().equals("api") || cible.couche().equals("service")
                    ? Optional.empty()
                    : Optional.of("seules les couches api et service de commun sont accessibles");
        }
        if (!GRAPHE.get(origine).contains(cible.module())) {
            return Optional.of(origine + " ne peut pas dépendre de " + cible.module() + " (graphe AD-1)");
        }
        if (!cible.couche().equals("service")) {
            return Optional.of("seule la couche service de " + cible.module() + " est accessible aux autres modules");
        }
        return Optional.empty();
    }

    /** Module et couche d'un paquetage {@code <racine>.<module>.<couche>…}, si c'est un module connu. */
    record Emplacement(String module, String couche) {

        static Optional<Emplacement> de(String racine, String paquetage) {
            if (!paquetage.startsWith(racine + ".")) {
                return Optional.empty();
            }
            String[] segments = paquetage.substring(racine.length() + 1).split("\\.");
            if (!GRAPHE.containsKey(segments[0])) {
                return Optional.empty();
            }
            return Optional.of(new Emplacement(segments[0], segments.length > 1 ? segments[1] : ""));
        }
    }
}

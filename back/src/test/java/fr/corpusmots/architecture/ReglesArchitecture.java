package fr.corpusmots.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.joining;

import com.tngtech.archunit.core.domain.Dependency;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaField;
import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.core.domain.JavaMethodCall;
import com.tngtech.archunit.core.domain.JavaModifier;
import com.tngtech.archunit.core.domain.JavaType;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Stream;

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
 *   <li>AD-16 : aucun membre public d'une classe publique d'un {@code <module>.service} ne mentionne un type d'un
 *       {@code <module>.persistance} (retour, paramètre, champ, argument générique).</li>
 *   <li>AD-17 : aucune méthode {@code @Transactional} (sur la méthode ou sa classe) n'appelle directement
 *       {@code comptes.service.Identites} ni {@code vocabulaire.service.SourceArasaac}, dont chaque méthode est un
 *       appel HTTP sortant (Keycloak, ARASAAC). Un appel dans un
 *       {@code Runnable} passé à une méthode transactionnelle n'est pas un appel direct. Limites : la règle ne voit
 *       que les appels directs ; elle ne détecte ni un lambda exécuté de façon synchrone dans la méthode
 *       transactionnelle (par exemple {@code forEach(id -> identites.desactiver(id))}), ni un appel indirect par une
 *       méthode utilitaire ou un autre bean, ni une transaction programmatique ({@code QuarkusTransaction}).</li>
 * </ul>
 */
public final class ReglesArchitecture {

    public static final String RACINE = "fr.corpusmots";

    static final String COMMUN = "commun";

    static final Set<String> COUCHES = Set.of("api", "service", "persistance");

    static final String TRANSACTIONAL = "jakarta.transaction.Transactional";

    /** Façade des appels HTTP vers Keycloak, relative à la racine (AD-6, AD-17). */
    static final String IDENTITES = "comptes.service.Identites";

    /** Source des appels HTTP vers ARASAAC, relative à la racine (AD-9, AD-17). */
    static final String SOURCE_ARASAAC = "vocabulaire.service.SourceArasaac";

    /** Types dont chaque méthode est un appel HTTP sortant, interdit dans une transaction ouverte (AD-17). */
    static final List<String> APPELS_HTTP_SORTANTS = List.of(IDENTITES, SOURCE_ARASAAC);

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

    public static ArchRule servicesSansTypeDePersistance(String racine) {
        return classes().that().resideInAPackage(racine + "..").and().arePublic()
                .should(new ArchCondition<JavaClass>(
                        "ne mentionner aucun type d'un <module>.persistance dans ses membres publics de service") {
                    @Override
                    public void check(JavaClass classe, ConditionEvents events) {
                        Optional<Emplacement> origine = Emplacement.de(racine, classe.getPackageName());
                        if (origine.isEmpty() || !origine.get().couche().equals("service")) {
                            return;
                        }
                        for (JavaMethod methode : classe.getMethods()) {
                            if (estPublic(methode.getModifiers())) {
                                signaler(classe, methode.getFullName(), Stream.concat(
                                        methode.getParameterTypes().stream(), Stream.of(methode.getReturnType()))
                                        .toList(), events);
                            }
                        }
                        classe.getConstructors().stream().filter(constructeur -> estPublic(constructeur.getModifiers()))
                                .forEach(constructeur -> signaler(classe, constructeur.getFullName(),
                                        List.copyOf(constructeur.getParameterTypes()), events));
                        for (JavaField champ : classe.getFields()) {
                            if (estPublic(champ.getModifiers())) {
                                signaler(classe, champ.getFullName(), List.of(champ.getType()), events);
                            }
                        }
                    }

                    private void signaler(JavaClass classe, String membre, List<JavaType> types,
                            ConditionEvents events) {
                        Set<String> persistance = new LinkedHashSet<>();
                        types.stream().flatMap(type -> type.getAllInvolvedRawTypes().stream())
                                .map(JavaClass::getBaseComponentType)
                                .filter(brut -> Emplacement.de(racine, brut.getPackageName())
                                        .filter(emplacement -> emplacement.couche().equals("persistance"))
                                        .isPresent())
                                .forEach(brut -> persistance.add(brut.getName()));
                        if (!persistance.isEmpty()) {
                            events.add(SimpleConditionEvent.violated(classe, classe.getName() + " : " + membre
                                    + " expose " + String.join(", ", persistance) + " (couche persistance)"));
                        }
                    }
                })
                .allowEmptyShould(true)
                .because("AD-16 : la couche service ne laisse fuir ni entité, ni Repository, ni type de persistance");
    }

    public static ArchRule aucunAppelHttpSortantEnTransaction(String racine) {
        List<String> cibles = APPELS_HTTP_SORTANTS.stream().map(type -> racine + "." + type).toList();
        return classes().that().resideInAPackage(racine + "..")
                .should(new ArchCondition<JavaClass>("n'appeler " + String.join(" ni ", APPELS_HTTP_SORTANTS)
                        + " directement depuis aucune méthode @Transactional") {
                    @Override
                    public void check(JavaClass classe, ConditionEvents events) {
                        boolean classeTransactionnelle = classe.isAnnotatedWith(TRANSACTIONAL);
                        for (JavaMethod methode : classe.getMethods()) {
                            if (!classeTransactionnelle && !methode.isAnnotatedWith(TRANSACTIONAL)) {
                                continue;
                            }
                            for (JavaMethodCall appel : methode.getMethodCallsFromSelf()) {
                                if (cibles.stream().anyMatch(cible -> appel.getTargetOwner().isAssignableTo(cible))) {
                                    events.add(SimpleConditionEvent.violated(appel, classe.getName() + " : "
                                            + appel.getDescription() + " dans une transaction ouverte"));
                                }
                            }
                        }
                    }
                })
                .because("AD-17 : aucun appel HTTP sortant (Keycloak, ARASAAC) pendant une transaction ouverte");
    }

    private static boolean estPublic(Set<JavaModifier> modificateurs) {
        return modificateurs.contains(JavaModifier.PUBLIC);
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

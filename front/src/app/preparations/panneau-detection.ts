import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Api } from '../api/api';
import { detecterMotPreparation } from '../api/fn/preparations-resource/detecter-mot-preparation';
import { DetectionImageDto } from '../api/models/detection-image-dto';
import { DetectionMotDto } from '../api/models/detection-mot-dto';
import { DetectionPreparationDto } from '../api/models/detection-preparation-dto';
import { DetectionSensDto } from '../api/models/detection-sens-dto';
import { Annuaire } from '../commun/annuaire';
import { CompteCourant } from '../commun/compte-courant';
import { CreationSens, NouveauSens } from '../commun/creation-sens/creation-sens';
import { codeErreur } from '../commun/erreurs/message-erreur';
import { SuggestionsArasaac } from './suggestions-arasaac';
import { libelleProprietaire, nomProposition, VignetteProposition } from './vignette-proposition';

/** Pause de frappe après laquelle la détection part, en millisecondes. */
export const DELAI_DETECTION_MS = 250;

/** Pause de frappe, plus longue, après laquelle les suggestions ARASAAC sont demandées, en millisecondes. */
export const DELAI_SUGGESTIONS_MS = 700;

/** Nombre de caractères à partir duquel la détection part. */
export const LONGUEUR_MIN_DETECTION = 2;

/** Message sous le champ quand la détection échoue : la saisie continue. */
export const MESSAGE_DETECTION_INDISPONIBLE =
  "La détection ne répond pas pour l'instant. Entrée ajoute toujours le mot.";

/** Image retenue dans le panneau : le Mot qu'elle illustre et l'Image. */
export interface ChoixImage {
  readonly motId: string;
  readonly forme: string;
  readonly imageId: string;
}

/**
 * Mot à ajouter avec un Sens choisi dans les puces (`sensId`) ou tapé dans la Création de Sens (`nouveauSens`) ;
 * `motId` est nul pour un Mot nouveau, que le back crée d'après `forme`.
 */
export interface AjoutAvecSens {
  readonly motId: string | null;
  readonly forme: string;
  readonly sensId?: string;
  readonly nouveauSens?: NouveauSens;
}

/** Geste du clavier transmis par le Champ de saisie rapide : ↓, ↑ ou Échap. */
export type Navigation = 'suivant' | 'precedent' | 'annuler';

let prochainNumero = 0;

type Etat =
  | { readonly nom: 'masque' }
  | { readonly nom: 'resultat'; readonly resultat: DetectionPreparationDto }
  | { readonly nom: 'erreur' };

/** « aucune image », « 1 image », « 3 images ». */
function libelleImages(nombre: number): string {
  return nombre === 0 ? 'aucune image' : `${nombre} image${nombre === 1 ? '' : 's'}`;
}

/**
 * État d'un Mot détecté, après le tiret de l'en-tête : « existe déjà · 2 images, dans 1 album » ; « déjà dans la
 * préparation · … » s'il figure déjà dans cette Préparation ; sans Album, « existe déjà · aucune image ».
 */
export function libelleEtatMot(mot: DetectionMotDto): string {
  const etat = mot.dejaDansLaPreparation ? 'déjà dans la préparation' : 'existe déjà';
  const albums =
    mot.albums.length === 0
      ? ''
      : `, dans ${mot.albums.length} album${mot.albums.length === 1 ? '' : 's'}`;
  return `${etat} · ${libelleImages(mot.images.length)}${albums}`;
}

/** Libellé d'une puce de Sens : « chute (nom) », « méchant », « à compléter ». */
export function libellePuceSens(sens: DetectionSensDto): string {
  return sens.categorie ? `${sens.libelle} (${sens.categorie})` : sens.libelle;
}

/** Ligne des Sens : « animal (nom), méchant » ; `null` s'il n'y a que « à compléter ». */
export function libelleSens(mot: DetectionMotDto): string | null {
  if (mot.sens.every((sens) => sens.aCompleter)) {
    return null;
  }
  return mot.sens.map(libellePuceSens).join(', ');
}

/**
 * Panneau de détection (story 2.7, partie 1 ; key-preparation.html › `.detect`) sous le Champ de saisie rapide. Dès
 * deux caractères et après une pause de frappe, il demande au back les Mots existants de même forme (sans casse, ni
 * accents, ni article), sans que l'enseignant valide ; une réponse dépassée par une frappe plus récente est ignorée,
 * et le panneau disparaît quand la saisie est vidée (dont après l'ajout du Mot).
 *
 * Pour chaque Mot existant et visible : le Mot en cursive, son état (« existe déjà · 2 images, dans 1 album », ou
 * « déjà dans la préparation »), ses Sens, ses Albums, puis ses Images dans l'ordre du back (jamais reclassées ici) :
 * miniature, Repères de Section, Badge de type, album d'origine et propriétaire (« vous » ou son nom dans l'Annuaire),
 * Marque « déjà utilisée », Sens si le Mot en a plusieurs. La première proposition est mise en avant. Un Mot nouveau,
 * ou sans Image, montre les suggestions ARASAAC et le Repère de qualité, une fois la frappe arrêtée depuis
 * `DELAI_SUGGESTIONS_MS` (ARASAAC n'est pas interrogé pour chaque fragment).
 *
 * Seul un résumé (l'en-tête de chaque Mot, le Sens choisi et le nombre de ses Images, ou le message d'échec) est
 * annoncé, par une région `aria-live` polie ; la liste des Images ne contient rien de focalisable : le focus reste dans
 * le champ. Un échec affiche un message court, sans bloquer la saisie.
 *
 * Retenir une Image (story 2.7, partie 2) : les Images sont les options d'une liste (`role="listbox"`, un groupe par
 * Mot, nommé par son en-tête, ses Sens et ses Albums, texte masqué dans la liste) que le Champ de saisie rapide pilote
 * en combobox ARIA 1.2 (`idListe`, `idActif`, `deplie`) ; les Mots sans Image et leurs suggestions ARASAAC restent hors
 * de la liste. Aucune n'est choisie d'emblée ; ↓ choisit la première, ↓ ↑ parcourent les Images de tous les Mots dans
 * l'ordre, sans boucler ; ↑ sur la première et Échap retirent le choix (`naviguer`), qui tombe aussi à chaque frappe et
 * à chaque nouveau résultat. Tant que la détection d'une nouvelle saisie est attendue, rien n'est proposé. La page lit
 * `choix()` à l'Entrée. Un clic sur une Image émet `retenir`, sans prendre le focus du champ.
 *
 * Sens dans la détection (story 2.8, partie 3) : un Mot à au moins deux Sens visibles montre, à la place de la ligne
 * « Sens : … », une rangée de puces à bascule (groupe « Sens de « étalé » », `aria-pressed`, coche en plus de la
 * couleur) : « Tous », choisi d'emblée, puis chaque Sens dans l'ordre du back (« à compléter » en dernier). Les puces et
 * « Nouveau sens » sont les seuls éléments focalisables (Tab depuis le champ) ; ceux d'un Mot qui propose des Images sont
 * placés avant la liste, qui ne contient que groupes et options. Choisir un Sens limite les Images de ce Mot à ce Sens,
 * dans la liste et dans ↑ ↓ (filtre de présentation, sans requête : la visibilité reste décidée par le back), fait tomber
 * le choix d'Image et rend le focus au champ (`focusChamp`) ; un seul Sens choisi à la fois, tous Mots confondus, et le
 * choix tombe à chaque frappe et à chaque nouveau résultat. La page lit `choixSens()` à l'Entrée sans Image choisie.
 * « Nouveau sens », un par Mot existant et un pour un Mot nouveau, déplie la Création de Sens (catégorie préremplie avec
 * celle du Sens choisi, sinon du premier Sens visible) ; « Créer le sens » appelle `envoyerNouveauSens`, fourni par la
 * page, qui ajoute le Mot avec ce Sens ; Échap replie et rend le focus au champ.
 */
@Component({
  selector: 'app-panneau-detection',
  imports: [CreationSens, MatIconModule, NgTemplateOutlet, SuggestionsArasaac, VignetteProposition],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './panneau-detection.scss',
  template: `
    <!-- Seul ce résumé est annoncé : les vignettes ne sont pas relues à chaque frappe. -->
    <div class="cm-visuellement-masque detection__annonce" aria-live="polite">{{ annonce() }}</div>
    @switch (etat().nom) {
      @case ('resultat') {
        @if (resultat(); as resultat) {
          <div class="detection">
            @if (motsIllustres().length > 0) {
              <p class="detection__ligne">Images de votre section en premier.</p>
              <!-- Puces et « Nouveau sens » hors de la liste : elle ne contient que groupes et options. -->
              @for (mot of motsIllustres(); track mot.motId) {
                <div class="detection__sens">
                  <ng-container
                    *ngTemplateOutlet="sensDuMot; context: { $implicit: mot, nomme: true }"
                  />
                  @if (imagesDe(mot).length === 0) {
                    <p class="detection__ligne">Aucune image pour ce sens.</p>
                  }
                </div>
              }
              <!-- Dans la liste, seuls groupes et options sont exposés : le texte de chaque Mot devient le nom du groupe. -->
              <div
                class="detection__liste"
                [id]="idListe"
                [attr.role]="deplie() ? 'listbox' : null"
                [attr.aria-label]="deplie() ? 'Images proposées' : null"
              >
                @for (mot of motsIllustres(); track mot.motId) {
                  <section
                    class="detection__bloc"
                    [attr.role]="deplie() ? 'group' : null"
                    [attr.aria-label]="deplie() ? nomGroupe(mot) : null"
                  >
                    <div class="detection__textes" [attr.aria-hidden]="deplie() ? 'true' : null">
                      <p class="detection__entete">
                        <span class="detection__mot">{{ mot.forme }}</span
                        >&ngsp;
                        <span>— {{ etatMot(mot) }}</span>
                      </p>
                      @if (!aDesPuces(mot) && sensMot(mot); as sens) {
                        <p class="detection__ligne">Sens : {{ sens }}</p>
                      }
                      @if (mot.albums.length > 0) {
                        <p class="detection__ligne">Albums : {{ titresAlbums(mot) }}</p>
                      }
                    </div>
                    <ul class="detection__images" role="presentation">
                      @for (image of imagesDe(mot); track image.id) {
                        <li
                          [id]="idOption(image.id)"
                          [attr.role]="deplie() ? 'option' : null"
                          [attr.aria-selected]="deplie() ? image.id === imageChoisie() : null"
                          [attr.aria-label]="nomOption(mot, image)"
                          [class.vignette--premiere]="
                            imageChoisie() === null && image.id === premiereImageId()
                          "
                          (mousedown)="$event.preventDefault()"
                          (click)="retenirParClic(mot, image)"
                          appVignetteProposition
                          [image]="image"
                          [forme]="mot.forme"
                          [afficherSens]="mot.sens.length > 1"
                          [choisie]="image.id === imageChoisie()"
                        ></li>
                      }
                    </ul>
                  </section>
                }
              </div>
            }
            @for (mot of motsSansImage(); track mot.motId) {
              <section class="detection__bloc">
                <p class="detection__entete">
                  <span class="detection__mot">{{ mot.forme }}</span
                  >&ngsp;
                  <span>— {{ etatMot(mot) }}</span>
                </p>
                @if (!aDesPuces(mot) && sensMot(mot); as sens) {
                  <p class="detection__ligne">Sens : {{ sens }}</p>
                }
                @if (mot.albums.length > 0) {
                  <p class="detection__ligne">Albums : {{ titresAlbums(mot) }}</p>
                }
                <ng-container
                  *ngTemplateOutlet="sensDuMot; context: { $implicit: mot, nomme: false }"
                />
                @if (suggestionsPermises()) {
                  <app-suggestions-arasaac [mot]="mot.forme" />
                }
              </section>
            }
            @if (resultat.mots.length === 0) {
              <section class="detection__bloc">
                <p class="detection__entete">
                  <span class="detection__mot">{{ resultat.forme }}</span
                  >&ngsp;
                  <span>— nouveau mot</span>
                </p>
                <app-creation-sens
                  class="detection__creation-sens"
                  [focusAuRepli]="false"
                  [envoyer]="envoyeur(null, resultat.forme)"
                  (repliee)="focusChamp.emit()"
                />
                @if (suggestionsPermises()) {
                  <app-suggestions-arasaac [mot]="resultat.forme" />
                }
              </section>
            }
          </div>
        }
      }
      @case ('erreur') {
        <p class="detection__erreur">{{ messageIndisponible }}</p>
      }
    }
    <!-- Puces de Sens (Mot à au moins deux Sens visibles) et « Nouveau sens » d'un Mot existant. -->
    <ng-template #sensDuMot let-mot let-nomme="nomme">
      @if (aDesPuces(mot)) {
        <div class="detection__puces" role="group" [attr.aria-label]="nomPuces(mot)">
          @if (nomme) {
            <span class="detection__ligne" aria-hidden="true">{{ nomPuces(mot) }} :</span>
          }
          <button
            type="button"
            class="detection__puce"
            [class.detection__puce--choisie]="sensChoisiDe(mot) === null"
            [attr.aria-pressed]="sensChoisiDe(mot) === null"
            (click)="choisirSens(mot, null)"
          >
            @if (sensChoisiDe(mot) === null) {
              <mat-icon class="detection__coche" svgIcon="coche" aria-hidden="true" />
            }
            Tous
          </button>
          @for (sens of sensDe(mot); track sens.id) {
            <button
              type="button"
              class="detection__puce"
              [class.detection__puce--choisie]="sensChoisiDe(mot) === sens.id"
              [attr.aria-pressed]="sensChoisiDe(mot) === sens.id"
              (click)="choisirSens(mot, sens.id)"
            >
              @if (sensChoisiDe(mot) === sens.id) {
                <mat-icon class="detection__coche" svgIcon="coche" aria-hidden="true" />
              }
              {{ libellePuce(sens) }}
            </button>
          }
        </div>
      }
      <app-creation-sens
        class="detection__creation-sens"
        [categorieInitiale]="categorieInitiale(mot)"
        [focusAuRepli]="false"
        [envoyer]="envoyeur(mot.motId, mot.forme)"
        (repliee)="focusChamp.emit()"
      />
    </ng-template>
  `,
})
export class PanneauDetection {
  /** Préparation de l'enseignant où la saisie a lieu. */
  readonly preparationId = input.required<string>();
  /** Saisie en cours du Champ de saisie rapide. */
  readonly saisie = input('');

  /**
   * Ajoute le Mot avec le Sens tapé dans la Création de Sens (même file que les autres ajouts) ; rejette en cas de
   * refus, que la Création de Sens affiche.
   */
  readonly envoyerNouveauSens = input<((ajout: AjoutAvecSens) => Promise<void>) | null>(null);

  /** Image retenue d'un clic : la page l'ajoute aussitôt. */
  readonly retenir = output<ChoixImage>();
  /** Le focus revient au Champ de saisie rapide (Sens choisi, Création de Sens repliée). */
  readonly focusChamp = output<void>();

  private readonly api = inject(Api);
  private readonly annuaire = inject(Annuaire);
  private readonly compteCourant = inject(CompteCourant);

  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly numero = prochainNumero++;

  /** Identifiant de la liste des Images, cible de `aria-controls` du Champ de saisie rapide. */
  readonly idListe = `panneau-detection-${this.numero}`;

  protected readonly messageIndisponible = MESSAGE_DETECTION_INDISPONIBLE;
  protected readonly etat = signal<Etat>({ nom: 'masque' });

  protected readonly resultat = computed(() => {
    const etat = this.etat();
    return etat.nom === 'resultat' ? etat.resultat : null;
  });

  /** Mots du résultat qui proposent des Images (dans la liste), puis ceux qui n'en ont pas (hors de la liste). */
  protected readonly motsIllustres = computed(() =>
    (this.resultat()?.mots ?? []).filter((mot) => mot.images.length > 0),
  );
  protected readonly motsSansImage = computed(() =>
    (this.resultat()?.mots ?? []).filter((mot) => mot.images.length === 0),
  );

  /** Saisie dont le résultat est affiché : une autre saisie attend sa détection. */
  private readonly saisieDuResultat = signal<string | null>(null);

  /**
   * Images proposées, de tous les Mots, dans l'ordre affiché : celui que ↓ et ↑ parcourent. Aucune tant qu'une détection
   * est attendue pour une saisie différente du résultat affiché : Entrée ne retiendrait pas l'Image d'un autre Mot.
   */
  private readonly options = computed<readonly ChoixImage[]>(() =>
    this.saisie().trim() !== this.saisieDuResultat()
      ? []
      : this.motsIllustres().flatMap((mot) =>
          this.imagesDe(mot).map((image) => ({
            motId: mot.motId,
            forme: mot.forme,
            imageId: image.id,
          })),
        ),
  );

  /** Sens choisi dans les puces d'un Mot, `null` pour « Tous » partout ; un seul à la fois. */
  private readonly sensChoisi = signal<{ readonly motId: string; readonly sensId: string } | null>(
    null,
  );

  /**
   * Mot dont un Sens est choisi, avec ce Sens ; `null` si « Tous » partout, ou si une détection est attendue pour une
   * autre saisie. Entrée sans Image choisie ajoute alors ce Mot avec ce Sens.
   */
  readonly choixSens = computed<AjoutAvecSens | null>(() => {
    const choisi = this.sensChoisi();
    if (choisi === null || this.saisie().trim() !== this.saisieDuResultat()) {
      return null;
    }
    const mot = this.resultat()?.mots.find((autre) => autre.motId === choisi.motId);
    return mot === undefined || !mot.sens.some((sens) => sens.id === choisi.sensId)
      ? null
      : { motId: mot.motId, forme: mot.forme, sensId: choisi.sensId };
  });

  /** Vrai quand le panneau propose au moins une Image (`aria-expanded` du champ). */
  readonly deplie = computed(() => this.options().length > 0);

  /** Image choisie au clavier, `null` si aucune. */
  protected readonly imageChoisie = signal<string | null>(null);

  /** Image choisie, avec son Mot ; `null` si aucune : Entrée ajoute alors le Mot « à illustrer ». */
  readonly choix = computed(
    () => this.options().find((option) => option.imageId === this.imageChoisie()) ?? null,
  );

  /** Identifiant de l'option choisie, cible de `aria-activedescendant` du champ. */
  readonly idActif = computed(() => {
    const choix = this.choix();
    return choix === null ? null : this.idOption(choix.imageId);
  });

  /** Première proposition, mise en avant : la première Image du premier Mot qui en a. */
  protected readonly premiereImageId = computed(
    () => this.motsIllustres().flatMap((mot) => this.imagesDe(mot))[0]?.id ?? null,
  );

  /** Créations de Sens affichées, une par Mot. */
  private readonly creations = viewChildren(CreationSens);

  /** Fonctions d'envoi de la Création de Sens, une par Mot : la même à chaque rendu. */
  private readonly envoyeurs = new Map<string, (sens: NouveauSens) => Promise<void>>();

  /**
   * Vrai quand la saisie n'a pas changé depuis `DELAI_SUGGESTIONS_MS` : ARASAAC n'est interrogé que pour un mot dont la
   * frappe s'est arrêtée, jamais pour chaque fragment (« fa », « far »…).
   */
  protected readonly suggestionsPermises = signal(false);

  /** Résumé annoncé aux lecteurs d'écran : l'en-tête de chaque Mot, ou le message d'échec. */
  protected readonly annonce = computed(() => {
    const etat = this.etat();
    if (etat.nom === 'erreur') {
      return MESSAGE_DETECTION_INDISPONIBLE;
    }
    if (etat.nom === 'masque') {
      return '';
    }
    const { forme, mots } = etat.resultat;
    // Sens choisi dans les puces : la liste réduite est annoncée.
    const choisi = this.sensChoisi();
    const motChoisi = choisi === null ? undefined : mots.find((mot) => mot.motId === choisi.motId);
    const sensChoisi = motChoisi?.sens.find((sens) => sens.id === choisi?.sensId);
    if (motChoisi !== undefined && sensChoisi !== undefined) {
      const nombre = this.imagesDe(motChoisi).length;
      return nombre === 0
        ? 'Aucune image pour ce sens.'
        : `${motChoisi.forme}, ${libellePuceSens(sensChoisi)} : ${libelleImages(nombre)}.`;
    }
    return mots.length === 0
      ? `${forme} — nouveau mot`
      : mots.map((mot) => `${mot.forme} — ${libelleEtatMot(mot)}`).join(' ; ');
  });

  /** Numéro de la dernière frappe : une réponse d'une frappe plus ancienne est ignorée. */
  private derniereFrappe = 0;

  constructor() {
    effect((nettoyer) => {
      const saisie = this.saisie().trim();
      const preparationId = this.preparationId();
      const numero = ++this.derniereFrappe;
      untracked(() => {
        this.suggestionsPermises.set(false);
        this.imageChoisie.set(null);
        this.sensChoisi.set(null);
        this.reinitialiserCreations();
      });
      if (saisie.length < LONGUEUR_MIN_DETECTION) {
        untracked(() => this.etat.set({ nom: 'masque' }));
        return;
      }
      const minuteur = setTimeout(
        () => void this.detecter(preparationId, saisie, numero),
        DELAI_DETECTION_MS,
      );
      const minuteurSuggestions = setTimeout(
        () => this.suggestionsPermises.set(true),
        DELAI_SUGGESTIONS_MS,
      );
      nettoyer(() => {
        clearTimeout(minuteur);
        clearTimeout(minuteurSuggestions);
      });
    });
    // L'option choisie reste visible quand la liste défile.
    afterRenderEffect(() => {
      const id = this.idActif();
      if (id !== null) {
        this.hote.nativeElement.querySelector(`#${id}`)?.scrollIntoView?.({ block: 'nearest' });
      }
    });
  }

  /** ↓ choisit l'Image suivante (la première sans choix), sans boucler ; ↑ la précédente ou aucune ; Échap aucune. */
  naviguer(navigation: Navigation): void {
    const options = this.options();
    const index = options.findIndex((option) => option.imageId === this.imageChoisie());
    if (navigation === 'annuler' || (navigation === 'precedent' && index <= 0)) {
      this.imageChoisie.set(null);
    } else if (navigation === 'precedent') {
      this.imageChoisie.set(options[index - 1].imageId);
    } else if (options.length > 0) {
      this.imageChoisie.set(options[Math.min(index + 1, options.length - 1)].imageId);
    }
  }

  /**
   * Replie et vide toute Création de Sens ouverte (nouvelle frappe, nouveau résultat) : un libellé tapé pour une autre
   * saisie n'est jamais envoyé pour la nouvelle.
   */
  private reinitialiserCreations(): void {
    for (const creation of this.creations()) {
      creation.reinitialiser();
    }
  }

  /** Images du Mot montrées et parcourues : celles du Sens choisi pour lui, sinon toutes. */
  protected imagesDe(mot: DetectionMotDto): readonly DetectionImageDto[] {
    const sensId = this.sensChoisiDe(mot);
    return sensId === null ? mot.images : mot.images.filter((image) => image.sens.id === sensId);
  }

  /** Sens choisi pour ce Mot, `null` pour « Tous ». */
  protected sensChoisiDe(mot: DetectionMotDto): string | null {
    const choisi = this.sensChoisi();
    return choisi !== null && choisi.motId === mot.motId ? choisi.sensId : null;
  }

  /** Vrai pour un Mot à au moins deux Sens visibles : ses Sens sont des puces. */
  protected aDesPuces(mot: DetectionMotDto): boolean {
    return mot.sens.length >= 2;
  }

  protected sensDe(mot: DetectionMotDto): readonly DetectionSensDto[] {
    return mot.sens;
  }

  protected nomPuces(mot: DetectionMotDto): string {
    return `Sens de « ${mot.forme} »`;
  }

  protected libellePuce(sens: DetectionSensDto): string {
    return libellePuceSens(sens);
  }

  /** Puce choisie (clic, ou Espace ou Entrée après Tab) : le choix d'Image tombe, le focus revient au champ. */
  protected choisirSens(mot: DetectionMotDto, sensId: string | null): void {
    this.sensChoisi.set(sensId === null ? null : { motId: mot.motId, sensId });
    this.imageChoisie.set(null);
    this.focusChamp.emit();
  }

  /** Catégorie préremplie de la Création de Sens : celle du Sens choisi, sinon du premier Sens visible. */
  protected categorieInitiale(mot: DetectionMotDto): string | null {
    const sensId = this.sensChoisiDe(mot);
    const sens = mot.sens.find((autre) => autre.id === sensId) ?? mot.sens[0];
    return sens?.categorie ?? null;
  }

  /** Fonction d'envoi de la Création de Sens d'un Mot existant (`motId`) ou nouveau (`null`). */
  protected envoyeur(motId: string | null, forme: string): (sens: NouveauSens) => Promise<void> {
    const cle = motId ?? `nouveau:${forme}`;
    let envoyeur = this.envoyeurs.get(cle);
    if (envoyeur === undefined) {
      envoyeur = (nouveauSens) => {
        const envoyer = this.envoyerNouveauSens();
        return envoyer === null
          ? Promise.reject(new Error('Ajout avec un nouveau sens indisponible'))
          : envoyer({ motId, forme, nouveauSens });
      };
      this.envoyeurs.set(cle, envoyeur);
    }
    return envoyeur;
  }

  protected retenirParClic(mot: DetectionMotDto, image: DetectionImageDto): void {
    this.imageChoisie.set(image.id);
    this.retenir.emit({ motId: mot.motId, forme: mot.forme, imageId: image.id });
  }

  /** Nom d'un groupe de la liste : le texte du Mot, masqué dans la liste. */
  protected nomGroupe(mot: DetectionMotDto): string {
    const sens = libelleSens(mot);
    return [
      `${mot.forme} — ${libelleEtatMot(mot)}.`,
      sens === null ? null : `Sens : ${sens}.`,
      mot.albums.length === 0 ? null : `Albums : ${this.titresAlbums(mot)}.`,
    ]
      .filter((partie) => partie !== null)
      .join(' ');
  }

  protected idOption(imageId: string): string {
    return `${this.idListe}-image-${imageId}`;
  }

  /** Nom accessible d'une Image proposée (`nomProposition`). */
  protected nomOption(mot: DetectionMotDto, image: DetectionImageDto): string {
    return nomProposition(
      mot.forme,
      image,
      libelleProprietaire(image.proprietaireId, this.compteCourant, this.annuaire),
    );
  }

  protected etatMot(mot: DetectionMotDto): string {
    return libelleEtatMot(mot);
  }

  protected sensMot(mot: DetectionMotDto): string | null {
    return libelleSens(mot);
  }

  protected titresAlbums(mot: DetectionMotDto): string {
    return mot.albums.map((album) => album.titre).join(', ');
  }

  private async detecter(preparationId: string, saisie: string, numero: number): Promise<void> {
    try {
      const resultat = await this.api.invoke(detecterMotPreparation, { id: preparationId, saisie });
      if (numero === this.derniereFrappe) {
        this.imageChoisie.set(null);
        this.sensChoisi.set(null);
        this.reinitialiserCreations();
        this.envoyeurs.clear();
        this.saisieDuResultat.set(saisie);
        this.etat.set({ nom: 'resultat', resultat });
        const moi = this.compteCourant.compte()?.id;
        if (resultat.mots.some((mot) => mot.images.some((image) => image.proprietaireId !== moi))) {
          // L'Annuaire n'est lu qu'à la première Image d'un collègue.
          void this.annuaire.charger();
        }
      }
    } catch (erreur) {
      if (numero !== this.derniereFrappe) {
        return;
      }
      // Une saisie que le back juge trop courte une fois normalisée (« l'a ») ne montre rien.
      this.etat.set(
        codeErreur(erreur) === 'requete.invalide' ? { nom: 'masque' } : { nom: 'erreur' },
      );
    }
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Api } from '../api/api';
import { fichierImage } from '../api/fn/images-resource/fichier-image';
import { detecterMotPreparation } from '../api/fn/preparations-resource/detecter-mot-preparation';
import { DetectionImageDto } from '../api/models/detection-image-dto';
import { DetectionMotDto } from '../api/models/detection-mot-dto';
import { DetectionPreparationDto } from '../api/models/detection-preparation-dto';
import { Annuaire } from '../commun/annuaire';
import { BadgeTypeImage } from '../commun/badge-type-image/badge-type-image';
import { CHAMP_VIDE, PROPRIETAIRE_INCONNU } from '../commun/carte-identite/carte-identite';
import { CompteCourant } from '../commun/compte-courant';
import { codeErreur } from '../commun/erreurs/message-erreur';
import { ChargementImage, ImageSecurisee } from '../commun/image-securisee/image-securisee';
import { RepereSection } from '../commun/repere-section/repere-section';
import { SuggestionsArasaac } from './suggestions-arasaac';

/** Pause de frappe après laquelle la détection part, en millisecondes. */
export const DELAI_DETECTION_MS = 250;

/** Pause de frappe, plus longue, après laquelle les suggestions ARASAAC sont demandées, en millisecondes. */
export const DELAI_SUGGESTIONS_MS = 700;

/** Nombre de caractères à partir duquel la détection part. */
export const LONGUEUR_MIN_DETECTION = 2;

/** Message sous le champ quand la détection échoue : la saisie continue. */
export const MESSAGE_DETECTION_INDISPONIBLE =
  "La détection ne répond pas pour l'instant. Entrée ajoute toujours le mot.";

type Etat =
  | { readonly nom: 'masque' }
  | { readonly nom: 'resultat'; readonly resultat: DetectionPreparationDto }
  | { readonly nom: 'erreur' };

/** Vignette affichée : l'Image et le chargement de sa miniature, d'identité stable pour `image-securisee`. */
interface Vignette {
  readonly image: DetectionImageDto;
  readonly charger: ChargementImage;
}

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

/** Ligne des Sens : « animal (nom), méchant » ; `null` s'il n'y a que « à compléter ». */
export function libelleSens(mot: DetectionMotDto): string | null {
  if (mot.sens.every((sens) => sens.aCompleter)) {
    return null;
  }
  return mot.sens
    .map((sens) => (sens.categorie ? `${sens.libelle} (${sens.categorie})` : sens.libelle))
    .join(', ');
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
 * Seul un résumé (l'en-tête de chaque Mot, ou le message d'échec) est annoncé, par une région `aria-live` polie ;
 * le panneau ne contient rien de focalisable : le focus reste dans le champ. Les
 * Images ne sont pas encore cliquables (partie 2). Un échec affiche un message court, sans bloquer la saisie.
 */
@Component({
  selector: 'app-panneau-detection',
  imports: [BadgeTypeImage, ImageSecurisee, MatIconModule, RepereSection, SuggestionsArasaac],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './panneau-detection.scss',
  template: `
    <!-- Seul ce résumé est annoncé : les vignettes ne sont pas relues à chaque frappe. -->
    <div class="cm-visuellement-masque detection__annonce" aria-live="polite">{{ annonce() }}</div>
    @switch (etat().nom) {
      @case ('resultat') {
        @if (resultat(); as resultat) {
          <div class="detection">
            @for (mot of resultat.mots; track mot.motId) {
              <section class="detection__bloc">
                <p class="detection__entete">
                  <span class="detection__mot">{{ mot.forme }}</span
                  >&ngsp;
                  <span>— {{ etatMot(mot) }}</span>
                </p>
                @if (sensMot(mot); as sens) {
                  <p class="detection__ligne">Sens : {{ sens }}</p>
                }
                @if (mot.albums.length > 0) {
                  <p class="detection__ligne">Albums : {{ titresAlbums(mot) }}</p>
                }
                @if (mot.images.length > 0) {
                  <p class="detection__ligne">Images de votre section en premier.</p>
                  <ul class="detection__images">
                    @for (vignette of vignettes(mot); track vignette.image.id) {
                      <li
                        class="vignette"
                        [class.vignette--premiere]="vignette.image.id === premiereImageId()"
                      >
                        <span class="vignette__photo">
                          @if (echecs().has(vignette.image.id)) {
                            <mat-icon class="vignette__repli" svgIcon="image" aria-hidden="true" />
                          } @else {
                            <img
                              class="vignette__image"
                              [appImageSecurisee]="vignette.charger"
                              [alt]="mot.forme + ', ' + vignette.image.sens.libelle"
                              (echec)="signalerEchec(vignette.image.id)"
                            />
                          }
                        </span>
                        <span class="vignette__infos">
                          <span class="vignette__rangee">
                            @for (section of vignette.image.sections; track section) {
                              <app-repere-section [section]="section" />
                            }
                            <app-badge-type-image [type]="vignette.image.typeImage" />
                          </span>
                          <span class="vignette__origine">
                            @if (vignette.image.albumOrigine) {
                              <mat-icon svgIcon="livre" aria-hidden="true" />
                            }
                            {{ origine(vignette.image) }}
                          </span>
                          @if (vignette.image.dejaUtilisee || mot.sens.length > 1) {
                            <span class="vignette__rangee">
                              @if (vignette.image.dejaUtilisee) {
                                <span class="vignette__marque">
                                  <mat-icon svgIcon="historique" aria-hidden="true" />
                                  déjà utilisée
                                </span>
                              }
                              @if (mot.sens.length > 1) {
                                <span class="vignette__sens">{{
                                  vignette.image.sens.libelle
                                }}</span>
                              }
                            </span>
                          }
                        </span>
                      </li>
                    }
                  </ul>
                } @else if (suggestionsPermises()) {
                  <app-suggestions-arasaac [mot]="mot.forme" />
                }
              </section>
            } @empty {
              <section class="detection__bloc">
                <p class="detection__entete">
                  <span class="detection__mot">{{ resultat.forme }}</span
                  >&ngsp;
                  <span>— nouveau mot</span>
                </p>
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
  `,
})
export class PanneauDetection {
  /** Préparation de l'enseignant où la saisie a lieu. */
  readonly preparationId = input.required<string>();
  /** Saisie en cours du Champ de saisie rapide. */
  readonly saisie = input('');

  private readonly api = inject(Api);
  private readonly annuaire = inject(Annuaire);
  private readonly compteCourant = inject(CompteCourant);

  protected readonly messageIndisponible = MESSAGE_DETECTION_INDISPONIBLE;
  protected readonly etat = signal<Etat>({ nom: 'masque' });
  /** Images dont la miniature n'a pas pu être chargée : l'icône d'image la remplace. */
  protected readonly echecs = signal<ReadonlySet<string>>(new Set());

  protected readonly resultat = computed(() => {
    const etat = this.etat();
    return etat.nom === 'resultat' ? etat.resultat : null;
  });

  /** Vignettes de chaque Mot du résultat affiché, avec un chargement stable par Image. */
  private readonly vignettesParMot = computed(() => {
    const parMot = new Map<string, readonly Vignette[]>();
    for (const mot of this.resultat()?.mots ?? []) {
      parMot.set(
        mot.motId,
        mot.images.map((image) => ({
          image,
          charger: () => this.api.invoke(fichierImage, { id: image.id, taille: 'miniature' }),
        })),
      );
    }
    return parMot;
  });

  /** Première proposition, mise en avant : la première Image du premier Mot qui en a. */
  protected readonly premiereImageId = computed(
    () => this.resultat()?.mots.find((mot) => mot.images.length > 0)?.images[0]?.id ?? null,
  );

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
      untracked(() => this.suggestionsPermises.set(false));
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

  protected vignettes(mot: DetectionMotDto): readonly Vignette[] {
    return this.vignettesParMot().get(mot.motId) ?? [];
  }

  /** « La petite poule rousse · vous », ou le seul propriétaire sans album d'origine. */
  protected origine(image: DetectionImageDto): string {
    const proprietaire = this.proprietaire(image.proprietaireId);
    return image.albumOrigine ? `${image.albumOrigine.titre} · ${proprietaire}` : proprietaire;
  }

  protected signalerEchec(imageId: string): void {
    this.echecs.update((echecs) => new Set(echecs).add(imageId));
  }

  /** « vous » pour l'enseignant connecté, sinon son nom dans l'Annuaire. */
  private proprietaire(id: string): string {
    if (this.compteCourant.compte()?.id === id) {
      return 'vous';
    }
    const nom = this.annuaire.enseignant(id)?.nomAffiche;
    if (nom) {
      return nom;
    }
    return this.annuaire.etat().statut === 'charge' ? PROPRIETAIRE_INCONNU : CHAMP_VIDE;
  }

  private async detecter(preparationId: string, saisie: string, numero: number): Promise<void> {
    try {
      const resultat = await this.api.invoke(detecterMotPreparation, { id: preparationId, saisie });
      if (numero === this.derniereFrappe) {
        this.echecs.set(new Set());
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

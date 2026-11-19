import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Api } from '../api/api';
import { fichierImage } from '../api/fn/images-resource/fichier-image';
import { DetectionImageDto } from '../api/models/detection-image-dto';
import { Annuaire } from '../commun/annuaire';
import { BadgeTypeImage } from '../commun/badge-type-image/badge-type-image';
import { CHAMP_VIDE, PROPRIETAIRE_INCONNU } from '../commun/carte-identite/carte-identite';
import { CompteCourant } from '../commun/compte-courant';
import { ChargementImage, ImageSecurisee } from '../commun/image-securisee/image-securisee';
import { LIBELLES_TYPE_IMAGE } from '../commun/libelles-images';
import { LIBELLES_SECTION, RepereSection } from '../commun/repere-section/repere-section';

/** « vous » pour l'enseignant connecté, sinon son nom dans l'Annuaire (« — » tant qu'il n'est pas chargé). */
export function libelleProprietaire(
  id: string,
  compteCourant: CompteCourant,
  annuaire: Annuaire,
): string {
  if (compteCourant.compte()?.id === id) {
    return 'vous';
  }
  const nom = annuaire.enseignant(id)?.nomAffiche;
  if (nom) {
    return nom;
  }
  return annuaire.etat().statut === 'charge' ? PROPRIETAIRE_INCONNU : CHAMP_VIDE;
}

/**
 * Nom accessible d'une Image proposée : Mot, Sens, propriétaire, puis ce que la vignette montre (« actuelle »,
 * « déjà utilisée », Sections, type, album d'origine).
 */
export function nomProposition(
  forme: string,
  image: DetectionImageDto,
  proprietaire: string,
  actuelle = false,
): string {
  const sens = image.sens.categorie
    ? `${image.sens.libelle} (${image.sens.categorie})`
    : image.sens.libelle;
  return [
    forme,
    sens,
    proprietaire,
    actuelle ? 'actuelle' : null,
    image.dejaUtilisee ? 'déjà utilisée' : null,
    image.sections.map((section) => LIBELLES_SECTION[section]).join(' ') || null,
    LIBELLES_TYPE_IMAGE[image.typeImage],
    image.albumOrigine ? `album ${image.albumOrigine.titre}` : null,
  ]
    .filter((partie) => partie !== null)
    .join(', ');
}

/**
 * Vignette d'une Image proposée (key-preparation.html › `.choice`, `.used`), partagée par le Panneau de détection
 * (story 2.7, partie 2) et le Panneau de choix d'Image (partie 3) ; posée sur l'élément option de leur liste, qui en
 * porte le rôle, l'identifiant, le nom accessible (`nomProposition`) et les gestes. Elle montre la miniature (chargée
 * en `blob`, `?taille=miniature` ; l'icône d'image si elle ne se charge pas), les Repères de Section, le Badge de type,
 * l'album d'origine et le propriétaire, la Marque « déjà utilisée », le Sens si le Mot en a plusieurs, et « actuelle »
 * pour l'Image déjà liée. Choisie, elle porte une coche en plus de l'anneau (jamais la couleur seule) ; la classe
 * `vignette--premiere`, posée par l'hôte, met en avant la première proposition.
 */
@Component({
  selector: '[appVignetteProposition]',
  imports: [BadgeTypeImage, ImageSecurisee, MatIconModule, RepereSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './vignette-proposition.scss',
  host: {
    class: 'vignette',
    '[class.vignette--choisie]': 'choisie()',
  },
  template: `
    @if (choisie()) {
      <span class="vignette__coche" aria-hidden="true">
        <mat-icon svgIcon="coche" />
      </span>
    }
    <span class="vignette__photo">
      @if (echec()) {
        <mat-icon class="vignette__repli" svgIcon="image" aria-hidden="true" />
      } @else {
        <img
          class="vignette__image"
          [appImageSecurisee]="charger()"
          [alt]="forme() + ', ' + image().sens.libelle"
          (echec)="echec.set(true)"
        />
      }
    </span>
    <span class="vignette__infos">
      <span class="vignette__rangee">
        @for (section of image().sections; track section) {
          <app-repere-section [section]="section" />
        }
        <app-badge-type-image [type]="image().typeImage" />
      </span>
      <span class="vignette__origine">
        @if (image().albumOrigine) {
          <mat-icon svgIcon="livre" aria-hidden="true" />
        }
        {{ origine() }}
      </span>
      @if (actuelle() || image().dejaUtilisee || afficherSens()) {
        <span class="vignette__rangee">
          @if (actuelle()) {
            <span class="vignette__actuelle">actuelle</span>
          }
          @if (image().dejaUtilisee) {
            <span class="vignette__marque">
              <mat-icon svgIcon="historique" aria-hidden="true" />
              déjà utilisée
            </span>
          }
          @if (afficherSens()) {
            <span class="vignette__sens">{{ image().sens.libelle }}</span>
          }
        </span>
      }
    </span>
  `,
})
export class VignetteProposition {
  readonly image = input.required<DetectionImageDto>();
  /** Forme du Mot illustré, pour l'alternative « Mot, Sens ». */
  readonly forme = input.required<string>();
  /** Vrai si le Mot a plusieurs Sens : le Sens de l'Image est affiché. */
  readonly afficherSens = input(false);
  readonly choisie = input(false);
  /** Vrai pour l'Image déjà liée au Mot (Panneau de choix d'Image). */
  readonly actuelle = input(false);

  private readonly api = inject(Api);
  private readonly annuaire = inject(Annuaire);
  private readonly compteCourant = inject(CompteCourant);

  private readonly imageId = computed(() => this.image().id);
  /** Chargement de la miniature, d'identité stable tant que l'Image ne change pas. */
  protected readonly charger = computed<ChargementImage>(() => {
    const id = this.imageId();
    return () => this.api.invoke(fichierImage, { id, taille: 'miniature' });
  });
  /** Vrai si la miniature n'a pas pu être chargée ; revient à faux quand l'Image change. */
  protected readonly echec = linkedSignal({ source: this.imageId, computation: () => false });

  /** « La petite poule rousse · vous », ou le seul propriétaire sans album d'origine. */
  protected readonly origine = computed(() => {
    const image = this.image();
    const proprietaire = libelleProprietaire(
      image.proprietaireId,
      this.compteCourant,
      this.annuaire,
    );
    return image.albumOrigine ? `${image.albumOrigine.titre} · ${proprietaire}` : proprietaire;
  });
}

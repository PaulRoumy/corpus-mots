import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { Api } from '../api/api';
import { televerserImageMotPreparation } from '../api/fn/preparations-resource/televerser-image-mot-preparation';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';
import { TeleversementImageMotPreparationDto } from '../api/models/televersement-image-mot-preparation-dto';
import {
  LIBELLES_TYPE_IMAGE,
  TYPES_IMAGE,
  TypeImage,
} from '../commun/badge-type-image/badge-type-image';
import { BandeauErreur } from '../commun/bandeau-erreur/bandeau-erreur';
import { codeErreur, messageErreur } from '../commun/erreurs/message-erreur';

/** Licence du Sélecteur de licence (image libre, type inconnu), énumération du client généré. */
export type LicenceChoisie = NonNullable<TeleversementImageMotPreparationDto['licence']>;

/** Les six licences du Sélecteur de licence, dans l'ordre d'EXPERIENCE.md, avec leur libellé. */
export const LICENCES_CHOISIES: readonly {
  readonly valeur: LicenceChoisie;
  readonly libelle: string;
  readonly partageable: boolean;
}[] = [
  { valeur: 'arasaac_cc_by_nc_sa', libelle: 'ARASAAC (CC BY-NC-SA)', partageable: true },
  { valeur: 'sclera_cc_by_nc', libelle: 'Sclera (CC BY-NC)', partageable: true },
  { valeur: 'mulberry_cc_by_sa', libelle: 'Mulberry (CC BY-SA)', partageable: true },
  { valeur: 'cc0_domaine_public', libelle: 'domaine public / CC0', partageable: true },
  { valeur: 'pixabay', libelle: 'Pixabay', partageable: false },
  { valeur: 'autre_inconnue', libelle: 'autre / inconnue', partageable: false },
];

/** Licence posée d'office pour une photo personnelle et une image d'album (AD-4). */
export const LICENCES_IMPOSEES: Readonly<Partial<Record<TypeImage, string>>> = {
  photo_personnelle: "droits d'auteur de l'enseignant",
  image_album: "usage pédagogique de l'album",
};

/** Taille maximale d'un fichier téléversé : 20 Mo, comme `corpusmots.limites.taille-fichier` du back. */
export const TAILLE_MAX_FICHIER = 20 * 1024 * 1024;

export const MESSAGE_FICHIER_TROP_LOURD =
  'Ce fichier dépasse 20 Mo. Choisissez un fichier plus léger.';
export const MESSAGE_FICHIER_NON_IMAGE = 'Choisissez un fichier JPEG, PNG ou GIF.';

const TYPES_MIME_ACCEPTES = ['image/jpeg', 'image/png', 'image/gif'];

/** Refus que « Réessayer » ne changerait pas : le Bandeau n'affiche alors que le message. */
const CODES_REFUS = new Set([
  'requete.invalide',
  'requete.trop_volumineuse',
  'format.non_supporte',
  'image.album_requis',
  'preparation.mot_deja_illustre',
  'ressource.introuvable',
]);

/** Données du Dialogue « Téléverser une image ». */
export interface DonneesTeleverserImage {
  readonly preparationId: string;
  readonly mot: MotPreparationDto;
  /** Titre de l'Album de la Préparation, Album d'origine de l'Image. */
  readonly titreAlbum: string;
}

interface ErreurAffichee {
  readonly message: string;
  readonly reessayable: boolean;
}

/**
 * Dialogue « Téléverser une image » (story 2.5, partie 1), ouvert par « Téléverser » d'une Carte « à illustrer », sur
 * le patron du Dialogue du Thème du Mot : le Mot en cursive ; le choix du fichier par le bouton « Choisir un fichier »
 * ou, en plus, par glisser-déposer sur la zone, avec un aperçu ; le type d'image, la source, la licence, l'Album
 * d'origine (celui de la Préparation, en lecture seule) et l'auteur ; le Repère de qualité « simple, claire, peu de
 * détails ».
 *
 * La licence suit le type : imposée et affichée en lecture seule pour une photo personnelle (droits d'auteur de
 * l'enseignant) et une image d'album (usage pédagogique de l'album) ; choisie dans le Sélecteur de licence, facultatif,
 * pour une image libre ou de type inconnu, où Pixabay et « autre / inconnue » portent « non partageable ».
 *
 * Un fichier de plus de 20 Mo, ou qui n'est ni JPEG, ni PNG, ni GIF, est refusé sans requête. « Enregistrer » envoie le
 * formulaire et ferme le dialogue avec le Mot renvoyé, illustré ; « Annuler », Échap ou un clic hors du dialogue le
 * ferment sans rien envoyer. Pendant l'envoi, le dialogue ne se ferme pas ; en échec, il reste ouvert et le message
 * s'affiche dans un Bandeau d'erreur.
 */
@Component({
  selector: 'app-televerser-image',
  imports: [
    BandeauErreur,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './televerser-image-dialogue.scss',
  // Un fichier lâché hors de la zone de dépôt ne doit pas être ouvert par le navigateur (la saisie serait perdue).
  host: {
    '(dragover)': '$event.preventDefault()',
    '(drop)': '$event.preventDefault()',
  },
  template: `
    <h2 mat-dialog-title>Téléverser une image</h2>
    <mat-dialog-content class="televerser">
      <p class="televerser__mot">
        <span class="cm-visuellement-masque">Mot : </span>{{ donnees.mot.forme }}
      </p>
      @if (erreur(); as affichee) {
        <app-bandeau-erreur
          [message]="affichee.message"
          [reessayable]="affichee.reessayable"
          (reessayer)="enregistrer()"
          (fermer)="erreur.set(null)"
        />
      }
      <div
        class="televerser__depot"
        [class.televerser__depot--survol]="survol()"
        (dragover)="survoler($event)"
        (dragleave)="quitter($event)"
        (drop)="deposer($event)"
      >
        @if (apercu(); as url) {
          <img class="televerser__apercu" [src]="url" alt="Aperçu de l'image choisie" />
        } @else {
          <mat-icon class="televerser__icone" svgIcon="image" aria-hidden="true" />
        }
        <p class="televerser__fichier">
          {{ fichier()?.name ?? 'Déposez une image ici, ou choisissez un fichier.' }}
        </p>
        <button
          matButton="outlined"
          class="televerser__choisir"
          type="button"
          [disabled]="envoiEnCours()"
          (click)="selecteur.click()"
        >
          Choisir un fichier
        </button>
        <input
          #selecteur
          class="cm-visuellement-masque"
          type="file"
          accept="image/jpeg,image/png,image/gif"
          tabindex="-1"
          aria-hidden="true"
          (change)="choisirDepuis(selecteur)"
        />
        <p class="televerser__aide">JPEG, PNG ou GIF, 20 Mo au plus.</p>
      </div>
      <p class="televerser__envoi" aria-live="polite">
        @if (envoiEnCours()) {
          Enregistrement de l'image…
        }
      </p>
      <p class="televerser__repere">simple, claire, peu de détails</p>
      <mat-form-field class="televerser__champ" subscriptSizing="dynamic">
        <mat-label>Type d'image</mat-label>
        <mat-select
          class="televerser__type"
          required
          [value]="type()"
          [disabled]="envoiEnCours()"
          (valueChange)="type.set($event)"
        >
          @for (valeur of types; track valeur) {
            <mat-option [value]="valeur">{{ libellesTypes[valeur] }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field class="televerser__champ" subscriptSizing="dynamic">
        <mat-label>Source</mat-label>
        <input
          matInput
          class="televerser__source"
          autocomplete="off"
          maxlength="500"
          [formControl]="source"
        />
      </mat-form-field>
      @if (licenceImposee(); as imposee) {
        <mat-form-field class="televerser__champ" subscriptSizing="dynamic">
          <mat-label>Licence</mat-label>
          <input matInput class="televerser__licence-imposee" readonly [value]="imposee" />
        </mat-form-field>
      } @else if (type() !== null) {
        <mat-form-field class="televerser__champ" subscriptSizing="dynamic">
          <mat-label>Licence</mat-label>
          <mat-select
            class="televerser__licence"
            [value]="licence()"
            [disabled]="envoiEnCours()"
            (valueChange)="licence.set($event)"
          >
            <mat-option [value]="null">Non renseignée</mat-option>
            @for (choix of licences; track choix.valeur) {
              <mat-option [value]="choix.valeur">
                {{ choix.libelle }}
                @if (!choix.partageable) {
                  <span class="televerser__non-partageable">· non partageable</span>
                }
              </mat-option>
            }
          </mat-select>
        </mat-form-field>
      }
      <mat-form-field class="televerser__champ" subscriptSizing="dynamic">
        <mat-label>Album d'origine</mat-label>
        <input matInput class="televerser__album" readonly [value]="donnees.titreAlbum" />
      </mat-form-field>
      <mat-form-field class="televerser__champ" subscriptSizing="dynamic">
        <mat-label>Auteur</mat-label>
        <input
          matInput
          class="televerser__auteur"
          autocomplete="off"
          maxlength="500"
          [formControl]="auteur"
        />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button matButton type="button" [mat-dialog-close]="undefined" [disabled]="envoiEnCours()">
        Annuler
      </button>
      <button
        matButton="filled"
        class="televerser__enregistrer"
        type="button"
        [disabled]="!pret()"
        (click)="enregistrer()"
      >
        Enregistrer
      </button>
    </mat-dialog-actions>
  `,
})
export class TeleverserImageDialogue {
  private readonly api = inject(Api);
  private readonly reference =
    inject<MatDialogRef<TeleverserImageDialogue, MotPreparationDto>>(MatDialogRef);
  protected readonly donnees = inject<DonneesTeleverserImage>(MAT_DIALOG_DATA);

  protected readonly types = TYPES_IMAGE;
  protected readonly libellesTypes = LIBELLES_TYPE_IMAGE;
  protected readonly licences = LICENCES_CHOISIES;

  protected readonly fichier = signal<File | null>(null);
  /** URL `blob:` locale de l'aperçu du fichier choisi (aucune requête). */
  protected readonly apercu = signal<string | null>(null);
  protected readonly survol = signal(false);
  protected readonly type = signal<TypeImage | null>(null);
  /** Licence choisie dans le Sélecteur ; envoyée seulement pour une image libre ou de type inconnu. */
  protected readonly licence = signal<LicenceChoisie | null>(null);
  protected readonly source = new FormControl('', { nonNullable: true });
  protected readonly auteur = new FormControl('', { nonNullable: true });
  protected readonly envoiEnCours = signal(false);
  protected readonly erreur = signal<ErreurAffichee | null>(null);

  protected readonly licenceImposee = computed(() => {
    const type = this.type();
    return type === null ? null : (LICENCES_IMPOSEES[type] ?? null);
  });
  protected readonly pret = computed(
    () => this.fichier() !== null && this.type() !== null && !this.envoiEnCours(),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.poserApercu(null));
  }

  protected choisirDepuis(selecteur: HTMLInputElement): void {
    const choisi = selecteur.files?.[0];
    // Le même fichier, choisi de nouveau après un refus, redéclenche `change`.
    selecteur.value = '';
    if (choisi !== undefined) {
      this.choisir(choisi);
    }
  }

  protected survoler(evenement: DragEvent): void {
    evenement.preventDefault();
    this.survol.set(true);
  }

  /** Sortie de la zone : ignorée quand le pointeur passe sur un de ses éléments (sinon la surbrillance clignote). */
  protected quitter(evenement: DragEvent): void {
    const zone = evenement.currentTarget as HTMLElement;
    const vers = evenement.relatedTarget;
    if (vers instanceof Node && zone.contains(vers)) {
      return;
    }
    this.survol.set(false);
  }

  protected deposer(evenement: DragEvent): void {
    evenement.preventDefault();
    this.survol.set(false);
    const depose = evenement.dataTransfer?.files?.[0];
    if (depose !== undefined) {
      this.choisir(depose);
    }
  }

  /**
   * Fichier choisi ou déposé : refusé sans requête s'il dépasse 20 Mo ou n'est ni JPEG, ni PNG, ni GIF (un type
   * inconnu du navigateur est laissé au back) ; sinon il remplace le précédent, avec son aperçu.
   */
  choisir(choisi: File): void {
    if (this.envoiEnCours()) {
      return;
    }
    if (choisi.size > TAILLE_MAX_FICHIER) {
      this.erreur.set({ message: MESSAGE_FICHIER_TROP_LOURD, reessayable: false });
      return;
    }
    if (choisi.type !== '' && !TYPES_MIME_ACCEPTES.includes(choisi.type)) {
      this.erreur.set({ message: MESSAGE_FICHIER_NON_IMAGE, reessayable: false });
      return;
    }
    this.erreur.set(null);
    this.fichier.set(choisi);
    this.poserApercu(URL.createObjectURL(choisi));
  }

  /** Envoie le fichier et sa Carte d'identité ; ferme avec le Mot renvoyé, illustré. */
  async enregistrer(): Promise<void> {
    const fichier = this.fichier();
    const type = this.type();
    if (fichier === null || type === null || this.envoiEnCours()) {
      return;
    }
    this.envoiEnCours.set(true);
    this.reference.disableClose = true;
    this.erreur.set(null);
    const licence = this.licenceImposee() === null ? this.licence() : null;
    try {
      const illustre = await this.api.invoke(televerserImageMotPreparation, {
        id: this.donnees.preparationId,
        motPreparationId: this.donnees.mot.id,
        body: {
          fichier,
          typeImage: type,
          source: texte(this.source.value),
          licence: licence ?? undefined,
          auteur: texte(this.auteur.value),
        },
      });
      this.reference.close(illustre);
    } catch (erreur) {
      const code = codeErreur(erreur);
      this.erreur.set({
        message: messageErreur(erreur),
        reessayable: code === null || !CODES_REFUS.has(code),
      });
    } finally {
      this.envoiEnCours.set(false);
      this.reference.disableClose = false;
    }
  }

  private poserApercu(url: string | null): void {
    const precedente = this.apercu();
    if (precedente !== null) {
      URL.revokeObjectURL(precedente);
    }
    this.apercu.set(url);
  }
}

/** Texte rogné, `undefined` s'il est vide (champ non envoyé). */
function texte(saisie: string): string | undefined {
  const rogne = saisie.trim();
  return rogne === '' ? undefined : rogne;
}

/**
 * Ouvre le Dialogue « Téléverser une image » et rend le Mot illustré, ou `undefined` s'il est fermé sans rien
 * enregistrer. Le focus revient à `declencheur` (le bouton « Téléverser » de la Carte) à la fermeture sans
 * enregistrement.
 */
export async function ouvrirDialogueTeleverserImage(
  injecteur: Injector,
  donnees: DonneesTeleverserImage,
  declencheur?: HTMLElement,
): Promise<MotPreparationDto | undefined> {
  const reference = injecteur
    .get(MatDialog)
    .open<TeleverserImageDialogue, DonneesTeleverserImage, MotPreparationDto>(
      TeleverserImageDialogue,
      {
        data: donnees,
        autoFocus: '.televerser__choisir',
        restoreFocus: declencheur ?? true,
      },
    );
  return firstValueFrom(reference.afterClosed());
}

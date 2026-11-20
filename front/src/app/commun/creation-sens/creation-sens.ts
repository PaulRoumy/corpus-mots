import {
  afterNextRender,
  ChangeDetectionStrategy,
  DestroyRef,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { codeErreur, MESSAGES_PAR_CODE, messageErreur } from '../erreurs/message-erreur';
import {
  CATEGORIES_GRAMMATICALES,
  CategorieGrammaticale,
  categorieGrammaticale,
  LIBELLES_CATEGORIE,
} from '../libelles-images';

/** Longueur maximale du libellé d'un Sens, une fois nettoyé (le back applique la même). */
export const LONGUEUR_MAX_LIBELLE_SENS = 40;

/** Sous le champ « Libellé du sens » vide ou trop long. */
export const MESSAGE_LIBELLE_SENS = 'Le libellé du sens est obligatoire (40 caractères au plus).';

/** Sous le Sélecteur de catégorie grammaticale resté vide. */
export const MESSAGE_CATEGORIE_REQUISE = 'Choisissez une catégorie grammaticale.';

/** Refus du libellé par le back : vide, trop long ou « à compléter ». */
const CODE_LIBELLE_INVALIDE = 'sens.libelle_invalide';

/** Sens tapé dans la Création de Sens, prêt à partir. */
export interface NouveauSens {
  readonly libelle: string;
  readonly categorie: CategorieGrammaticale;
}

/** Libellé du Sens par défaut, réservé : un enseignant ne peut pas le créer. */
const LIBELLE_A_COMPLETER = 'à compléter';

/** Libellé nettoyé comme le back le fait : apostrophe unifiée, espaces réduites et rognées, forme NFC. */
function nettoyer(libelle: string): string {
  return libelle.replace(/’/g, "'").replace(/\s+/g, ' ').trim().normalize('NFC');
}

/** Libellé de 1 à 40 caractères une fois nettoyé, autre que « à compléter » (sans tenir compte de la casse). */
function libelleValide(controle: AbstractControl<string>): ValidationErrors | null {
  const nettoye = nettoyer(controle.value ?? '');
  return nettoye.length === 0 ||
    nettoye.length > LONGUEUR_MAX_LIBELLE_SENS ||
    nettoye.toLowerCase() === LIBELLE_A_COMPLETER
    ? { libelle: true }
    : null;
}

/**
 * Création de Sens (story 2.8, partie 2 ; UX-DR-19, UX-DR-20), partagée par le Panneau de choix d'Image et la Carte
 * d'identité, à côté de leur champ Sens. Le bouton « Nouveau sens » déplie sur place, jamais en dialogue, un formulaire
 * en ligne (`surface-container-low`) : « Libellé du sens », Sélecteur de catégorie grammaticale (« Catégorie
 * grammaticale », préremplie avec `categorieInitiale` si elle fait partie de la liste) et « Créer le sens ». Le libellé
 * prend le focus à l'ouverture.
 *
 * Entrée dans le formulaire ou « Créer le sens » vérifient libellé (nettoyé comme le back : apostrophe unifiée,
 * espaces réduites, forme NFC ; 1 à 40 caractères, autre que « à compléter ») et catégorie (obligatoire) : invalides,
 * le message s'affiche sous le champ et rien ne part. Valides, les deux champs sont désactivés pendant l'envoi et
 * `envoyer` (fourni par le panneau, qui crée et sélectionne le Sens) est appelé ; s'il réussit, le formulaire se replie
 * et `creee` est émis (le panneau donne alors le focus à son champ Sens). En échec, le formulaire reste ouvert : un refus
 * du libellé par le back s'affiche sous le champ, toute autre erreur sous le formulaire. Échap ferme d'abord la liste
 * des catégories ouverte, sinon replie sans rien créer ni fermer le panneau, et rend le focus à « Nouveau sens ».
 * `reinitialiser` replie et vide le formulaire quand le panneau passe à un autre Mot.
 */
@Component({
  selector: 'app-creation-sens',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './creation-sens.scss',
  template: `
    @if (ouvert()) {
      <form
        class="creation-sens"
        aria-label="Nouveau sens"
        [formGroup]="formulaire"
        (ngSubmit)="creer()"
        (keydown.escape)="echap($event)"
      >
        <mat-form-field class="creation-sens__champ" subscriptSizing="dynamic">
          <mat-label>Libellé du sens</mat-label>
          <input
            #champLibelle
            matInput
            class="creation-sens__libelle"
            type="text"
            autocomplete="off"
            formControlName="libelle"
          />
          @if (libelle.hasError('refuse')) {
            <mat-error>{{ messageRefus }}</mat-error>
          } @else if (libelle.invalid) {
            <mat-error>{{ messageLibelle }}</mat-error>
          }
        </mat-form-field>
        <mat-form-field class="creation-sens__champ" subscriptSizing="dynamic">
          <mat-label>Catégorie grammaticale</mat-label>
          <mat-select class="creation-sens__categorie" formControlName="categorie">
            @for (choix of categories; track choix) {
              <mat-option [value]="choix">{{ libellesCategorie[choix] }}</mat-option>
            }
          </mat-select>
          @if (categorie.invalid) {
            <mat-error>{{ messageCategorie }}</mat-error>
          }
        </mat-form-field>
        @if (erreur(); as message) {
          <p class="creation-sens__erreur" role="alert">{{ message }}</p>
        }
        <button
          matButton="tonal"
          class="creation-sens__creer"
          type="submit"
          [disabled]="enCours() || desactive()"
        >
          Créer le sens
        </button>
      </form>
    } @else {
      <button
        #boutonOuvrir
        matButton
        class="creation-sens__ouvrir"
        type="button"
        [disabled]="desactive()"
        (click)="ouvrir()"
      >
        <mat-icon svgIcon="plus" aria-hidden="true" />
        Nouveau sens
      </button>
    }
  `,
})
export class CreationSens {
  /** Catégorie du Sens actuel, préremplie si elle fait partie de la liste. */
  readonly categorieInitiale = input<string | null | undefined>(null);
  /** Vrai pendant un autre envoi du panneau : ni ouverture ni création. */
  readonly desactive = input(false);
  /** Crée et sélectionne le Sens ; rejette en échec (le formulaire reste ouvert et affiche le message). */
  readonly envoyer = input.required<(sens: NouveauSens) => Promise<void>>();
  /** Sens créé et sélectionné, formulaire replié. */
  readonly creee = output<void>();

  private readonly injecteur = inject(Injector);
  /** Vrai une fois le composant détruit (Sens devenu non modifiable pendant l'envoi) : plus rien n'est émis. */
  private detruit = false;
  /** Numéro de l'état du formulaire, augmenté à chaque réinitialisation : un envoi d'avant est ignoré. */
  private generation = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => (this.detruit = true));
  }

  protected readonly categories = CATEGORIES_GRAMMATICALES;
  protected readonly libellesCategorie = LIBELLES_CATEGORIE;
  protected readonly messageLibelle = MESSAGE_LIBELLE_SENS;
  protected readonly messageCategorie = MESSAGE_CATEGORIE_REQUISE;
  protected readonly messageRefus = MESSAGES_PAR_CODE[CODE_LIBELLE_INVALIDE];

  protected readonly libelle = new FormControl('', {
    nonNullable: true,
    validators: libelleValide,
  });
  protected readonly categorie = new FormControl<CategorieGrammaticale | null>(null, {
    validators: Validators.required,
  });
  protected readonly formulaire = new FormGroup({
    libelle: this.libelle,
    categorie: this.categorie,
  });

  protected readonly ouvert = signal(false);
  protected readonly enCours = signal(false);
  /** Échec de l'envoi autre qu'un refus du libellé, sous le formulaire. */
  protected readonly erreur = signal<string | null>(null);

  private readonly champLibelle = viewChild<ElementRef<HTMLInputElement>>('champLibelle');
  private readonly boutonOuvrir = viewChild('boutonOuvrir', { read: ElementRef<HTMLElement> });
  private readonly selectCategorie = viewChild(MatSelect);

  /** Donne le focus à « Nouveau sens » (formulaire replié). */
  focus(): void {
    this.boutonOuvrir()?.nativeElement.focus();
  }

  /** Replie et vide le formulaire (le panneau passe à un autre Mot) ; la réponse d'un envoi en cours est ignorée. */
  reinitialiser(): void {
    this.generation++;
    this.enCours.set(false);
    this.formulaire.enable();
    this.formulaire.reset({ libelle: '', categorie: null });
    this.erreur.set(null);
    this.ouvert.set(false);
  }

  /** Déplie le formulaire vide, catégorie préremplie, focus sur le libellé. */
  protected ouvrir(): void {
    this.formulaire.reset({
      libelle: '',
      categorie: categorieGrammaticale(this.categorieInitiale()),
    });
    this.erreur.set(null);
    this.ouvert.set(true);
    afterNextRender(() => this.champLibelle()?.nativeElement.focus(), {
      injector: this.injecteur,
    });
  }

  /** Échap : ferme la liste des catégories ouverte, sinon replie sans rien créer ; le panneau reste ouvert. */
  protected echap(evenement: Event): void {
    evenement.preventDefault();
    evenement.stopPropagation();
    const select = this.selectCategorie();
    if (select?.panelOpen) {
      select.close();
      return;
    }
    if (this.enCours()) {
      return;
    }
    this.replier();
  }

  /** Entrée ou « Créer le sens » : vérifie la saisie, puis crée et sélectionne le Sens. */
  protected async creer(): Promise<void> {
    if (this.enCours() || this.desactive()) {
      return;
    }
    // Un refus précédent du back ne bloque pas un nouvel essai.
    if (this.libelle.hasError('refuse')) {
      this.libelle.updateValueAndValidity();
    }
    this.formulaire.markAllAsTouched();
    const categorie = this.categorie.value;
    if (this.formulaire.invalid || categorie === null) {
      return;
    }
    this.enCours.set(true);
    this.erreur.set(null);
    // Champs désactivés pendant l'envoi : l'attente se voit, la saisie envoyée ne change plus.
    this.formulaire.disable();
    const generation = this.generation;
    let reussi = false;
    let echec: unknown = null;
    try {
      await this.envoyer()({ libelle: nettoyer(this.libelle.value), categorie });
      reussi = true;
    } catch (erreur) {
      echec = erreur;
    }
    if (generation !== this.generation) {
      // Formulaire réinitialisé pendant l'envoi : cette réponse ne le concerne plus.
      return;
    }
    this.formulaire.enable();
    this.enCours.set(false);
    if (reussi) {
      this.ouvert.set(false);
      if (!this.detruit) {
        this.creee.emit();
      }
    } else if (codeErreur(echec) === CODE_LIBELLE_INVALIDE) {
      this.libelle.setErrors({ refuse: true });
      this.libelle.markAsTouched();
    } else {
      this.erreur.set(messageErreur(echec));
    }
  }

  private replier(): void {
    this.ouvert.set(false);
    afterNextRender(() => this.focus(), { injector: this.injecteur });
  }
}

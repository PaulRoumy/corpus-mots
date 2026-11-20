import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { Api } from '../api/api';
import { fichierImage } from '../api/fn/images-resource/fichier-image';
import { changerSensMotPreparation } from '../api/fn/preparations-resource/changer-sens-mot-preparation';
import { choisirImageMotPreparation } from '../api/fn/preparations-resource/choisir-image-mot-preparation';
import { proposerImagesMotPreparation } from '../api/fn/preparations-resource/proposer-images-mot-preparation';
import { DetectionImageDto } from '../api/models/detection-image-dto';
import { DetectionMotDto } from '../api/models/detection-mot-dto';
import { DetectionSensDto } from '../api/models/detection-sens-dto';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';
import { Annuaire } from '../commun/annuaire';
import { BadgeTypeImage } from '../commun/badge-type-image/badge-type-image';
import { CompteCourant } from '../commun/compte-courant';
import { codeErreur, messageErreur } from '../commun/erreurs/message-erreur';
import { ChargementImage, ImageSecurisee } from '../commun/image-securisee/image-securisee';
import { Squelette } from '../commun/squelette/squelette';
import { libelleProprietaire, nomProposition, VignetteProposition } from './vignette-proposition';

/** Message du panneau quand l'Image choisie n'est plus proposable : la liste est relue. */
export const MESSAGE_IMAGE_INDISPONIBLE = "Cette image n'est plus disponible.";

/** Message du panneau quand le Mot n'a aucune Image proposable. */
export const MESSAGE_AUCUNE_IMAGE = 'Aucune image pour ce mot.';

/** Valeur du champ Sens qui montre les Images de tous les Sens ; n'est pas un Sens et ne s'enregistre pas. */
export const TOUS_LES_SENS = '*';

/** Libellé du Sens par défaut d'un Mot, tel que le back le renvoie dans `SensPreparationDto`. */
const LIBELLE_A_COMPLETER = 'à compléter';

/** Message du panneau quand le Sens choisi n'est plus visible de l'enseignant : la liste est relue. */
export const MESSAGE_SENS_INDISPONIBLE = "Ce sens n'est plus proposé pour ce mot.";

/** Refus d'un Sens qui n'est plus visible (liste lue périmée) : la liste est relue. */
const CODE_SENS_INVALIDE = 'preparation.sens_invalide';

/** Refus qui signalent une Image devenue indisponible entre la lecture et le choix. */
const CODES_IMAGE_INDISPONIBLE = new Set(['image.indisponible', 'preparation.sens_invalide']);

type Etat =
  | { readonly nom: 'chargement' }
  | { readonly nom: 'charge'; readonly propositions: DetectionMotDto }
  | { readonly nom: 'erreur'; readonly message: string };

/**
 * Panneau de choix d'Image (story 2.7, partie 3 ; UX-DR-28, UX-DR-29), ouvert à droite de la Grille par la vignette
 * d'une Carte de Mot, sur le patron du Panneau Carte d'identité : `aside` nommé « Choisir une image », bouton
 * « Fermer », puis le Mot en cursive et son Sens, l'Image actuelle avec le bouton « Carte d'identité » (qui ouvre à sa
 * place le Panneau Carte d'identité), le Repère de qualité, les Images proposables du Mot dans l'ordre du back
 * (`GET …/propositions`, classement de la détection), puis « Ajouter une image ».
 *
 * Sens (story 2.8, partie 1) : un `mat-select` nommé « Sens » liste les Sens visibles du Mot renvoyés avec les
 * propositions, plus le Sens retenu, chacun « libellé (catégorie) », « à compléter » en dernier et mis en avant (icône
 * et texte, jamais la couleur seule). Il s'ouvre sur le Sens retenu et la liste se limite à ses Images (`sensId`) ; si
 * le Sens retenu est « à compléter », il propose en plus « Tous les sens », choisi d'emblée, et la liste montre les
 * Images de tous les Sens. Choisir un autre Sens l'enregistre aussitôt (`PUT …/sens`, champ désactivé pendant
 * l'envoi) : le Mot renvoyé est émis par `sensChange` (la page met la Carte à jour, sans fermer le panneau), la liste
 * est relue pour ce Sens et le focus reste sur le champ. En échec, le champ revient au Sens précédent et le message
 * s'affiche dans le panneau. Choisir le Sens déjà retenu n'enregistre rien. Un seul Sens possible : texte en lecture.
 *
 * Les Images sont les options d'une liste (`role="listbox"`) qui prend le focus une fois chargée : ↑ ↓ déplacent le
 * choix (sans boucler), Entrée ou un clic retiennent l'Image, avec le même rendu et le même nom accessible que dans la
 * détection (`VignetteProposition`). L'Image actuelle porte « actuelle » ; la retenir ferme le panneau sans requête.
 * Une autre Image est liée par `PUT …/image` (origine `reutilisee`) et le Mot renvoyé est émis par `choisi` ; la page
 * ferme le panneau. En échec, le message s'affiche dans le panneau, qui reste ouvert ; une Image qui n'est plus
 * disponible (ou passée à un autre Mot) affiche « Cette image n'est plus disponible. » et la liste est relue.
 * Si le panneau passe à un autre Mot pendant un envoi, la réponse de l'ancien est ignorée. Sans Image : « Aucune
 * image pour ce mot. ». « Ajouter une image » émet `ajouterImage` avec son bouton (la page ouvre le Dialogue « Téléverser une
 * image »). Échap et « Fermer » émettent `fermer`, sans requête.
 */
@Component({
  selector: 'app-panneau-choix-image',
  imports: [
    BadgeTypeImage,
    ImageSecurisee,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    ReactiveFormsModule,
    Squelette,
    VignetteProposition,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './panneau-choix-image.scss',
  host: {
    '(keydown.escape)': 'fermerParEchap($event)',
  },
  template: `
    <aside #panneau class="choix-image" tabindex="-1" aria-labelledby="choix-image-titre">
      <div class="choix-image__entete">
        <h2 id="choix-image-titre" class="choix-image__titre">Choisir une image</h2>
        <button
          matIconButton
          class="choix-image__fermer"
          type="button"
          aria-label="Fermer"
          (click)="fermer.emit()"
        >
          <mat-icon svgIcon="fermer" aria-hidden="true" />
        </button>
      </div>
      <div class="choix-image__mot">
        <span class="choix-image__forme">{{ mot().forme }}</span>
        @if (champSensVisible()) {
          <mat-form-field class="choix-image__champ-sens" subscriptSizing="dynamic">
            <mat-label>Sens</mat-label>
            <mat-select
              class="choix-image__sens-choix"
              [formControl]="champSens"
              (selectionChange)="choisirSens($event.value)"
            >
              <mat-select-trigger>
                @if (sensDuChamp(); as choisi) {
                  @if (choisi.aCompleter) {
                    <span class="choix-image__a-completer">
                      <mat-icon svgIcon="crayon" aria-hidden="true" />
                      à compléter
                    </span>
                  } @else {
                    {{ libelle(choisi) }}
                  }
                } @else {
                  Tous les sens
                }
              </mat-select-trigger>
              @if (tousLesSensPropose()) {
                <mat-option [value]="tousLesSens">Tous les sens</mat-option>
              }
              @for (choix of sensProposes(); track choix.id) {
                <mat-option [value]="choix.id">
                  @if (choix.aCompleter) {
                    <span class="choix-image__a-completer">
                      <mat-icon svgIcon="crayon" aria-hidden="true" />
                      à compléter
                    </span>
                  } @else {
                    {{ libelle(choix) }}
                  }
                </mat-option>
              }
            </mat-select>
          </mat-form-field>
        } @else {
          <span class="choix-image__sens">Sens : {{ libelleSens() }}</span>
        }
      </div>
      @if (mot().image; as image) {
        <div class="choix-image__actuelle">
          <span class="choix-image__miniature">
            @if (echecActuelle()) {
              <mat-icon class="choix-image__repli" svgIcon="image" aria-hidden="true" />
            } @else if (chargerActuelle(); as charger) {
              <img
                class="choix-image__image"
                [appImageSecurisee]="charger"
                [alt]="mot().forme + ', ' + mot().sens.libelle"
                (echec)="echecActuelle.set(true)"
              />
            }
          </span>
          <span class="choix-image__actuelle-textes">
            <span class="choix-image__libelle">Image actuelle</span>
            <app-badge-type-image [type]="image.typeImage" />
            <button
              matButton
              class="choix-image__carte-identite"
              type="button"
              (click)="ouvrirCarteIdentite.emit()"
            >
              Carte d'identité
            </button>
          </span>
        </div>
      }
      <p class="choix-image__repere">simple, claire, peu de détails</p>
      @if (message(); as texte) {
        <p class="choix-image__message" role="alert">{{ texte }}</p>
      }
      @switch (etat().nom) {
        @case ('chargement') {
          <app-squelette class="choix-image__squelette" forme="vignette" [nombre]="2" />
        }
        @case ('charge') {
          @if (images().length === 0) {
            <p class="choix-image__vide">{{ messageAucuneImage }}</p>
          } @else {
            <ul
              #liste
              class="choix-image__liste"
              role="listbox"
              tabindex="0"
              [attr.aria-label]="'Images proposées pour « ' + mot().forme + ' »'"
              [attr.aria-activedescendant]="idActif()"
              [attr.aria-busy]="envoiEnCours() ? 'true' : null"
              (keydown)="naviguer($event)"
            >
              @for (image of images(); track image.id) {
                <li
                  [id]="idOption(image.id)"
                  role="option"
                  [attr.aria-selected]="image.id === imageActive()"
                  [attr.aria-label]="nomOption(image)"
                  (click)="choisir(image)"
                  appVignetteProposition
                  [image]="image"
                  [forme]="mot().forme"
                  [afficherSens]="plusieursSens()"
                  [choisie]="image.id === imageActive()"
                  [actuelle]="image.id === mot().image?.id"
                ></li>
              }
            </ul>
          }
        }
      }
      <button
        matButton="outlined"
        class="choix-image__ajouter"
        type="button"
        (click)="ajouterImage.emit($any($event.currentTarget))"
      >
        <mat-icon svgIcon="plus" aria-hidden="true" />
        Ajouter une image
      </button>
    </aside>
  `,
})
export class PanneauChoixImage {
  readonly preparationId = input.required<string>();
  /** Mot de Préparation dont l'Image est choisie. */
  readonly mot = input.required<MotPreparationDto>();
  /** Image liée au Mot, renvoyé par le back. */
  readonly choisi = output<MotPreparationDto>();
  /** Sens retenu changé dans le panneau : le Mot renvoyé par le back (Image éventuellement déliée). */
  readonly sensChange = output<MotPreparationDto>();
  readonly fermer = output<void>();
  readonly ouvrirCarteIdentite = output<void>();
  /** « Ajouter une image », avec son bouton, auquel le focus revient si le dialogue est fermé sans rien enregistrer. */
  readonly ajouterImage = output<HTMLElement>();

  private readonly api = inject(Api);
  private readonly annuaire = inject(Annuaire);
  private readonly compteCourant = inject(CompteCourant);
  private readonly injecteur = inject(Injector);

  protected readonly messageAucuneImage = MESSAGE_AUCUNE_IMAGE;
  protected readonly tousLesSens = TOUS_LES_SENS;
  /** Champ Sens : un identifiant de Sens, ou `TOUS_LES_SENS`. Désactivé pendant un envoi. */
  protected readonly champSens = new FormControl<string>(TOUS_LES_SENS, { nonNullable: true });
  /** Valeur du champ Sens, en signal : Sens dont les Images sont montrées, ou `TOUS_LES_SENS`. */
  private readonly filtre = signal<string>(TOUS_LES_SENS);
  /** Sens visibles du Mot, lus avec les dernières propositions ; gardés pendant une relecture. */
  private readonly sensVisibles = signal<readonly DetectionSensDto[]>([]);
  protected readonly etat = signal<Etat>({ nom: 'chargement' });
  /** Message affiché dans le panneau : échec de lecture ou de choix. */
  protected readonly message = signal<string | null>(null);
  protected readonly envoiEnCours = signal(false);
  /** Image active au clavier, `null` si aucune. */
  protected readonly imageActive = signal<string | null>(null);

  private readonly panneau = viewChild.required('panneau', { read: ElementRef<HTMLElement> });
  private readonly liste = viewChild('liste', { read: ElementRef<HTMLElement> });
  private readonly selectSens = viewChild(MatSelect);

  /** Vrai si le Sens retenu du Mot est le Sens par défaut « à compléter ». */
  private readonly retenuACompleter = computed(
    () => this.mot().sens.libelle === LIBELLE_A_COMPLETER,
  );
  /** Sens du champ : les Sens visibles, plus le Sens retenu s'il n'y figure pas ; « à compléter » en dernier. */
  protected readonly sensProposes = computed<readonly DetectionSensDto[]>(() => {
    const visibles = this.sensVisibles();
    const retenu = this.mot().sens;
    if (visibles.length === 0 || visibles.some((sens) => sens.id === retenu.id)) {
      return visibles;
    }
    const sensRetenu: DetectionSensDto = {
      id: retenu.id,
      libelle: retenu.libelle,
      categorie: retenu.categorie ?? null,
      aCompleter: this.retenuACompleter(),
    };
    return [...visibles, sensRetenu].sort((a, b) => Number(a.aCompleter) - Number(b.aCompleter));
  });
  /** Plusieurs Sens possibles : le Sens devient un champ ; sinon il reste en lecture. */
  protected readonly champSensVisible = computed(() => this.sensProposes().length > 1);
  /** « Tous les sens » n'est proposé que si le Sens retenu est « à compléter ». */
  protected readonly tousLesSensPropose = computed(() => this.retenuACompleter());
  /** Sens choisi dans le champ, `null` pour « Tous les sens ». */
  protected readonly sensDuChamp = computed(
    () => this.sensProposes().find((sens) => sens.id === this.filtre()) ?? null,
  );

  protected readonly images = computed<readonly DetectionImageDto[]>(() => {
    const etat = this.etat();
    return etat.nom === 'charge' ? etat.propositions.images : [];
  });
  protected readonly plusieursSens = computed(() => {
    const etat = this.etat();
    return etat.nom === 'charge' && etat.propositions.sens.length > 1;
  });
  protected readonly idActif = computed(() => {
    const active = this.imageActive();
    return active === null ? null : this.idOption(active);
  });

  /** Sens retenu du Mot : « fruit (nom) ». */
  protected readonly libelleSens = computed(() => {
    const sens = this.mot().sens;
    return sens.categorie ? `${sens.libelle} (${sens.categorie})` : sens.libelle;
  });

  private readonly imageActuelleId = computed(() => this.mot().image?.id ?? null);
  protected readonly chargerActuelle = computed<ChargementImage | null>(() => {
    const id = this.imageActuelleId();
    return id === null ? null : () => this.api.invoke(fichierImage, { id, taille: 'miniature' });
  });
  protected readonly echecActuelle = linkedSignal({
    source: this.imageActuelleId,
    computation: () => false,
  });

  private derniereLecture = 0;
  /** Numéro du dernier envoi : la réponse d'un envoi dépassé (autre Mot depuis) est ignorée. */
  private envoiCourant = 0;
  private readonly motId = computed(() => this.mot().id);

  constructor() {
    effect(() => {
      const preparationId = this.preparationId();
      const motId = this.motId();
      untracked(() => {
        // Un choix envoyé pour le Mot précédent ne concerne plus ce panneau.
        this.envoiCourant++;
        this.envoiEnCours.set(false);
        this.champSens.enable({ emitEvent: false });
        this.message.set(null);
        this.sensVisibles.set([]);
        // Le champ s'ouvre sur le Sens retenu ; « Tous les sens » si celui-ci est « à compléter ».
        this.definirFiltre(this.retenuACompleter() ? TOUS_LES_SENS : this.mot().sens.id);
        void this.lire(preparationId, motId);
        afterNextRender(() => this.focus(), { injector: this.injecteur });
      });
    });
    // L'option active reste visible quand la liste défile.
    afterRenderEffect(() => {
      const id = this.idActif();
      if (id !== null) {
        this.liste()?.nativeElement.querySelector(`#${id}`)?.scrollIntoView?.({ block: 'nearest' });
      }
    });
  }

  /** Donne le focus au panneau. */
  focus(): void {
    this.panneau().nativeElement.focus();
  }

  protected idOption(imageId: string): string {
    return `choix-image-${imageId}`;
  }

  protected nomOption(image: DetectionImageDto): string {
    return nomProposition(
      this.mot().forme,
      image,
      libelleProprietaire(image.proprietaireId, this.compteCourant, this.annuaire),
      image.id === this.mot().image?.id,
    );
  }

  /** ↓ l'Image suivante (la première sans choix), ↑ la précédente, sans boucler ; Entrée retient l'Image active. */
  protected naviguer(evenement: KeyboardEvent): void {
    const images = this.images();
    const index = images.findIndex((image) => image.id === this.imageActive());
    if (evenement.key === 'ArrowDown') {
      evenement.preventDefault();
      if (images.length > 0) {
        this.imageActive.set(images[Math.min(index + 1, images.length - 1)].id);
      }
    } else if (evenement.key === 'ArrowUp') {
      evenement.preventDefault();
      if (index > 0) {
        this.imageActive.set(images[index - 1].id);
      }
    } else if (evenement.key === 'Home' && images.length > 0) {
      evenement.preventDefault();
      this.imageActive.set(images[0].id);
    } else if (evenement.key === 'End' && images.length > 0) {
      evenement.preventDefault();
      this.imageActive.set(images[images.length - 1].id);
    } else if (evenement.key === 'Enter') {
      evenement.preventDefault();
      const active = images[index];
      if (active !== undefined) {
        void this.choisir(active);
      }
    }
  }

  /** Retient l'Image : l'actuelle ferme sans requête, une autre est liée au Mot à la place de l'actuelle. */
  protected async choisir(image: DetectionImageDto): Promise<void> {
    if (this.envoiEnCours()) {
      return;
    }
    this.imageActive.set(image.id);
    if (image.id === this.mot().image?.id) {
      this.fermer.emit();
      return;
    }
    const numero = ++this.envoiCourant;
    const motId = this.mot().id;
    this.envoiEnCours.set(true);
    // Pas de changement de Sens ni de filtre pendant le choix d'une Image.
    this.champSens.disable({ emitEvent: false });
    this.message.set(null);
    try {
      const mot = await this.api.invoke(choisirImageMotPreparation, {
        id: this.preparationId(),
        motPreparationId: motId,
        body: { imageId: image.id },
      });
      if (numero === this.envoiCourant && motId === this.mot().id) {
        this.choisi.emit(mot);
      }
    } catch (erreur) {
      if (numero !== this.envoiCourant || motId !== this.mot().id) {
        return;
      }
      if (CODES_IMAGE_INDISPONIBLE.has(codeErreur(erreur) ?? '')) {
        this.message.set(MESSAGE_IMAGE_INDISPONIBLE);
        this.imageActive.set(null);
        void this.lire(this.preparationId(), this.mot().id);
      } else {
        this.message.set(messageErreur(erreur));
      }
    } finally {
      if (numero === this.envoiCourant) {
        this.envoiEnCours.set(false);
        this.champSens.enable({ emitEvent: false });
      }
    }
  }

  /** « fruit (nom) » ; le libellé seul sans catégorie. */
  protected libelle(sens: DetectionSensDto): string {
    return sens.categorie ? `${sens.libelle} (${sens.categorie})` : sens.libelle;
  }

  /**
   * Sens choisi dans le champ : « Tous les sens » ou le Sens déjà retenu limitent seulement la liste ; un autre Sens est
   * enregistré aussitôt comme Sens retenu, puis la liste est relue pour lui. En échec, le champ revient au Sens
   * précédent et le message s'affiche dans le panneau.
   */
  protected async choisirSens(valeur: string): Promise<void> {
    const precedent = this.filtre();
    if (valeur === precedent) {
      return;
    }
    if (valeur === TOUS_LES_SENS || valeur === this.mot().sens.id) {
      this.definirFiltre(valeur);
      void this.lire(this.preparationId(), this.mot().id);
      return;
    }
    if (this.envoiEnCours()) {
      this.definirFiltre(precedent);
      return;
    }
    const numero = ++this.envoiCourant;
    const motId = this.mot().id;
    this.envoiEnCours.set(true);
    this.champSens.disable({ emitEvent: false });
    this.message.set(null);
    try {
      const mot = await this.api.invoke(changerSensMotPreparation, {
        id: this.preparationId(),
        motPreparationId: motId,
        body: { sensId: valeur },
      });
      if (numero !== this.envoiCourant || motId !== this.mot().id) {
        // Panneau passé à un autre Mot : la Carte de l'ancien prend quand même le Mot enregistré, rien d'autre ne change.
        this.sensChange.emit(mot);
        return;
      }
      this.definirFiltre(valeur);
      this.sensChange.emit(mot);
      void this.lire(this.preparationId(), motId);
    } catch (erreur) {
      if (numero !== this.envoiCourant || motId !== this.mot().id) {
        return;
      }
      this.definirFiltre(precedent);
      if (codeErreur(erreur) === CODE_SENS_INVALIDE) {
        // Liste des Sens périmée : elle est relue, le Sens refusé n'y figure plus.
        this.message.set(MESSAGE_SENS_INDISPONIBLE);
        void this.lire(this.preparationId(), motId);
      } else {
        this.message.set(messageErreur(erreur));
      }
    } finally {
      if (numero === this.envoiCourant) {
        this.envoiEnCours.set(false);
        this.champSens.enable({ emitEvent: false });
        // Le focus reste sur le champ après l'enregistrement.
        afterNextRender(() => this.selectSens()?.focus(), { injector: this.injecteur });
      }
    }
  }

  /** Pose la valeur du champ Sens et le filtre des Images, sans relire. */
  private definirFiltre(valeur: string): void {
    this.filtre.set(valeur);
    this.champSens.setValue(valeur, { emitEvent: false });
  }

  protected fermerParEchap(evenement: Event): void {
    evenement.stopPropagation();
    this.fermer.emit();
  }

  private async lire(preparationId: string, motPreparationId: string): Promise<void> {
    const numero = ++this.derniereLecture;
    this.etat.set({ nom: 'chargement' });
    this.imageActive.set(null);
    try {
      const filtre = this.filtre();
      const propositions = await this.api.invoke(proposerImagesMotPreparation, {
        id: preparationId,
        motPreparationId,
        ...(filtre === TOUS_LES_SENS ? {} : { sensId: filtre }),
      });
      if (numero !== this.derniereLecture) {
        return;
      }
      this.sensVisibles.set(propositions.sens);
      this.etat.set({ nom: 'charge', propositions });
      const moi = this.compteCourant.compte()?.id;
      if (propositions.images.some((image) => image.proprietaireId !== moi)) {
        // L'Annuaire n'est lu qu'à la première Image d'un collègue.
        void this.annuaire.charger();
      }
      // Une fois la liste affichée, elle prend le focus s'il est resté sur le panneau (ou s'est perdu à la relecture).
      afterNextRender(
        () => {
          const actif = document.activeElement;
          if (actif === this.panneau().nativeElement || actif === null || actif === document.body) {
            this.liste()?.nativeElement.focus();
          }
        },
        { injector: this.injecteur },
      );
    } catch (erreur) {
      if (numero === this.derniereLecture) {
        this.etat.set({ nom: 'erreur', message: messageErreur(erreur) });
        this.message.set(messageErreur(erreur));
      }
    }
  }
}

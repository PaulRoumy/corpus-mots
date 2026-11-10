import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { Title } from '@angular/platform-browser';
import { Api } from '../api/api';
import { creerModule } from '../api/fn/albums-resource/creer-module';
import { listerModulesDeLAlbum } from '../api/fn/albums-resource/lister-modules-de-l-album';
import { renommerModule } from '../api/fn/modules-resource/renommer-module';
import { supprimerModule } from '../api/fn/modules-resource/supprimer-module';
import { lirePreparation } from '../api/fn/preparations-resource/lire-preparation';
import { reglerPreparation } from '../api/fn/preparations-resource/regler-preparation';
import { listerThemes } from '../api/fn/themes-resource/lister-themes';
import { ModuleDto } from '../api/models/module-dto';
import { PreparationDto } from '../api/models/preparation-dto';
import { ThemeDto } from '../api/models/theme-dto';
import { BandeauErreur } from '../commun/bandeau-erreur/bandeau-erreur';
import { CompteCourant } from '../commun/compte-courant';
import { DialogueConfirmation } from '../commun/dialogue-confirmation/dialogue-confirmation';
import { codeErreur, MESSAGES_PAR_CODE, messageErreur } from '../commun/erreurs/message-erreur';
import { RepereSection } from '../commun/repere-section/repere-section';
import { Squelette } from '../commun/squelette/squelette';
import { ChampNomModule } from './champ-nom-module';
import { libelleMots } from './preparations';

/** « 0 déjà illustrés », « 1 déjà illustré ». */
export function libelleIllustres(nombre: number): string {
  return `${nombre} déjà illustré${nombre === 1 ? '' : 's'}`;
}

/** Borne haute du Temps passé, en heures (le back refuse au-delà de 6 000 minutes). */
export const TEMPS_PASSE_MAXIMUM_HEURES = 100;

export const MESSAGE_TEMPS_PASSE_INVALIDE = MESSAGES_PAR_CODE['preparation.temps_passe_invalide'];

/**
 * Temps passé saisi en heures (« 3,5 » ou « 3.5 »), converti en minutes : `null` pour un champ vide, `undefined` pour
 * une saisie invalide (pas un nombre, hors de 0 à 100, ou pas un multiple d'une demi-heure).
 */
export function heuresEnMinutes(saisie: string): number | null | undefined {
  const texte = saisie.trim().replace(',', '.');
  if (texte === '') {
    return null;
  }
  if (!/^\d+(\.\d+)?$/.test(texte)) {
    return undefined;
  }
  const demiHeures = Number(texte) * 2;
  if (!Number.isInteger(demiHeures) || demiHeures > TEMPS_PASSE_MAXIMUM_HEURES * 2) {
    return undefined;
  }
  return demiHeures * 30;
}

/** Minutes affichées en heures, avec la virgule : 210 → « 3,5 », 60 → « 1 », absent → « ». */
export function minutesEnHeures(minutes: number | null | undefined): string {
  return minutes === null || minutes === undefined
    ? ''
    : String(Number((minutes / 60).toFixed(2))).replace('.', ',');
}

function heuresValides(controle: AbstractControl<string>): ValidationErrors | null {
  return heuresEnMinutes(controle.value) === undefined ? { heures: true } : null;
}

/** Valeur de l'option « Nouveau module » de la liste Module, distincte de tout Module. */
const OPTION_NOUVEAU_MODULE = Symbol('nouveau-module');
type ValeurModule = string | null | typeof OPTION_NOUVEAU_MODULE;

/** Champ en ligne du nom d'un Module : création, ou renommage de `module`. */
interface SaisieModule {
  readonly module?: ModuleDto;
}

interface ErreurAffichee {
  readonly message: string;
  readonly reessayer: () => void;
}

/**
 * Page d'une Préparation (`/preparations/:id`), réduite pour l'instant à son En-tête (key-preparation.html › `.hero`) :
 * titre de l'Album, Repère de Section, Module, Thème par défaut, « N mots, M déjà illustrés » et Temps passé.
 * La Préparation d'un collègue est introuvable pour le back : son message traduit s'affiche dans le Bandeau d'erreur.
 *
 * Module, Thème par défaut et Temps passé sont modifiables (story 2.2, partie 1) et enregistrés sans bouton : au choix
 * dans une liste, ou à la sortie du champ Temps passé. Chaque enregistrement envoie les trois valeurs affichées, un à
 * la fois. En cas d'échec, la saisie reste affichée et un Bandeau d'erreur propose « Réessayer », qui renvoie les
 * valeurs affichées. Les listes de Modules et de Thèmes se chargent avec la Préparation et ont leur propre Bandeau.
 *
 * Modules (story 2.2, partie 2) : la liste Module, affichée dès que les listes sont chargées, se termine par
 * « Nouveau module », qui déplie à sa place un champ en ligne ; le Module créé s'ajoute à la liste, est choisi, donc
 * enregistré. Le menu « Actions du module », à côté du Module choisi, n'apparaît que pour son créateur et
 * l'administrateur (le back revérifie) : « Renommer » rouvre le même champ prérempli, « Supprimer » passe par le
 * Dialogue de confirmation puis relit la Préparation et les Modules. Après `preparation.module_invalide` (Module
 * supprimé entre-temps par un collègue), les Modules sont relus et le Module disparu retiré du choix.
 *
 * Le Temps passé est un champ texte en mode de saisie décimal plutôt qu'un `type="number"` : celui-ci, selon la langue
 * du navigateur, refuse la virgule sans le dire (sa valeur devient vide, comme un champ effacé).
 */
@Component({
  selector: 'app-preparation',
  imports: [
    BandeauErreur,
    ChampNomModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    ReactiveFormsModule,
    RepereSection,
    Squelette,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../commun/page-rubrique.scss', './preparation.scss'],
  template: `
    <div class="page">
      @if (erreur(); as message) {
        <h1 class="cm-visuellement-masque">Préparation</h1>
        <app-bandeau-erreur
          [message]="message"
          (reessayer)="charger(id())"
          (fermer)="erreur.set(null)"
        />
      }

      @if (preparation(); as courante) {
        @if (erreurEnregistrement(); as message) {
          <app-bandeau-erreur
            class="erreur-enregistrement"
            [message]="message"
            (reessayer)="enregistrer()"
            (fermer)="erreurEnregistrement.set(null)"
          />
        }
        @if (erreurModule(); as affichee) {
          <app-bandeau-erreur
            class="erreur-module"
            [message]="affichee.message"
            (reessayer)="affichee.reessayer()"
            (fermer)="erreurModule.set(null)"
          />
        }
        @if (erreurListes(); as message) {
          <app-bandeau-erreur
            class="erreur-listes"
            [message]="message"
            (reessayer)="chargerListes(courante.albumId)"
            (fermer)="erreurListes.set(null)"
          />
        }
        <section class="entete" aria-labelledby="entete-titre">
          <span class="entete__couverture" aria-hidden="true">
            <mat-icon svgIcon="livre" />
          </span>
          <div class="entete__corps">
            <p class="entete__rubrique">Préparation</p>
            <h1 id="entete-titre" class="entete__titre">{{ courante.titreAlbum }}</h1>
            <div class="entete__meta">
              <app-repere-section [section]="courante.section" />
              @if (saisieModule(); as saisie) {
                <app-champ-nom-module
                  class="entete__saisie-module"
                  [etiquette]="saisie.module ? 'Nouveau nom du module' : 'Nom du nouveau module'"
                  [libelleValider]="saisie.module ? 'Renommer' : 'Ajouter'"
                  [valeurInitiale]="saisie.module?.nom ?? ''"
                  [enCours]="saisieEnCours()"
                  [erreur]="erreurSaisieModule()"
                  (valider)="validerSaisieModule($event)"
                  (annuler)="fermerSaisieModule()"
                />
              } @else if (listesChargees()) {
                <mat-form-field class="entete__champ entete__module" subscriptSizing="dynamic">
                  <mat-label>Module</mat-label>
                  <mat-select
                    #listeModule
                    [value]="module()"
                    (selectionChange)="choisirModule($event.value)"
                  >
                    <mat-option [value]="null">Aucun module</mat-option>
                    @for (choix of modules(); track choix.id) {
                      <mat-option [value]="choix.id">{{ choix.nom }}</mat-option>
                    }
                    <mat-option class="entete__nouveau-module" [value]="optionNouveauModule">
                      <mat-icon svgIcon="plus" aria-hidden="true" />
                      Nouveau module
                    </mat-option>
                  </mat-select>
                </mat-form-field>
                @if (moduleGerable(); as gere) {
                  <button
                    matIconButton
                    class="entete__actions-module"
                    type="button"
                    aria-label="Actions du module"
                    [disabled]="suppressionEnCours()"
                    [matMenuTriggerFor]="menuModule"
                  >
                    <mat-icon svgIcon="actions" aria-hidden="true" />
                  </button>
                  <mat-menu #menuModule="matMenu">
                    <button mat-menu-item type="button" (click)="ouvrirRenommage(gere)">
                      Renommer
                    </button>
                    <button mat-menu-item type="button" (click)="supprimerModule(gere)">
                      Supprimer
                    </button>
                  </mat-menu>
                }
              } @else if (courante.nomModule) {
                <span class="entete__nom-module">{{ courante.nomModule }}</span>
              }
              @if (themes().length > 0) {
                <mat-form-field class="entete__champ entete__theme" subscriptSizing="dynamic">
                  <mat-label>Thème par défaut</mat-label>
                  <mat-select [value]="theme()" (selectionChange)="choisirTheme($event.value)">
                    <mat-option [value]="null">Aucun thème</mat-option>
                    @for (choix of themes(); track choix.id) {
                      <mat-option [value]="choix.id">{{ choix.nom }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              } @else if (courante.nomThemeDefaut) {
                <span class="entete__nom-theme"
                  ><span class="cm-visuellement-masque">Thème par défaut : </span
                  >{{ courante.nomThemeDefaut }}</span
                >
              }
            </div>
            <div class="entete__bas">
              <p class="entete__compteur">
                <strong>{{ libelleMots(courante.nombreMots) }}</strong
                >,
                {{ libelleIllustres(courante.nombreIllustres) }}
              </p>
              <mat-form-field class="entete__champ entete__temps" subscriptSizing="dynamic">
                <mat-label>Temps passé (facultatif)</mat-label>
                <mat-icon matPrefix svgIcon="horloge" aria-hidden="true" />
                <input
                  matInput
                  type="text"
                  inputmode="decimal"
                  autocomplete="off"
                  [formControl]="tempsPasse"
                  (blur)="quitterTempsPasse()"
                />
                <span matTextSuffix>h</span>
                @if (tempsPasse.hasError('heures')) {
                  <mat-error>{{ messageTempsInvalide }}</mat-error>
                }
              </mat-form-field>
            </div>
          </div>
        </section>
      } @else if (chargementEnCours()) {
        <app-squelette forme="texte" [nombre]="3" />
      }
    </div>
  `,
})
export class Preparation {
  private readonly api = inject(Api);
  private readonly titre = inject(Title);
  private readonly compteCourant = inject(CompteCourant);
  private readonly confirmation = inject(DialogueConfirmation);
  private readonly injecteur = inject(Injector);

  /** Identifiant de la Préparation, lu dans l'URL (`withComponentInputBinding`). */
  readonly id = input.required<string>();

  protected readonly libelleMots = libelleMots;
  protected readonly libelleIllustres = libelleIllustres;
  protected readonly messageTempsInvalide = MESSAGE_TEMPS_PASSE_INVALIDE;
  protected readonly optionNouveauModule = OPTION_NOUVEAU_MODULE;

  /** Préparation telle que le back l'a renvoyée en dernier. */
  protected readonly preparation = signal<PreparationDto | null>(null);
  protected readonly chargementEnCours = signal(false);
  protected readonly erreur = signal<string | null>(null);

  /** Valeurs affichées dans l'En-tête, envoyées à chaque enregistrement. */
  protected readonly module = signal<string | null>(null);
  protected readonly theme = signal<string | null>(null);
  protected readonly tempsPasse = new FormControl('', {
    nonNullable: true,
    validators: heuresValides,
  });

  protected readonly modules = signal<ModuleDto[]>([]);
  protected readonly themes = signal<ThemeDto[]>([]);
  protected readonly erreurListes = signal<string | null>(null);
  protected readonly erreurEnregistrement = signal<string | null>(null);
  /** Vrai une fois les listes chargées : la liste Module, avec « Nouveau module », s'affiche alors toujours. */
  protected readonly listesChargees = signal(false);

  /** Champ en ligne du nom d'un Module, ouvert à la place de la liste Module. */
  protected readonly saisieModule = signal<SaisieModule | null>(null);
  protected readonly saisieEnCours = signal(false);
  protected readonly erreurSaisieModule = signal<string | null>(null);
  protected readonly suppressionEnCours = signal(false);
  /** Échec d'une suppression de Module, ou de la relecture qui la suit. */
  protected readonly erreurModule = signal<ErreurAffichee | null>(null);
  private readonly listeModule = viewChild<MatSelect>('listeModule');

  /** Module choisi, si l'enseignant peut le renommer ou le supprimer : son créateur, ou l'administrateur. */
  protected readonly moduleGerable = computed(() => {
    const choisi = this.modules().find((module) => module.id === this.module());
    const compte = this.compteCourant.compte();
    if (choisi === undefined || compte === null) {
      return null;
    }
    return compte.administrateur || choisi.createurId === compte.id ? choisi : null;
  });

  /** Numéro du dernier chargement : la réponse d'une Préparation quittée depuis n'écrit rien. */
  private dernierChargement = 0;
  /** Vrai pendant un enregistrement : un changement survenu entre-temps est envoyé après lui. */
  private enregistrementEnCours = false;
  private enregistrementEnAttente = false;

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => void this.charger(id));
    });
  }

  async charger(id: string): Promise<void> {
    const numero = ++this.dernierChargement;
    this.chargementEnCours.set(true);
    this.preparation.set(null);
    this.modules.set([]);
    this.themes.set([]);
    this.erreurListes.set(null);
    this.erreurEnregistrement.set(null);
    this.listesChargees.set(false);
    this.saisieModule.set(null);
    this.erreurSaisieModule.set(null);
    this.erreurModule.set(null);
    this.enregistrementEnAttente = false;
    try {
      const preparation = await this.api.invoke(lirePreparation, { id });
      if (numero === this.dernierChargement) {
        this.module.set(preparation.moduleId ?? null);
        this.theme.set(preparation.themeDefautId ?? null);
        this.tempsPasse.reset(minutesEnHeures(preparation.tempsPasseMinutes));
        this.preparation.set(preparation);
        this.erreur.set(null);
        this.titre.setTitle(`${preparation.titreAlbum} · corpus-mots`);
        void this.chargerListes(preparation.albumId);
      }
    } catch (erreur) {
      if (numero === this.dernierChargement) {
        this.erreur.set(messageErreur(erreur));
      }
    } finally {
      if (numero === this.dernierChargement) {
        this.chargementEnCours.set(false);
      }
    }
  }

  /** Modules de l'Album et Thèmes ; en échec, leur propre Bandeau d'erreur, l'En-tête reste affiché. */
  async chargerListes(albumId: string): Promise<void> {
    const numero = this.dernierChargement;
    try {
      const [modules, themes] = await Promise.all([
        this.api.invoke(listerModulesDeLAlbum, { id: albumId }),
        this.api.invoke(listerThemes),
      ]);
      if (numero === this.dernierChargement) {
        this.modules.set(modules);
        this.themes.set(themes);
        this.listesChargees.set(true);
        this.erreurListes.set(null);
      }
    } catch (erreur) {
      if (numero === this.dernierChargement) {
        this.erreurListes.set(messageErreur(erreur));
      }
    }
  }

  protected choisirModule(valeur: ValeurModule): void {
    if (valeur === OPTION_NOUVEAU_MODULE) {
      this.ouvrirSaisieModule({});
      return;
    }
    this.module.set(valeur);
    void this.enregistrer();
  }

  protected ouvrirRenommage(module: ModuleDto): void {
    this.ouvrirSaisieModule({ module });
  }

  private ouvrirSaisieModule(saisie: SaisieModule): void {
    this.erreurSaisieModule.set(null);
    this.saisieModule.set(saisie);
  }

  /** Replie le champ en ligne sans rien enregistrer ; le focus revient à la liste Module. */
  protected fermerSaisieModule(): void {
    this.saisieModule.set(null);
    this.erreurSaisieModule.set(null);
    this.rendreFocusALaListe();
  }

  private rendreFocusALaListe(): void {
    afterNextRender(() => this.listeModule()?.focus(), { injector: this.injecteur });
  }

  /**
   * Crée le Module nommé `nom`, l'ajoute à la liste, le choisit et l'enregistre ; ou renomme le Module en cours de
   * renommage. En échec, le champ reste ouvert avec sa saisie et affiche le message.
   */
  protected async validerSaisieModule(nom: string): Promise<void> {
    const saisie = this.saisieModule();
    const preparation = this.preparation();
    if (saisie === null || preparation === null || this.saisieEnCours()) {
      return;
    }
    const numero = this.dernierChargement;
    this.saisieEnCours.set(true);
    // Un nouvel échec réaffiche son message, même identique au précédent.
    this.erreurSaisieModule.set(null);
    try {
      if (saisie.module) {
        const renomme = await this.api.invoke(renommerModule, {
          id: saisie.module.id,
          body: { nom },
        });
        if (numero === this.dernierChargement) {
          this.modules.update((modules) =>
            modules.map((module) => (module.id === renomme.id ? renomme : module)),
          );
          this.preparation.update((courante) =>
            courante?.moduleId === renomme.id ? { ...courante, nomModule: renomme.nom } : courante,
          );
          this.fermerSaisieModule();
        }
      } else {
        const cree = await this.api.invoke(creerModule, { id: preparation.albumId, body: { nom } });
        if (numero === this.dernierChargement) {
          this.modules.update((modules) => [...modules, cree]);
          this.module.set(cree.id);
          this.fermerSaisieModule();
          void this.enregistrer();
        }
      }
    } catch (erreur) {
      if (numero === this.dernierChargement) {
        this.erreurSaisieModule.set(messageErreur(erreur));
      }
    } finally {
      this.saisieEnCours.set(false);
    }
  }

  /** « Supprimer » : Dialogue de confirmation, puis suppression et relecture de la Préparation et des Modules. */
  protected async supprimerModule(module: ModuleDto): Promise<void> {
    const confirme = await this.confirmation.confirmer({
      titre: 'Supprimer le module ?',
      phrase:
        `Le module « ${module.nom} » sera retiré de l'album et de toutes les préparations qui l'utilisent, ` +
        'chez tous les enseignants.',
      libelleConfirmer: 'Supprimer le module',
    });
    if (confirme) {
      await this.envoyerSuppression(module);
    }
  }

  private async envoyerSuppression(module: ModuleDto): Promise<void> {
    const numero = this.dernierChargement;
    this.suppressionEnCours.set(true);
    try {
      await this.api.invoke(supprimerModule, { id: module.id });
      if (numero === this.dernierChargement) {
        this.erreurModule.set(null);
        await this.relire();
      }
    } catch (erreur) {
      if (numero !== this.dernierChargement) {
        return;
      }
      const code = codeErreur(erreur);
      if (code === 'ressource.introuvable') {
        // Déjà supprimé par un autre : le résultat attendu est là, il suffit de relire.
        this.erreurModule.set(null);
        await this.relire();
        return;
      }
      this.erreurModule.set({
        message: messageErreur(erreur),
        // Un refus (403) se répéterait à l'identique : « Réessayer » efface seulement le message.
        reessayer: () =>
          code === 'module.reserve_au_createur'
            ? this.erreurModule.set(null)
            : void this.envoyerSuppression(module),
      });
    } finally {
      this.suppressionEnCours.set(false);
    }
  }

  /**
   * Relit la Préparation et les Modules après une suppression, sans toucher au Thème ni au Temps passé affichés ;
   * le focus revient à la liste Module.
   */
  private async relire(): Promise<void> {
    const numero = this.dernierChargement;
    try {
      const preparation = await this.api.invoke(lirePreparation, { id: this.id() });
      if (numero !== this.dernierChargement) {
        return;
      }
      this.module.set(preparation.moduleId ?? null);
      this.preparation.set(preparation);
      this.erreurModule.set(null);
      await this.chargerListes(preparation.albumId);
      this.rendreFocusALaListe();
    } catch (erreur) {
      if (numero === this.dernierChargement) {
        this.erreurModule.set({
          message: messageErreur(erreur),
          reessayer: () => void this.relire(),
        });
      }
    }
  }

  protected choisirTheme(themeId: string | null): void {
    this.theme.set(themeId);
    void this.enregistrer();
  }

  /** Sortie du champ : une saisie invalide n'est pas envoyée, une valeur inchangée non plus. */
  protected quitterTempsPasse(): void {
    const minutes = heuresEnMinutes(this.tempsPasse.value);
    if (minutes === undefined) {
      return;
    }
    if (
      minutes === (this.preparation()?.tempsPasseMinutes ?? null) &&
      this.erreurEnregistrement() === null
    ) {
      return;
    }
    void this.enregistrer();
  }

  /**
   * Envoie le Module, le Thème par défaut et le Temps passé affichés. Un Temps passé invalide n'est pas envoyé : le
   * dernier enregistré le remplace.
   */
  async enregistrer(): Promise<void> {
    const preparation = this.preparation();
    if (preparation === null) {
      return;
    }
    if (this.enregistrementEnCours) {
      this.enregistrementEnAttente = true;
      return;
    }
    const numero = this.dernierChargement;
    const saisi = heuresEnMinutes(this.tempsPasse.value);
    this.enregistrementEnCours = true;
    try {
      const reglee = await this.api.invoke(reglerPreparation, {
        id: preparation.id,
        body: {
          moduleId: this.module(),
          themeDefautId: this.theme(),
          tempsPasseMinutes: saisi === undefined ? (preparation.tempsPasseMinutes ?? null) : saisi,
        },
      });
      if (numero === this.dernierChargement) {
        this.preparation.set(reglee);
        this.erreurEnregistrement.set(null);
      }
    } catch (erreur) {
      if (numero === this.dernierChargement) {
        this.erreurEnregistrement.set(messageErreur(erreur));
        if (codeErreur(erreur) === 'preparation.module_invalide') {
          void this.retirerModuleDisparu(preparation.albumId, numero);
        }
      }
    } finally {
      this.enregistrementEnCours = false;
      // `charger` efface l'attente : celle qui reste vient d'un changement sur la Préparation affichée.
      if (this.enregistrementEnAttente) {
        this.enregistrementEnAttente = false;
        void this.enregistrer();
      }
    }
  }

  /**
   * Après `preparation.module_invalide` : le Module choisi a été supprimé entre-temps. Les Modules sont relus et, s'il
   * n'y figure plus, il n'est plus choisi (« Réessayer » enverra alors « Aucun module »).
   */
  private async retirerModuleDisparu(albumId: string, numero: number): Promise<void> {
    await this.chargerListes(albumId);
    const choisi = this.module();
    if (
      numero === this.dernierChargement &&
      this.listesChargees() &&
      choisi !== null &&
      !this.modules().some((module) => module.id === choisi)
    ) {
      this.module.set(null);
    }
  }
}

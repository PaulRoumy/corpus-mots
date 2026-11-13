import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
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
  viewChildren,
} from '@angular/core';
import { MatAutocompleteModule, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatChipRow, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ThemeDto } from '../../api/models/theme-dto';

/** Longueur maximale du nom d'un Thème (le back applique la même, espaces superflues retirées). */
export const LONGUEUR_MAX_NOM_THEME = 200;

/**
 * Même normalisation que le back (`referentiels.service.TitresAlbums.normaliser`), qui décide seul de l'unicité :
 * espaces réduites et rognées, apostrophe `’` unifiée, minuscules, accents retirés, article initial
 * (`le|la|les|un|une|des` suivi d'une espace, ou `l'`) retiré ; un article seul est conservé.
 */
export function normaliserNom(nom: string): string {
  const texte = nom
    .replace(/[\s\p{Z}﻿]+/gu, ' ')
    .trim()
    .replace(/’/g, "'")
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .normalize('NFC');
  const sansArticle = texte.replace(/^(?:(?:le|la|les|un|une|des) |l')/, '').trim();
  return sansArticle === '' ? texte : sansArticle;
}

/** Thèmes de l'école par nom, comme le back les renvoie. */
export function themesParNom(themes: readonly ThemeDto[]): ThemeDto[] {
  return [...themes].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

/** Valeur de l'option « Créer le thème « … » », distincte de tout Thème. */
const OPTION_CREER_THEME = Symbol('creer-theme');
type ValeurOption = ThemeDto | typeof OPTION_CREER_THEME;

let prochainNumero = 0;

/**
 * Champ à étiquettes des Thèmes (UX-DR-17, DESIGN « Champ à étiquettes ») : une puce d'entrée Material 3 par Thème
 * choisi, puis un champ de saisie. La frappe propose, dans un menu sous le champ, les Thèmes non choisis dont le nom
 * normalisé contient la saisie, la première mise en avant ; « Créer le thème « … » » s'y ajoute quand aucun Thème ne
 * porte ce nom normalisé. Entrée choisit la proposition mise en avant ; Retour arrière dans le champ vide retire la
 * dernière étiquette ; à la `limite` atteinte, choisir un autre Thème remplace la dernière.
 *
 * Le composant ne garde aucun état métier : il émet `choisisChange` (nouvelle liste d'identifiants), `creer` (nom
 * rogné), `renommer` et `supprimer` ; le parent appelle le back et met à jour `themes` et `choisis`. Une étiquette dont
 * le Thème est `gerable` ouvre au clic, à Entrée ou à Espace son menu « Renommer », « Supprimer ». La saisie est vidée
 * dès que `choisis` change ; l'échec d'une création (`erreur`) s'affiche sous le champ jusqu'à la prochaine frappe.
 */
@Component({
  selector: 'app-champ-themes',
  imports: [
    MatAutocompleteModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatMenuModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './champ-themes.scss',
  template: `
    <mat-form-field class="champ-themes__champ" subscriptSizing="dynamic">
      <mat-label>{{ etiquette() }}</mat-label>
      <mat-chip-grid #grille [attr.aria-label]="etiquette()">
        @for (theme of themesChoisis(); track theme.id) {
          @if (gerable()(theme)) {
            <mat-chip-row
              class="champ-themes__etiquette champ-themes__etiquette--gerable"
              aria-description="Entrée : renommer ou supprimer le thème"
              [matMenuTriggerFor]="menuTheme"
              [matMenuTriggerData]="{ theme }"
              [matMenuTriggerRestoreFocus]="false"
              (menuOpened)="themeDuMenu = theme"
              (keydown.enter)="ouvrirMenu($event)"
              (keydown.space)="ouvrirMenu($event)"
              (removed)="retirer(theme)"
            >
              {{ theme.nom }}
              <button matChipRemove type="button" [attr.aria-label]="'Retirer ' + theme.nom">
                <mat-icon svgIcon="fermer" aria-hidden="true" />
              </button>
            </mat-chip-row>
          } @else {
            <mat-chip-row class="champ-themes__etiquette" (removed)="retirer(theme)">
              {{ theme.nom }}
              <button matChipRemove type="button" [attr.aria-label]="'Retirer ' + theme.nom">
                <mat-icon svgIcon="fermer" aria-hidden="true" />
              </button>
            </mat-chip-row>
          }
        }
        <input
          #champ
          class="champ-themes__saisie"
          type="text"
          autocomplete="off"
          [attr.maxlength]="longueurMax"
          [matChipInputFor]="grille"
          [matChipInputSeparatorKeyCodes]="aucunSeparateur"
          [matAutocomplete]="propositions"
          [attr.aria-describedby]="erreurAffichee() ? idErreur : null"
          (input)="saisir(champ.value)"
        />
      </mat-chip-grid>
      <mat-autocomplete
        #propositions="matAutocomplete"
        autoActiveFirstOption
        [displayWith]="sansTexte"
        (optionSelected)="choisirOption($event.option.value)"
      >
        @for (theme of propositionsThemes(); track theme.id) {
          <mat-option [value]="theme">{{ theme.nom }}</mat-option>
        }
        @if (nomACreer(); as nom) {
          <mat-option class="champ-themes__creer" [value]="optionCreer">
            <mat-icon svgIcon="plus" aria-hidden="true" />
            Créer le thème « {{ nom }} »
          </mat-option>
        }
      </mat-autocomplete>
    </mat-form-field>
    @if (erreurAffichee(); as message) {
      <p class="champ-themes__erreur" role="alert" [id]="idErreur">{{ message }}</p>
    }
    <mat-menu #menuTheme="matMenu" (closed)="menuFerme($event)">
      <ng-template matMenuContent let-theme="theme">
        <button mat-menu-item type="button" (click)="renommer.emit(theme)">Renommer</button>
        <button mat-menu-item type="button" (click)="supprimer.emit(theme)">Supprimer</button>
      </ng-template>
    </mat-menu>
  `,
})
export class ChampThemes {
  /** Étiquette du champ (« Thème par défaut »). */
  readonly etiquette = input.required<string>();
  /** Tous les Thèmes de l'école. */
  readonly themes = input.required<readonly ThemeDto[]>();
  /** Identifiants des Thèmes choisis, dans l'ordre des étiquettes. */
  readonly choisis = input<readonly string[]>([]);
  /** Nombre maximal d'étiquettes : à la limite, ajouter remplace la dernière. */
  readonly limite = input(Number.POSITIVE_INFINITY);
  /** Vrai si l'enseignant peut renommer ou supprimer ce Thème : son menu est alors proposé. */
  readonly gerable = input<(theme: ThemeDto) => boolean>(() => false);
  /** Vrai pendant une création : aucune autre création n'est émise. */
  readonly enCours = input(false);
  /** Message de l'échec de la dernière création, ou `null`. */
  readonly erreur = input<string | null>(null);

  readonly choisisChange = output<string[]>();
  readonly creer = output<string>();
  readonly renommer = output<ThemeDto>();
  readonly supprimer = output<ThemeDto>();

  protected readonly longueurMax = LONGUEUR_MAX_NOM_THEME;
  protected readonly optionCreer = OPTION_CREER_THEME;
  protected readonly aucunSeparateur: number[] = [];
  protected readonly idErreur = `champ-themes-erreur-${prochainNumero++}`;
  protected readonly sansTexte = () => '';

  /** Thème dont le menu est ouvert, pour lui rendre le focus quand le menu se ferme au clavier. */
  protected themeDuMenu: ThemeDto | null = null;

  private readonly injecteur = inject(Injector);
  private readonly champ = viewChild<ElementRef<HTMLInputElement>>('champ');
  private readonly etiquettes = viewChildren(MatChipRow);
  private readonly declencheur = viewChild(MatAutocompleteTrigger);
  private readonly saisie = signal('');

  /** Vrai dès que la saisie change après un échec, jusqu'au prochain message. */
  private readonly erreurMasquee = linkedSignal({ source: this.erreur, computation: () => false });
  protected readonly erreurAffichee = computed(() => (this.erreurMasquee() ? null : this.erreur()));

  protected readonly themesChoisis = computed(() => {
    const parId = new Map(this.themes().map((theme) => [theme.id, theme]));
    return this.choisis()
      .map((id) => parId.get(id))
      .filter((theme) => theme !== undefined);
  });

  /** Thèmes non choisis dont le nom normalisé contient la saisie normalisée ; tous si la saisie est vide. */
  protected readonly propositionsThemes = computed(() => {
    const cherche = normaliserNom(this.saisie());
    const choisis = new Set(this.choisis());
    return this.themes().filter(
      (theme) => !choisis.has(theme.id) && normaliserNom(theme.nom).includes(cherche),
    );
  });

  /** Nom rogné à proposer en création, si aucun Thème (choisi ou non) ne porte ce nom normalisé. */
  protected readonly nomACreer = computed(() => {
    const nom = this.saisie().replace(/\s+/g, ' ').trim();
    if (nom === '') {
      return null;
    }
    const cherche = normaliserNom(nom);
    return this.themes().some((theme) => normaliserNom(theme.nom) === cherche) ? null : nom;
  });

  constructor() {
    // Une nouvelle liste de Thèmes choisis (choix, création réussie) vide la saisie.
    effect(() => {
      this.choisis();
      untracked(() => this.viderSaisie());
    });
    // Retour arrière dans le champ vide retire la dernière étiquette. Écouté en capture, avant `matChipInput`, qui
    // sinon donnerait seulement le focus à la dernière étiquette.
    const hote = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const retourArriere = (evenement: KeyboardEvent) => {
      const champ = this.champ()?.nativeElement;
      if (
        champ !== undefined &&
        evenement.target === champ &&
        evenement.key === 'Backspace' &&
        champ.value === '' &&
        this.choisis().length > 0
      ) {
        evenement.preventDefault();
        evenement.stopPropagation();
        if (!evenement.repeat) {
          this.choisisChange.emit(this.choisis().slice(0, -1));
        }
      }
    };
    hote.addEventListener('keydown', retourArriere, true);
    inject(DestroyRef).onDestroy(() => hote.removeEventListener('keydown', retourArriere, true));
  }

  /** Donne le focus au champ de saisie. */
  focus(): void {
    this.champ()?.nativeElement.focus();
  }

  /** Vrai si la liste des propositions est ouverte : Échap la ferme, pas le panneau qui contient le Champ. */
  listeOuverte(): boolean {
    return this.declencheur()?.panelOpen ?? false;
  }

  protected saisir(texte: string): void {
    this.saisie.set(texte);
    this.erreurMasquee.set(true);
  }

  protected choisirOption(valeur: ValeurOption): void {
    if (valeur === OPTION_CREER_THEME) {
      const nom = this.nomACreer();
      // L'autocomplete a vidé le champ : on y remet le nom, vidé à la création réussie.
      const champ = this.champ();
      if (champ) {
        champ.nativeElement.value = this.saisie();
      }
      if (nom !== null && !this.enCours()) {
        this.creer.emit(nom);
      }
      return;
    }
    this.ajouter(valeur);
  }

  private ajouter(theme: ThemeDto): void {
    const choisis = [...this.choisis()];
    if (choisis.length >= this.limite()) {
      choisis.splice(Math.max(this.limite() - 1, 0));
    }
    this.choisisChange.emit([...choisis, theme.id]);
    this.viderSaisie();
  }

  protected retirer(theme: ThemeDto): void {
    this.choisisChange.emit(this.choisis().filter((id) => id !== theme.id));
    // Sans étiquette restante, le focus revient au champ de saisie.
    afterNextRender(
      () => {
        if (this.etiquettes().length === 0) {
          this.focus();
        }
      },
      { injector: this.injecteur },
    );
  }

  /** Entrée ou Espace sur une étiquette gérable : ouvre son menu (une étiquette n'est pas un bouton natif). */
  protected ouvrirMenu(evenement: Event): void {
    if (evenement.target instanceof HTMLButtonElement) {
      return;
    }
    evenement.preventDefault();
    (evenement.currentTarget as HTMLElement).click();
  }

  /** Menu fermé au clavier (Échap) : le focus revient à son étiquette. */
  protected menuFerme(raison: 'click' | 'keydown' | 'tab' | void): void {
    const theme = this.themeDuMenu;
    this.themeDuMenu = null;
    if (raison !== 'keydown' || theme === null) {
      return;
    }
    const index = this.themesChoisis().findIndex((choisi) => choisi.id === theme.id);
    this.etiquettes()[index]?.focus();
  }

  private viderSaisie(): void {
    this.saisie.set('');
    const champ = this.champ();
    if (champ) {
      champ.nativeElement.value = '';
    }
  }
}

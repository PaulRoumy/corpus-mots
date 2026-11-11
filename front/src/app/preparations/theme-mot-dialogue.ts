import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { Api } from '../api/api';
import { changerThemeMotPreparation } from '../api/fn/preparations-resource/changer-theme-mot-preparation';
import { creerTheme } from '../api/fn/themes-resource/creer-theme';
import { renommerTheme } from '../api/fn/themes-resource/renommer-theme';
import { supprimerTheme } from '../api/fn/themes-resource/supprimer-theme';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';
import { ThemeDto } from '../api/models/theme-dto';
import { BandeauErreur } from '../commun/bandeau-erreur/bandeau-erreur';
import { ChampThemes, themesParNom } from '../commun/champ-themes/champ-themes';
import { codeErreur, messageErreur } from '../commun/erreurs/message-erreur';
import { ChampNomModule } from './champ-nom-module';

/** Thème créé, renommé ou supprimé depuis le Dialogue : la page met à jour ses Thèmes, son En-tête et ses Cartes. */
export interface ChangementTheme {
  readonly type: 'cree' | 'renomme' | 'supprime';
  readonly theme: ThemeDto;
}

/** Données du Dialogue « Thème de « … » ». */
export interface DonneesThemeMot {
  readonly preparationId: string;
  readonly mot: MotPreparationDto;
  /** Thèmes de l'école, par nom. */
  readonly themes: readonly ThemeDto[];
  /** Vrai si l'enseignant peut renommer ou supprimer ce Thème (son créateur, l'administrateur). */
  readonly gerable: (theme: ThemeDto) => boolean;
  /** Appelé à chaque Thème créé, renommé ou supprimé, même si le Dialogue est ensuite fermé sans enregistrer. */
  readonly themesModifies: (changement: ChangementTheme) => void;
}

interface ErreurAffichee {
  readonly message: string;
  readonly reessayer: () => void;
}

/**
 * Phrase de la suppression d'un Thème, dans l'En-tête comme dans ce Dialogue : le back le retire aussi des Préparations
 * et des Mots qui le portaient.
 */
export function phraseSuppressionTheme(theme: ThemeDto): string {
  return (
    `Le thème « ${theme.nom} » sera retiré de la liste de l'école, des préparations qui l'ont pour thème par ` +
    'défaut et des mots qui le portent, chez tous les enseignants.'
  );
}

/**
 * Dialogue « Thème de « citrouille » » (story 2.3, partie 3), ouvert par le bouton du Thème d'une Carte de Mot : le
 * Champ à étiquettes des Thèmes, limité à une étiquette et prérempli avec le Thème du Mot. Choisir un autre Thème
 * remplace l'étiquette, la retirer laisse le Mot sans thème ; rien n'est envoyé avant « Enregistrer », qui ferme le
 * dialogue avec le Mot renvoyé. « Annuler », Échap ou un clic hors du dialogue le ferment sans changer le Thème du Mot.
 * Pendant l'envoi, le dialogue ne se ferme pas ; en échec, il reste ouvert et le message s'affiche dans un Bandeau
 * d'erreur.
 *
 * Comme dans l'En-tête, « Créer le thème « … » » crée un Thème pour toute l'école, aussitôt choisi, et le menu d'une
 * étiquette (son créateur, l'administrateur) propose « Renommer », qui ouvre à la place du champ le champ en ligne, et
 * « Supprimer ». Pas de dialogue sur un dialogue : la suppression se confirme sur place, à la place du champ. Chaque
 * Thème créé, renommé ou supprimé est enregistré aussitôt et signalé à la page (`themesModifies`).
 */
@Component({
  selector: 'app-theme-mot',
  imports: [BandeauErreur, ChampNomModule, ChampThemes, MatButtonModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './theme-mot-dialogue.scss',
  template: `
    <h2 mat-dialog-title>Thème de « {{ donnees.mot.forme }} »</h2>
    <mat-dialog-content class="theme-mot">
      @if (erreur(); as affichee) {
        <app-bandeau-erreur
          [message]="affichee.message"
          (reessayer)="affichee.reessayer()"
          (fermer)="erreur.set(null)"
        />
      }
      @if (themeARenommer(); as aRenommer) {
        <app-champ-nom-module
          etiquette="Nouveau nom du thème"
          libelleValider="Renommer"
          [valeurInitiale]="aRenommer.nom"
          [enCours]="renommageEnCours()"
          [erreur]="erreurRenommage()"
          (valider)="validerRenommage($event)"
          (annuler)="fermerRenommage()"
        />
      } @else if (themeASupprimer(); as aSupprimer) {
        <div
          class="theme-mot__suppression"
          role="group"
          aria-labelledby="theme-mot-suppression-titre"
          aria-describedby="theme-mot-suppression-phrase"
          (keydown.escape)="$event.preventDefault(); $event.stopPropagation(); fermerSuppression()"
        >
          <p id="theme-mot-suppression-titre" class="theme-mot__suppression-titre">
            Supprimer le thème ?
          </p>
          <p id="theme-mot-suppression-phrase" class="theme-mot__suppression-phrase">
            {{ phraseSuppression(aSupprimer) }}
          </p>
          <div class="theme-mot__suppression-actions">
            <button
              #annulerSuppression
              matButton
              type="button"
              [disabled]="suppressionEnCours()"
              (click)="fermerSuppression()"
            >
              Annuler
            </button>
            <button
              matButton="filled"
              class="theme-mot__supprimer"
              type="button"
              [disabled]="suppressionEnCours()"
              (click)="confirmerSuppression()"
            >
              Supprimer le thème
            </button>
          </div>
        </div>
      } @else {
        <app-champ-themes
          class="theme-mot__champ"
          etiquette="Thème"
          [themes]="themes()"
          [choisis]="choisis()"
          [limite]="1"
          [gerable]="donnees.gerable"
          [enCours]="creationEnCours()"
          [erreur]="erreurCreation()"
          (choisisChange)="choisi.set($event[0] ?? null)"
          (creer)="creer($event)"
          (renommer)="ouvrirRenommage($event)"
          (supprimer)="ouvrirSuppression($event)"
        />
      }
    </mat-dialog-content>
    <mat-dialog-actions>
      <button matButton type="button" [mat-dialog-close]="undefined" [disabled]="occupe()">
        Annuler
      </button>
      <button
        matButton="filled"
        type="button"
        [disabled]="envoiEnCours() || themeARenommer() !== null || themeASupprimer() !== null"
        (click)="enregistrer()"
      >
        Enregistrer
      </button>
    </mat-dialog-actions>
  `,
})
export class ThemeMotDialogue {
  private readonly api = inject(Api);
  private readonly injecteur = inject(Injector);
  private readonly reference =
    inject<MatDialogRef<ThemeMotDialogue, MotPreparationDto>>(MatDialogRef);
  protected readonly donnees = inject<DonneesThemeMot>(MAT_DIALOG_DATA);

  protected readonly phraseSuppression = phraseSuppressionTheme;

  protected readonly themes = signal<readonly ThemeDto[]>(this.donnees.themes);
  /**
   * Thème du Mot à l'ouverture, s'il figure parmi les Thèmes chargés ; « Enregistrer » n'envoie rien s'il est encore
   * choisi. Devient `null` si ce Thème est supprimé depuis le Dialogue (le back l'a retiré du Mot).
   */
  private themeInitial: string | null = this.donnees.themes.some(
    (theme) => theme.id === this.donnees.mot.themeId,
  )
    ? (this.donnees.mot.themeId ?? null)
    : null;
  /** Thème choisi dans le Champ à étiquettes, envoyé par « Enregistrer ». */
  protected readonly choisi = signal<string | null>(this.themeInitial);
  protected readonly choisis = computed(() => {
    const choisi = this.choisi();
    return choisi === null ? [] : [choisi];
  });

  protected readonly envoiEnCours = signal(false);
  protected readonly erreur = signal<ErreurAffichee | null>(null);
  protected readonly creationEnCours = signal(false);
  protected readonly erreurCreation = signal<string | null>(null);
  protected readonly themeARenommer = signal<ThemeDto | null>(null);
  protected readonly renommageEnCours = signal(false);
  protected readonly erreurRenommage = signal<string | null>(null);
  protected readonly themeASupprimer = signal<ThemeDto | null>(null);
  protected readonly suppressionEnCours = signal(false);
  /** Vrai pendant toute requête : le dialogue ne se ferme pas, pour que son échec reste affiché. */
  protected readonly occupe = computed(
    () =>
      this.envoiEnCours() ||
      this.creationEnCours() ||
      this.renommageEnCours() ||
      this.suppressionEnCours(),
  );

  private readonly champThemes = viewChild(ChampThemes);
  private readonly boutonAnnulerSuppression = viewChild('annulerSuppression', {
    read: ElementRef<HTMLButtonElement>,
  });

  /** Envoie le Thème choisi et ferme avec le Mot renvoyé ; un Thème inchangé ferme sans rien envoyer. */
  async enregistrer(): Promise<void> {
    if (this.envoiEnCours() || this.themeARenommer() !== null || this.themeASupprimer() !== null) {
      return;
    }
    const themeId = this.choisi();
    if (themeId === this.themeInitial) {
      this.reference.close(undefined);
      return;
    }
    this.envoiEnCours.set(true);
    this.majFermeture();
    // Un nouvel échec réaffiche son message, même identique au précédent.
    this.erreur.set(null);
    try {
      const change = await this.api.invoke(changerThemeMotPreparation, {
        id: this.donnees.preparationId,
        motPreparationId: this.donnees.mot.id,
        body: { themeId },
      });
      this.reference.close(change);
    } catch (erreur) {
      const code = codeErreur(erreur);
      if (code === 'preparation.theme_introuvable' && themeId !== null) {
        // Supprimé entre-temps par un collègue : il disparaît du choix.
        this.retirer(themeId);
      }
      // Un refus se répéterait à l'identique : « Réessayer » efface seulement le message.
      const refus = code === 'preparation.theme_introuvable' || code === 'ressource.introuvable';
      this.erreur.set({
        message: messageErreur(erreur),
        reessayer: () => (refus ? this.erreur.set(null) : void this.enregistrer()),
      });
    } finally {
      this.envoiEnCours.set(false);
      this.majFermeture();
    }
  }

  /** « Créer le thème « … » » : le Thème créé, visible de toute l'école, est ajouté et choisi. */
  protected async creer(nom: string): Promise<void> {
    if (this.creationEnCours()) {
      return;
    }
    this.creationEnCours.set(true);
    this.majFermeture();
    this.erreurCreation.set(null);
    try {
      const cree = await this.api.invoke(creerTheme, { body: { nom } });
      this.themes.update((themes) => themesParNom([...themes, cree]));
      this.choisi.set(cree.id);
      this.donnees.themesModifies({ type: 'cree', theme: cree });
    } catch (erreur) {
      this.erreurCreation.set(messageErreur(erreur));
    } finally {
      this.creationEnCours.set(false);
      this.majFermeture();
    }
  }

  protected ouvrirRenommage(theme: ThemeDto): void {
    this.erreurRenommage.set(null);
    this.themeARenommer.set(theme);
  }

  /** Replie le champ en ligne sans rien renommer ; le focus revient au Champ à étiquettes. */
  protected fermerRenommage(): void {
    this.themeARenommer.set(null);
    this.erreurRenommage.set(null);
    this.rendreFocusAuChamp();
  }

  /** Renomme le Thème ; en échec, le champ reste ouvert avec sa saisie et affiche le message. */
  protected async validerRenommage(nom: string): Promise<void> {
    const theme = this.themeARenommer();
    if (theme === null || this.renommageEnCours()) {
      return;
    }
    this.renommageEnCours.set(true);
    this.majFermeture();
    this.erreurRenommage.set(null);
    try {
      const renomme = await this.api.invoke(renommerTheme, { id: theme.id, body: { nom } });
      this.themes.update((themes) =>
        themesParNom(themes.map((existant) => (existant.id === renomme.id ? renomme : existant))),
      );
      this.donnees.themesModifies({ type: 'renomme', theme: renomme });
      this.fermerRenommage();
    } catch (erreur) {
      this.erreurRenommage.set(messageErreur(erreur));
    } finally {
      this.renommageEnCours.set(false);
      this.majFermeture();
    }
  }

  /** « Supprimer » : la confirmation remplace le champ ; le focus va à son « Annuler ». */
  protected ouvrirSuppression(theme: ThemeDto): void {
    this.erreur.set(null);
    this.themeASupprimer.set(theme);
    afterNextRender(() => this.boutonAnnulerSuppression()?.nativeElement.focus(), {
      injector: this.injecteur,
    });
  }

  protected fermerSuppression(): void {
    if (this.suppressionEnCours()) {
      return;
    }
    this.themeASupprimer.set(null);
    this.rendreFocusAuChamp();
  }

  /** Supprime le Thème pour toute l'école ; déjà supprimé par un autre, le résultat attendu est là. */
  protected async confirmerSuppression(): Promise<void> {
    const theme = this.themeASupprimer();
    if (theme === null || this.suppressionEnCours()) {
      return;
    }
    this.suppressionEnCours.set(true);
    this.majFermeture();
    this.erreur.set(null);
    try {
      await this.api.invoke(supprimerTheme, { id: theme.id });
      this.retirer(theme.id);
    } catch (erreur) {
      const code = codeErreur(erreur);
      if (code === 'ressource.introuvable') {
        this.retirer(theme.id);
      } else {
        // Un refus (403, Thème utilisé) se répéterait à l'identique : « Réessayer » efface seulement le message.
        const refus = code === 'theme.reserve_au_createur' || code === 'theme.utilise';
        this.erreur.set({
          message: messageErreur(erreur),
          reessayer: () => (refus ? this.erreur.set(null) : void this.confirmerSuppression()),
        });
      }
    } finally {
      this.suppressionEnCours.set(false);
      this.majFermeture();
    }
    // Échec compris : la confirmation se replie, le Bandeau d'erreur dit pourquoi.
    this.themeASupprimer.set(null);
    this.rendreFocusAuChamp();
  }

  /** Le Thème `themeId` n'existe plus : retiré du choix et des Thèmes, la page en est prévenue. */
  private retirer(themeId: string): void {
    const theme = this.themes().find((existant) => existant.id === themeId);
    this.themes.update((themes) => themes.filter((existant) => existant.id !== themeId));
    if (this.choisi() === themeId) {
      this.choisi.set(null);
    }
    if (this.themeInitial === themeId) {
      this.themeInitial = null;
    }
    if (theme !== undefined) {
      this.donnees.themesModifies({ type: 'supprime', theme });
    }
  }

  /** Échap et le clic hors du dialogue ne le ferment pas pendant une requête. */
  private majFermeture(): void {
    this.reference.disableClose = this.occupe();
  }

  private rendreFocusAuChamp(): void {
    afterNextRender(() => this.champThemes()?.focus(), { injector: this.injecteur });
  }
}

/**
 * Ouvre le Dialogue du Thème d'un Mot et rend le Mot au Thème changé, ou `undefined` s'il est fermé sans changement.
 * Le focus revient à `declencheur` (le bouton du Thème de la Carte) à la fermeture.
 */
export async function ouvrirDialogueThemeMot(
  injecteur: Injector,
  donnees: DonneesThemeMot,
  declencheur?: HTMLElement,
): Promise<MotPreparationDto | undefined> {
  const reference = injecteur
    .get(MatDialog)
    .open<ThemeMotDialogue, DonneesThemeMot, MotPreparationDto>(ThemeMotDialogue, {
      data: donnees,
      // Focus d'emblée dans la saisie du Champ à étiquettes.
      autoFocus: '.theme-mot__champ input',
      restoreFocus: declencheur ?? true,
    });
  return firstValueFrom(reference.afterClosed());
}

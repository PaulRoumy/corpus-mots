import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { Api } from '../api/api';
import { listerMesPreparations } from '../api/fn/preparations-resource/lister-mes-preparations';
import { supprimerPreparation } from '../api/fn/preparations-resource/supprimer-preparation';
import { CartePreparationDto } from '../api/models/carte-preparation-dto';
import { BandeauErreur } from '../commun/bandeau-erreur/bandeau-erreur';
import { DialogueConfirmation } from '../commun/dialogue-confirmation/dialogue-confirmation';
import { erreurPassagere, messageErreur } from '../commun/erreurs/message-erreur';
import { EtatVide } from '../commun/etat-vide/etat-vide';
import { LIBELLES_SECTION, RepereSection } from '../commun/repere-section/repere-section';
import { Squelette } from '../commun/squelette/squelette';
import {
  introuvable,
  MESSAGE_PREPARATION_INTROUVABLE,
  ouvrirDialogueDupliquerPreparation,
  ouvrirDialogueRenommerPreparation,
  PREPARATION_INTROUVABLE,
} from './gerer-preparation-dialogues';
import { nomPreparation } from './nom-preparation';
import { NouvellePreparation } from './nouvelle-preparation';

/** Préparations lues par page sur l'accueil : la taille de page maximale du back. */
const TAILLE_ACCUEIL = 100;

/** « 0 mots », « 1 mot », « 14 mots ». */
export function libelleMots(nombre: number): string {
  return `${nombre} mot${nombre === 1 ? '' : 's'}`;
}

/** Nom accessible du menu d'une Carte : « Actions de la préparation « Roule galette » GS ». */
export function libelleActionsPreparation(carte: CartePreparationDto): string {
  return `Actions de la préparation « ${nomPreparation(carte)} » ${LIBELLES_SECTION[carte.section]}`;
}

/** Échec d'une action de Carte, affiché dans un Bandeau d'erreur ; `reessayer` absent pour un refus du back. */
interface EchecAction {
  readonly message: string;
  readonly reessayer: (() => void) | null;
}

/**
 * Rubrique Préparations (accueil, FR-6) : Cartes des Préparations de l'enseignant, les plus récentes d'abord (nom de
 * la Préparation ou, à défaut, titre de l'Album, Repère de Section, Module, « n mots · n à illustrer »), chacune un lien
 * vers sa Préparation. Squelettes pendant le chargement, Bandeau d'erreur en échec ; sans Préparation, l'État vide et
 * « Nouvelle préparation ».
 *
 * Menu de chaque Carte (story 2.10, FR-11) : « Renommer » et « Dupliquer » ouvrent leur dialogue, qui envoie la
 * requête ; « Supprimer » demande confirmation par le Dialogue de confirmation, puis supprime. Après chaque action, le
 * focus est placé (bouton du menu, Carte créée, Carte suivante, précédente ou « Nouvelle préparation ») et une annonce
 * polie dit ce qui a changé. Un échec de suppression s'affiche dans un Bandeau d'erreur, avec « Réessayer » s'il est
 * passager ; rien n'est changé.
 */
@Component({
  selector: 'app-preparations',
  imports: [
    BandeauErreur,
    EtatVide,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    RepereSection,
    RouterLink,
    Squelette,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../commun/page-rubrique.scss', './preparations.scss'],
  template: `
    <div class="page">
      <h1 class="page__titre">Préparations</h1>

      @if (erreur(); as message) {
        <app-bandeau-erreur
          [message]="message"
          (reessayer)="charger()"
          (fermer)="erreur.set(null)"
        />
      }
      @if (echecAction(); as echec) {
        <app-bandeau-erreur
          class="echec-action"
          [message]="echec.message"
          [reessayable]="echec.reessayer !== null"
          (reessayer)="echec.reessayer?.()"
          (fermer)="echecAction.set(null)"
        />
      }

      @if (preparations(); as cartes) {
        @if (cartes.length === 0) {
          <app-etat-vide
            icone="preparation"
            phrase="Pas encore de préparation. Choisissez un album : les mots déjà illustrés par l'équipe arrivent tout seuls."
          >
            <button
              matButton="filled"
              class="nouvelle-preparation"
              type="button"
              (click)="ouvrirNouvelle($event)"
            >
              Nouvelle préparation
            </button>
          </app-etat-vide>
        } @else {
          <ul class="preparations" aria-label="Mes préparations">
            @for (carte of cartes; track carte.id) {
              <li class="carte">
                <a
                  class="carte__lien"
                  [attr.data-lien]="carte.id"
                  [routerLink]="['/preparations', carte.id]"
                >
                  <span class="carte__couverture" aria-hidden="true">
                    <mat-icon svgIcon="livre" />
                  </span>
                  <span class="carte__corps">
                    <span class="carte__titre">{{ nomPreparation(carte) }}</span>
                    <span class="carte__meta">
                      <app-repere-section [section]="carte.section" />
                      @if (carte.nomModule) {
                        <span class="carte__module">{{ carte.nomModule }}</span>
                      }
                    </span>
                    <span class="carte__compteur"
                      >{{ libelleMots(carte.nombreMots) }} · {{ carte.nombreAIllustrer }} à
                      illustrer</span
                    >
                  </span>
                </a>
                <button
                  matIconButton
                  class="carte__actions"
                  type="button"
                  [attr.data-actions]="carte.id"
                  [attr.aria-label]="libelleActions(carte)"
                  [matMenuTriggerFor]="menuCarte"
                  [matMenuTriggerData]="{ carte }"
                >
                  <mat-icon svgIcon="actions" aria-hidden="true" />
                </button>
              </li>
            }
          </ul>
          <mat-menu #menuCarte="matMenu" xPosition="before">
            <ng-template matMenuContent let-carte="carte">
              <button mat-menu-item type="button" (click)="renommer(carte)">Renommer</button>
              <button mat-menu-item type="button" (click)="dupliquer(carte)">Dupliquer</button>
              <button mat-menu-item type="button" (click)="supprimer(carte)">Supprimer</button>
            </ng-template>
          </mat-menu>
        }
      } @else if (chargementEnCours()) {
        <app-squelette forme="carte" [nombre]="3" />
      }

      <p class="cm-visuellement-masque" aria-live="polite">{{ annonce() }}</p>
    </div>
  `,
})
export class Preparations implements OnInit {
  private readonly api = inject(Api);
  private readonly injecteur = inject(Injector);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly confirmation = inject(DialogueConfirmation);
  private readonly nouvellePreparation = inject(NouvellePreparation);

  protected readonly libelleMots = libelleMots;
  protected readonly libelleActions = libelleActionsPreparation;
  protected readonly nomPreparation = nomPreparation;

  /** `null` tant qu'aucune liste n'a été reçue. */
  protected readonly preparations = signal<CartePreparationDto[] | null>(null);
  protected readonly chargementEnCours = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly echecAction = signal<EchecAction | null>(null);
  protected readonly annonce = signal('');

  /** Vrai pendant une action de Carte (dialogue ouvert ou requête) : une seule à la fois. */
  private actionEnCours = false;

  ngOnInit(): void {
    void this.charger();
  }

  protected ouvrirNouvelle(evenement: Event): void {
    void this.nouvellePreparation.ouvrir(evenement.currentTarget as HTMLElement);
  }

  async charger(): Promise<void> {
    this.chargementEnCours.set(true);
    try {
      // Chaque Préparation a sa Carte : les pages sont lues l'une après l'autre jusqu'au total.
      const cartes: CartePreparationDto[] = [];
      for (let numero = 0; ; numero++) {
        const page = await this.api.invoke(listerMesPreparations, {
          page: numero,
          taille: TAILLE_ACCUEIL,
        });
        cartes.push(...page.elements);
        if (page.elements.length === 0 || cartes.length >= page.total) {
          break;
        }
      }
      this.preparations.set(cartes);
      this.erreur.set(null);
    } catch (erreur) {
      this.erreur.set(messageErreur(erreur));
    } finally {
      this.chargementEnCours.set(false);
    }
  }

  /** « Renommer » : la Carte prend le nom renvoyé ; le focus revient au bouton de son menu. */
  async renommer(carte: CartePreparationDto): Promise<void> {
    if (!this.commencerAction()) {
      return;
    }
    try {
      const renommee = await ouvrirDialogueRenommerPreparation(this.injecteur, carte);
      if (renommee === PREPARATION_INTROUVABLE) {
        this.retirerIntrouvable(carte);
        return;
      }
      if (renommee !== undefined) {
        this.preparations.update((cartes) =>
          cartes === null
            ? cartes
            : cartes.map((existante) => (existante.id === renommee.id ? renommee : existante)),
        );
        this.annoncer('Préparation renommée.');
      }
      this.focaliserMaintenant(`[data-actions="${carte.id}"]`);
    } finally {
      this.actionEnCours = false;
    }
  }

  /** « Dupliquer » : la Carte de la copie arrive en tête et prend le focus ; l'enseignant reste sur l'accueil. */
  async dupliquer(carte: CartePreparationDto): Promise<void> {
    if (!this.commencerAction()) {
      return;
    }
    try {
      const copie = await ouvrirDialogueDupliquerPreparation(this.injecteur, carte);
      if (copie === undefined) {
        this.focaliserMaintenant(`[data-actions="${carte.id}"]`);
        return;
      }
      if (copie === PREPARATION_INTROUVABLE) {
        this.retirerIntrouvable(carte);
        return;
      }
      this.preparations.update((cartes) => [copie, ...(cartes ?? [])]);
      this.annoncer(`Préparation dupliquée pour la ${LIBELLES_SECTION[copie.section]}.`);
      this.focaliser(`[data-lien="${copie.id}"]`);
    } finally {
      this.actionEnCours = false;
    }
  }

  /**
   * « Supprimer », après confirmation : la Carte disparaît, le focus passe à la Carte suivante, sinon à la précédente,
   * sinon à « Nouvelle préparation ». Sans confirmation, rien n'est envoyé et le focus revient au bouton du menu.
   */
  async supprimer(carte: CartePreparationDto): Promise<void> {
    if (!this.commencerAction()) {
      return;
    }
    try {
      const confirme = await this.confirmation.confirmer({
        titre: `Supprimer la préparation « ${nomPreparation(carte)} » ?`,
        phrase: 'Ses mots quittent la préparation ; les images restent dans la banque.',
        libelleConfirmer: 'Supprimer',
      });
      if (!confirme) {
        this.focaliserMaintenant(`[data-actions="${carte.id}"]`);
        return;
      }
      await this.envoyerSuppression(carte);
    } finally {
      this.actionEnCours = false;
    }
  }

  /**
   * Supprime la Préparation confirmée ; en échec, Bandeau d'erreur et rien de changé. Déjà supprimée (`404`, par un autre
   * onglet ou un `204` perdu avant « Réessayer ») : le résultat attendu est là, traité comme un succès.
   */
  private async envoyerSuppression(carte: CartePreparationDto): Promise<void> {
    try {
      await this.api.invoke(supprimerPreparation, { id: carte.id });
    } catch (erreur) {
      if (!introuvable(erreur)) {
        this.echecAction.set({
          message: messageErreur(erreur),
          reessayer: erreurPassagere(erreur) ? () => void this.reessayerSuppression(carte) : null,
        });
        this.focaliserMaintenant(`[data-actions="${carte.id}"]`);
        return;
      }
    }
    this.retirerCarte(carte);
    this.annoncer('Préparation supprimée.');
  }

  /** Préparation supprimée ailleurs, découverte par « Renommer » ou « Dupliquer » : sa Carte disparaît. */
  private retirerIntrouvable(carte: CartePreparationDto): void {
    this.retirerCarte(carte);
    this.echecAction.set({ message: MESSAGE_PREPARATION_INTROUVABLE, reessayer: null });
  }

  /**
   * Retire la Carte ; le focus passe à la Carte suivante, sinon à la précédente, sinon à « Nouvelle préparation ». Une
   * Carte déjà absente de la liste donne le focus à la première Carte.
   */
  private retirerCarte(carte: CartePreparationDto): void {
    const cartes = this.preparations() ?? [];
    const rang = cartes.findIndex((existante) => existante.id === carte.id);
    const restantes = cartes.filter((existante) => existante.id !== carte.id);
    this.preparations.set(restantes);
    const voisine = rang < 0 ? restantes[0] : (restantes[rang] ?? restantes[rang - 1]);
    this.focaliser(voisine ? `[data-lien="${voisine.id}"]` : '.nouvelle-preparation');
  }

  /** « Réessayer » du Bandeau : renvoie la suppression déjà confirmée. */
  private async reessayerSuppression(carte: CartePreparationDto): Promise<void> {
    if (!this.commencerAction()) {
      return;
    }
    try {
      await this.envoyerSuppression(carte);
    } finally {
      this.actionEnCours = false;
    }
  }

  private commencerAction(): boolean {
    if (this.actionEnCours) {
      return false;
    }
    this.actionEnCours = true;
    // L'échec d'une action précédente ne concerne plus la nouvelle.
    this.echecAction.set(null);
    return true;
  }

  /**
   * Annonce `message` dans la région `aria-live` : vidée d'abord, puis remplie après le rendu, pour qu'un même message
   * soit annoncé de nouveau.
   */
  private annoncer(message: string): void {
    this.annonce.set('');
    afterNextRender(() => this.annonce.set(message), { injector: this.injecteur });
  }

  /** Donne le focus à l'élément de la page désigné par `selecteur`, déjà rendu (bouton du menu d'une Carte). */
  private focaliserMaintenant(selecteur: string): void {
    this.hote.nativeElement.querySelector<HTMLElement>(selecteur)?.focus();
  }

  /** Donne le focus, après le rendu que vient de demander un changement de la liste, à l'élément désigné. */
  private focaliser(selecteur: string): void {
    afterNextRender(() => this.hote.nativeElement.querySelector<HTMLElement>(selecteur)?.focus(), {
      injector: this.injecteur,
    });
  }
}

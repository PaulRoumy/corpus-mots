import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { Authentification } from '../commun/authentification/authentification';
import { CompteCourant } from '../commun/compte-courant';
import { MESSAGE_COMPTE_NON_CHARGE, MESSAGES_PAR_CODE } from '../commun/erreurs/message-erreur';
import { AjouterImage } from '../preparations/ajouter-image';
import { NouvellePreparation } from '../preparations/nouvelle-preparation';

/**
 * Coquille de l'application (UX-DR-3, 5, 6) : barre supérieure fixe (marque, Champ de recherche, Bouton « + »,
 * Notifications, Menu de profil), navigation des rubriques à gauche, contenu de la page. L'ordre du DOM est
 * l'ordre de lecture, donc de tabulation. Sous 600 px, la navigation se replie derrière le bouton « Rubriques ».
 * Un compte inactif ou introuvable voit une page sans coquille.
 */
@Component({
  selector: 'app-coquille',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSidenavModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './coquille.scss',
  template: `
    @switch (compteCourant.etat().statut) {
      @case ('compte') {
        <div class="coquille" [class.coquille--mobile]="mobile()">
          <a class="coquille__evitement" href="#contenu" (click)="allerAuContenu($event)"
            >Aller au contenu</a
          >

          <header class="coquille__barre">
            <div class="coquille__entete-marque">
              <a
                class="coquille__marque"
                routerLink="/preparations"
                aria-label="corpus-mots, accueil"
              >
                corpus<span class="coquille__point">·</span>mots
              </a>
              @if (mobile()) {
                <button
                  matButton
                  type="button"
                  aria-controls="rubriques"
                  [attr.aria-expanded]="navigationOuverte()"
                  (click)="navigation.toggle()"
                >
                  Rubriques
                </button>
              }
            </div>

            <div class="coquille__outils">
              <form
                class="coquille__recherche"
                role="search"
                (submit)="chercher($event, champ.value)"
              >
                <mat-icon svgIcon="recherche" aria-hidden="true" />
                <label class="cm-visuellement-masque" for="coquille-recherche"
                  >Chercher un mot</label
                >
                <input
                  #champ
                  id="coquille-recherche"
                  type="search"
                  name="mot"
                  autocomplete="off"
                  placeholder="Chercher un mot"
                />
              </form>

              <span class="coquille__espace"></span>

              <!-- « Importer des fichiers » s'ajoute avec les stories 5.x. -->
              <button
                #plus
                matButton="filled"
                class="coquille__plus"
                type="button"
                aria-label="Ajouter"
                [matMenuTriggerFor]="menuAjouter"
              >
                <mat-icon svgIcon="plus" aria-hidden="true" />
              </button>
              <mat-menu #menuAjouter="matMenu" xPosition="before">
                <button mat-menu-item type="button" (click)="ouvrirNouvellePreparation()">
                  <mat-icon svgIcon="preparation" aria-hidden="true" />
                  Nouvelle préparation
                </button>
                <button mat-menu-item type="button" (click)="ouvrirAjouterImage()">
                  <mat-icon svgIcon="image" aria-hidden="true" />
                  Ajouter une image
                </button>
              </mat-menu>

              <button
                matIconButton
                type="button"
                aria-label="Notifications"
                [matMenuTriggerFor]="menuNotifications"
              >
                <mat-icon svgIcon="cloche" aria-hidden="true" />
              </button>
              <mat-menu #menuNotifications="matMenu" xPosition="before">
                <button mat-menu-item type="button" disabled>Aucune notification</button>
              </mat-menu>

              <button
                matIconButton
                type="button"
                class="coquille__profil"
                [attr.aria-label]="'Menu de profil, ' + nomAffiche()"
                [matMenuTriggerFor]="menuProfil"
              >
                <span class="coquille__avatar" aria-hidden="true">{{ initiale() }}</span>
              </button>
              <mat-menu #menuProfil="matMenu" xPosition="before">
                <p class="coquille__menu-nom" aria-hidden="true">{{ nomAffiche() }}</p>
                <a mat-menu-item routerLink="/mon-compte">Mon compte</a>
                <a mat-menu-item routerLink="/mes-donnees">Mes données</a>
                @if (compteCourant.administrateur()) {
                  <a mat-menu-item routerLink="/administration">Administration</a>
                }
                <button mat-menu-item type="button" (click)="deconnecter()">Se déconnecter</button>
              </mat-menu>
            </div>
          </header>

          <mat-sidenav-container class="coquille__corps">
            <mat-sidenav
              #navigation
              class="coquille__navigation"
              [mode]="mobile() ? 'over' : 'side'"
              [opened]="!mobile()"
              (openedChange)="navigationOuverte.set($event)"
            >
              <nav id="rubriques" class="coquille__rubriques" aria-label="Rubriques">
                @for (rubrique of rubriques; track rubrique.lien) {
                  <a
                    class="coquille__rubrique"
                    [routerLink]="rubrique.lien"
                    routerLinkActive="coquille__rubrique--active"
                    ariaCurrentWhenActive="page"
                    (click)="mobile() && navigation.close()"
                  >
                    <mat-icon [svgIcon]="rubrique.icone" aria-hidden="true" />
                    {{ rubrique.libelle }}
                  </a>
                }
              </nav>
            </mat-sidenav>

            <mat-sidenav-content>
              <main id="contenu" class="coquille__contenu" tabindex="-1">
                <router-outlet />
              </main>
            </mat-sidenav-content>
          </mat-sidenav-container>
        </div>
      }
      @case ('inactif') {
        <main class="coquille__refus">
          <p role="alert">{{ messageInactif }}</p>
          <button matButton="filled" type="button" (click)="deconnecter()">Se déconnecter</button>
        </main>
      }
      @case ('erreur') {
        <main class="coquille__refus">
          <p role="alert">{{ messageNonCharge }}</p>
          <button matButton="filled" type="button" (click)="deconnecter()">Se déconnecter</button>
        </main>
      }
      @case ('chargement') {
        <main class="coquille__refus" aria-busy="true"></main>
      }
    }
  `,
})
export class Coquille {
  protected readonly compteCourant = inject(CompteCourant);
  private readonly authentification = inject(Authentification);
  private readonly router = inject(Router);
  private readonly nouvellePreparation = inject(NouvellePreparation);
  private readonly ajouterImage = inject(AjouterImage);
  private readonly boutonPlus = viewChild('plus', { read: ElementRef<HTMLElement> });

  protected readonly messageInactif = MESSAGES_PAR_CODE['compte.inconnu_ou_inactif'];
  protected readonly messageNonCharge = MESSAGE_COMPTE_NON_CHARGE;

  protected readonly rubriques = [
    { lien: '/preparations', libelle: 'Préparations', icone: 'preparation' },
    { lien: '/banque', libelle: 'Banque', icone: 'banque' },
    { lien: '/fiches', libelle: 'Fiches', icone: 'fiche' },
  ] as const;

  /** Téléphone (< 600 px) : navigation repliée. */
  protected readonly mobile = toSignal(
    inject(BreakpointObserver)
      .observe(Breakpoints.XSmall)
      .pipe(map((etat) => etat.matches)),
    { initialValue: false },
  );
  protected readonly navigationOuverte = signal(false);

  protected readonly nomAffiche = computed(() => this.compteCourant.compte()?.nomAffiche ?? '');
  protected readonly initiale = computed(() =>
    this.nomAffiche().trim().charAt(0).toLocaleUpperCase('fr'),
  );

  constructor() {
    void this.compteCourant.charger();
  }

  /** Entrée dans le Champ de recherche : la Banque filtrée sur ce Mot ; champ vide, rien. */
  protected chercher(evenement: Event, saisie: string): void {
    evenement.preventDefault();
    const mot = saisie.trim();
    if (mot) {
      void this.router.navigate(['/banque'], { queryParams: { mot } });
    }
  }

  /** Lien d'évitement : focus sur le contenu sans changer l'URL (`href="#…"` viserait la racine, à cause de `<base>`). */
  protected allerAuContenu(evenement: Event): void {
    evenement.preventDefault();
    document.getElementById('contenu')?.focus();
  }

  /** Choix « Nouvelle préparation » du Bouton « + » : le focus revient au « + » quand le dialogue se ferme. */
  protected ouvrirNouvellePreparation(): void {
    void this.nouvellePreparation.ouvrir(this.boutonPlus()?.nativeElement);
  }

  /** Choix « Ajouter une image » du Bouton « + » : le focus revient au « + » quand le dialogue se ferme. */
  protected ouvrirAjouterImage(): void {
    void this.ajouterImage.ouvrir(this.boutonPlus()?.nativeElement);
  }

  protected deconnecter(): void {
    void this.authentification.deconnecter();
  }
}

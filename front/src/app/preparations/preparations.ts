import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Api } from '../api/api';
import { listerMesPreparations } from '../api/fn/preparations-resource/lister-mes-preparations';
import { CartePreparationDto } from '../api/models/carte-preparation-dto';
import { BandeauErreur } from '../commun/bandeau-erreur/bandeau-erreur';
import { messageErreur } from '../commun/erreurs/message-erreur';
import { EtatVide } from '../commun/etat-vide/etat-vide';
import { RepereSection } from '../commun/repere-section/repere-section';
import { Squelette } from '../commun/squelette/squelette';
import { NouvellePreparation } from './nouvelle-preparation';

/** Préparations lues par page sur l'accueil : la taille de page maximale du back. */
const TAILLE_ACCUEIL = 100;

/** « 0 mots », « 1 mot », « 14 mots ». */
export function libelleMots(nombre: number): string {
  return `${nombre} mot${nombre === 1 ? '' : 's'}`;
}

/**
 * Rubrique Préparations (accueil, FR-6) : Cartes des Préparations de l'enseignant, les plus récentes d'abord (titre de
 * l'Album, Repère de Section, Module, « n mots · n à illustrer »), chacune un lien vers sa Préparation. Squelettes
 * pendant le chargement, Bandeau d'erreur en échec ; sans Préparation, l'État vide et « Nouvelle préparation ». Le
 * menu de Carte (renommer, dupliquer, supprimer) arrive avec la story 2.10.
 */
@Component({
  selector: 'app-preparations',
  imports: [
    BandeauErreur,
    EtatVide,
    MatButtonModule,
    MatIconModule,
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

      @if (preparations(); as cartes) {
        @if (cartes.length === 0) {
          <app-etat-vide
            icone="preparation"
            phrase="Pas encore de préparation. Choisissez un album : les mots déjà illustrés par l'équipe arrivent tout seuls."
          >
            <button matButton="filled" type="button" (click)="ouvrirNouvelle($event)">
              Nouvelle préparation
            </button>
          </app-etat-vide>
        } @else {
          <ul class="preparations" aria-label="Mes préparations">
            @for (carte of cartes; track carte.id) {
              <li>
                <a class="carte" [routerLink]="['/preparations', carte.id]">
                  <span class="carte__couverture" aria-hidden="true">
                    <mat-icon svgIcon="livre" />
                  </span>
                  <span class="carte__corps">
                    <span class="carte__titre">{{ carte.titreAlbum }}</span>
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
              </li>
            }
          </ul>
        }
      } @else if (chargementEnCours()) {
        <app-squelette forme="carte" [nombre]="3" />
      }
    </div>
  `,
})
export class Preparations implements OnInit {
  private readonly api = inject(Api);
  private readonly nouvellePreparation = inject(NouvellePreparation);

  protected readonly libelleMots = libelleMots;

  /** `null` tant qu'aucune liste n'a été reçue. */
  protected readonly preparations = signal<CartePreparationDto[] | null>(null);
  protected readonly chargementEnCours = signal(false);
  protected readonly erreur = signal<string | null>(null);

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
}

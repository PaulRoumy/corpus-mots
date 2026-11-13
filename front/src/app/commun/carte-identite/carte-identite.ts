import {
  afterNextRender,
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
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Api } from '../../api/api';
import { carteIdentiteImage } from '../../api/fn/images-resource/carte-identite-image';
import { fichierImage } from '../../api/fn/images-resource/fichier-image';
import { CarteIdentiteImageDto } from '../../api/models/carte-identite-image-dto';
import { Annuaire } from '../annuaire';
import { BadgeTypeImage } from '../badge-type-image/badge-type-image';
import { BandeauErreur } from '../bandeau-erreur/bandeau-erreur';
import { CompteCourant } from '../compte-courant';
import { erreurPassagere, messageErreur } from '../erreurs/message-erreur';
import { ChargementImage, ImageSecurisee } from '../image-securisee/image-securisee';
import { LIBELLES_LICENCE, LIBELLES_TYPE_IMAGE } from '../libelles-images';
import { Squelette } from '../squelette/squelette';

/** Valeur affichée d'un champ vide. */
export const CHAMP_VIDE = '—';

/** Propriétaire absent de l'annuaire (compte supprimé). */
export const PROPRIETAIRE_INCONNU = "un ancien membre de l'équipe";

interface ErreurAffichee {
  readonly message: string;
  readonly reessayable: boolean;
}

/**
 * Panneau Carte d'identité d'une Image (story 2.6, partie 1 ; key-banque.html › `.cid`, `dl.ro`), en lecture seule
 * pour tous. `aside` nommé « Carte d'identité » : titre, bouton « Fermer », grande vignette (`?taille=grande`, chargée
 * en `blob`), Badge de type d'image, « basse résolution » pour une image d'album, « lecture seule » pour un
 * non-propriétaire, « à compléter » pour une image libre sans source ou sans licence ; puis les douze champs dans
 * l'ordre du Glossaire : Mot (cursive), Sens, catégorie, Sections, album d'origine (titre puis auteur), Module,
 * Thèmes, type, source, licence, auteur, propriétaire. Un champ vide affiche « — » ; Sections, Module et Thèmes
 * aussi, jusqu'à la partie 3. Un Sens « à compléter » est mis en avant par la couleur, l'icône crayon et le libellé.
 *
 * Le propriétaire est lu dans l'Annuaire, suivi de « (vous) » pour l'enseignant connecté ; absent de l'annuaire
 * chargé, il devient « un ancien membre de l'équipe ».
 *
 * La Carte est lue par `GET /images/{id}` à chaque nouvel `imageId` : squelette pendant la lecture, puis le panneau
 * prend le focus. En échec, le message traduit s'affiche dans un Bandeau d'erreur du panneau, avec « Réessayer » pour
 * une erreur réseau ou serveur. « Fermer » et Échap émettent `fermer` ; la page rend le focus à la vignette.
 */
@Component({
  selector: 'app-carte-identite',
  imports: [
    BadgeTypeImage,
    BandeauErreur,
    ImageSecurisee,
    MatButtonModule,
    MatIconModule,
    Squelette,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './carte-identite.scss',
  host: { '(keydown.escape)': 'fermerParEchap($event)' },
  template: `
    <aside #panneau class="carte-identite" tabindex="-1" aria-labelledby="carte-identite-titre">
      <div class="carte-identite__entete">
        <h2 id="carte-identite-titre" class="carte-identite__titre">Carte d'identité</h2>
        <button
          matIconButton
          class="carte-identite__fermer"
          type="button"
          aria-label="Fermer"
          (click)="fermer.emit()"
        >
          <mat-icon svgIcon="fermer" aria-hidden="true" />
        </button>
      </div>
      @if (carte(); as carte) {
        <div class="carte-identite__vignette">
          @if (echecVignette()) {
            <mat-icon class="carte-identite__repli" svgIcon="image" aria-hidden="true" />
            <span class="cm-visuellement-masque">{{ alternative() }}</span>
          } @else if (chargerVignette(); as charger) {
            <img
              class="carte-identite__image"
              [appImageSecurisee]="charger"
              [alt]="alternative()"
              (echec)="echecVignette.set(true)"
            />
          }
        </div>
        <div class="carte-identite__reperes">
          <app-badge-type-image [type]="carte.typeImage" />
          @if (carte.typeImage === 'image_album') {
            <span class="carte-identite__repere carte-identite__basse-resolution"
              >basse résolution</span
            >
          }
          @if (lectureSeule()) {
            <span class="carte-identite__repere carte-identite__lecture-seule">lecture seule</span>
          }
          @if (carte.aCompleter) {
            <span class="carte-identite__a-completer carte-identite__image-a-completer">
              <mat-icon svgIcon="crayon" aria-hidden="true" />
              à compléter
            </span>
          }
        </div>
        <dl class="carte-identite__champs">
          <dt>Mot</dt>
          <dd>
            <span class="carte-identite__mot">{{ carte.forme }}</span>
          </dd>
          <dt>Sens</dt>
          <dd>
            @if (carte.sens.aCompleter) {
              <span class="carte-identite__a-completer carte-identite__sens-a-completer">
                <mat-icon svgIcon="crayon" aria-hidden="true" />
                à compléter
              </span>
            } @else {
              {{ carte.sens.libelle }}
            }
          </dd>
          <dt>Catégorie</dt>
          <dd>{{ carte.sens.categorie || vide }}</dd>
          <dt>Sections</dt>
          <dd>{{ vide }}</dd>
          <dt>Album d'origine</dt>
          <dd>
            @if (carte.albumOrigine; as album) {
              <span class="carte-identite__album">
                <span>{{ album.titre }}</span
                ><span class="cm-visuellement-masque">, </span>
                <span class="carte-identite__album-auteur">{{ album.auteur }}</span>
              </span>
            } @else {
              {{ vide }}
            }
          </dd>
          <dt>Module</dt>
          <dd>{{ vide }}</dd>
          <dt>Thèmes</dt>
          <dd>{{ vide }}</dd>
          <dt>Type</dt>
          <dd>{{ libellesTypes[carte.typeImage] }}</dd>
          <dt>Source</dt>
          <dd>{{ carte.source || vide }}</dd>
          <dt>Licence</dt>
          <dd>{{ carte.licence ? libellesLicences[carte.licence] : vide }}</dd>
          <dt>Auteur</dt>
          <dd>{{ carte.auteur || vide }}</dd>
          <dt>Propriétaire</dt>
          <dd class="carte-identite__proprietaire">{{ proprietaire() }}</dd>
        </dl>
      } @else if (erreur(); as affichee) {
        <app-bandeau-erreur
          class="carte-identite__erreur"
          [message]="affichee.message"
          [reessayable]="affichee.reessayable"
          (reessayer)="lire(imageId())"
          (fermer)="fermer.emit()"
        />
      } @else {
        <app-squelette class="carte-identite__squelette" forme="texte" [nombre]="6" />
      }
    </aside>
  `,
})
export class CarteIdentite {
  /** Image dont la Carte d'identité est affichée ; en changer relit la Carte. */
  readonly imageId = input.required<string>();
  readonly fermer = output<void>();

  private readonly api = inject(Api);
  private readonly annuaire = inject(Annuaire);
  private readonly compteCourant = inject(CompteCourant);
  private readonly injecteur = inject(Injector);

  protected readonly vide = CHAMP_VIDE;
  protected readonly libellesTypes = LIBELLES_TYPE_IMAGE;
  protected readonly libellesLicences = LIBELLES_LICENCE;

  protected readonly carte = signal<CarteIdentiteImageDto | null>(null);
  protected readonly erreur = signal<ErreurAffichee | null>(null);

  private readonly panneau = viewChild.required<ElementRef<HTMLElement>>('panneau');

  /** Grande taille de l'Image, d'identité stable tant que l'Image affichée ne change pas. */
  private readonly idAffiche = computed(() => this.carte()?.id ?? null);
  protected readonly chargerVignette = computed<ChargementImage | null>(() => {
    const id = this.idAffiche();
    return id === null ? null : () => this.api.invoke(fichierImage, { id, taille: 'grande' });
  });
  protected readonly echecVignette = linkedSignal({
    source: this.idAffiche,
    computation: () => false,
  });

  /** Alternative de la vignette : « citrouille, légume ». */
  protected readonly alternative = computed(() => {
    const carte = this.carte();
    return carte === null ? '' : `${carte.forme}, ${carte.sens.libelle}`;
  });

  /** « lecture seule » pour un non-propriétaire, une fois le compte connu. */
  protected readonly lectureSeule = computed(() => {
    const carte = this.carte();
    const compte = this.compteCourant.compte();
    return carte !== null && compte !== null && compte.id !== carte.proprietaireId;
  });

  /** Nom affiché du propriétaire, « (vous) » pour l'enseignant connecté. */
  protected readonly proprietaire = computed(() => {
    const carte = this.carte();
    if (carte === null) {
      return CHAMP_VIDE;
    }
    const compte = this.compteCourant.compte();
    const moi = compte !== null && compte.id === carte.proprietaireId;
    const nom =
      this.annuaire.enseignant(carte.proprietaireId)?.nomAffiche ??
      (moi ? compte.nomAffiche : null);
    if (nom !== null) {
      return moi ? `${nom} (vous)` : nom;
    }
    return this.annuaire.etat().statut === 'charge' ? PROPRIETAIRE_INCONNU : CHAMP_VIDE;
  });

  /** Numéro de la dernière lecture : la réponse d'une Image remplacée depuis n'écrit rien. */
  private derniereLecture = 0;

  constructor() {
    void this.annuaire.charger();
    effect(() => {
      const id = this.imageId();
      untracked(() => {
        void this.lire(id);
        afterNextRender(() => this.focus(), { injector: this.injecteur });
      });
    });
  }

  /** Donne le focus au panneau. */
  focus(): void {
    this.panneau().nativeElement.focus();
  }

  protected async lire(id: string): Promise<void> {
    const numero = ++this.derniereLecture;
    this.carte.set(null);
    this.erreur.set(null);
    try {
      const carte = await this.api.invoke(carteIdentiteImage, { id });
      if (numero === this.derniereLecture) {
        this.carte.set(carte);
      }
    } catch (erreur) {
      if (numero === this.derniereLecture) {
        this.erreur.set({ message: messageErreur(erreur), reessayable: erreurPassagere(erreur) });
      }
    }
  }

  protected fermerParEchap(evenement: Event): void {
    evenement.stopPropagation();
    this.fermer.emit();
  }
}

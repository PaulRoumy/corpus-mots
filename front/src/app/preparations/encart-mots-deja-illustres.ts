import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
  viewChildren,
  ElementRef,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Api } from '../api/api';
import { fichierImage } from '../api/fn/images-resource/fichier-image';
import { annulerEcartMotPreparation } from '../api/fn/preparations-resource/annuler-ecart-mot-preparation';
import { ecarterMotPreparation } from '../api/fn/preparations-resource/ecarter-mot-preparation';
import { listerReprisesPreparation } from '../api/fn/preparations-resource/lister-reprises-preparation';
import { reprendreMotsPreparation } from '../api/fn/preparations-resource/reprendre-mots-preparation';
import { reutiliserImageMotPreparation } from '../api/fn/preparations-resource/reutiliser-image-mot-preparation';
import { DetectionImageDto } from '../api/models/detection-image-dto';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';
import { RepriseMotPreparationDto } from '../api/models/reprise-mot-preparation-dto';
import { BandeauAnnuler } from '../commun/bandeau-annuler/bandeau-annuler';
import { BandeauErreur } from '../commun/bandeau-erreur/bandeau-erreur';
import { codeErreur, erreurPassagere, messageErreur } from '../commun/erreurs/message-erreur';
import { ChargementImage, ImageSecurisee } from '../commun/image-securisee/image-securisee';

/** « 9 mots déjà illustrés pour cet album », « 1 mot déjà illustré pour cet album ». */
export function titreEncart(nombre: number): string {
  return nombre === 1
    ? '1 mot déjà illustré pour cet album'
    : `${nombre} mots déjà illustrés pour cet album`;
}

/** « 1 mot n'a pas pu être repris. », « 2 mots n'ont pas pu être repris. » */
export function messageReprisePartielle(nombre: number): string {
  return nombre === 1
    ? "1 mot n'a pas pu être repris."
    : `${nombre} mots n'ont pas pu être repris.`;
}

/** « chute (nom) », ou le seul libellé pour un Sens sans catégorie. */
export function libelleSensReprise(reprise: RepriseMotPreparationDto): string {
  return reprise.sens.categorie
    ? `${reprise.sens.libelle} (${reprise.sens.categorie})`
    : reprise.sens.libelle;
}

/** Refus d'une reprise dont l'Image n'est plus proposable ou n'illustre plus ce Mot (y compris sous verrou). */
const CODES_IMAGE_INDISPONIBLE: ReadonlySet<string> = new Set([
  'image.indisponible',
  'image.sens_different',
  'preparation.sens_invalide',
]);

/** Nombre maximal de Mots par requête « Tout reprendre » (le back refuse au-delà). */
export const REPRISES_PAR_LOT = 200;

/** « 1 mot repris. », « 3 mots repris. » */
function messageRepris(nombre: number): string {
  return nombre === 1 ? '1 mot repris.' : `${nombre} mots repris.`;
}

/** Identifiant du titre propre à chaque Encart. */
let prochainEncart = 0;

/** Message d'un refus métier de la reprise de `forme`, affiché avant de recharger l'Encart. */
export function messageRefusReprise(forme: string, erreur: unknown): string {
  const code = codeErreur(erreur);
  if (code === 'preparation.mot_deja_present') {
    return `« ${forme} » est déjà dans la préparation.`;
  }
  if (code !== null && CODES_IMAGE_INDISPONIBLE.has(code)) {
    return `« ${forme} » n'a pas pu être repris : son image n'est plus disponible.`;
  }
  return `« ${forme} » n'a pas pu être repris. ${messageErreur(erreur)}`;
}

/** Échec réseau ou serveur d'un geste de l'Encart, que « Réessayer » relance ; sinon un message seul. */
interface EchecEncart {
  readonly message: string;
  readonly reessayer: (() => void) | null;
}

/**
 * Vignette de 56 px de l'Image proposée d'un Mot de l'Encart : miniature chargée en `blob` (`?taille=miniature`),
 * l'icône d'image si elle ne se charge pas ; alternative « Mot, Sens ».
 */
@Component({
  selector: 'app-vignette-reprise',
  imports: [ImageSecurisee, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'encart__photo' },
  styles: `
    .encart__image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .encart__repli {
      width: var(--cm-taille-icone-grande);
      height: var(--cm-taille-icone-grande);
    }
  `,
  template: `
    @if (echec()) {
      <mat-icon class="encart__repli" svgIcon="image" aria-hidden="true" />
    } @else {
      <img
        class="encart__image"
        [appImageSecurisee]="charger()"
        [alt]="forme() + ', ' + image().sens.libelle"
        (echec)="echec.set(true)"
      />
    }
  `,
})
export class VignetteReprise {
  readonly image = input.required<DetectionImageDto>();
  readonly forme = input.required<string>();

  private readonly api = inject(Api);
  private readonly imageId = computed(() => this.image().id);
  protected readonly charger = computed<ChargementImage>(() => {
    const id = this.imageId();
    return () => this.api.invoke(fichierImage, { id, taille: 'miniature' });
  });
  protected readonly echec = linkedSignal({ source: this.imageId, computation: () => false });
}

/**
 * Encart « mots déjà illustrés » de la Préparation (story 2.9, FR-7), sous le Champ de saisie rapide : les Mots déjà
 * illustrés pour l'Album, calculés par le back (`GET …/reprises`, AD-2), chacun avec la vignette de 56 px de son Image
 * proposée, sa forme en cursive, son Sens et deux boutons, « Reprendre » et « Écarter », nommés avec la forme. Fond
 * `tertiary-container`, arrondi `lg` (jeton `encart-mots-deja-illustres` de DESIGN.md). Région nommée par son titre
 * (« 9 mots déjà illustrés pour cet album »), mis à jour à chaque geste et annoncé poliment (`annonce`, par la
 * région `aria-live` de la page) ; l'Encart disparaît quand
 * il est vide. Un Mot ajouté entre-temps à la Préparation (`motsPresents`) n'y est plus montré.
 *
 * « Reprendre » ajoute le Mot avec son Image (`POST …/mots/reutilisation`, origine `reutilisee`) ; « Tout reprendre »
 * envoie les Mots affichés (`POST …/reprises`) : le back ajoute ceux qui sont encore candidats, et si certains sont
 * ignorés, « n mots n'ont pas pu être repris. » s'affiche et l'Encart est rechargé. Les Mots ajoutés sont émis
 * (`ajoutes`) : la page les met en fin de Grille. « Écarter » retire le Mot de l'Encart (`PUT …/ecartes/{motId}`) ; le
 * Bandeau « Annuler » (8 s) retire l'écart (`DELETE`) et relit l'Encart. Après une reprise ou un écart, le focus passe au bouton
 * « Reprendre » du Mot suivant, sinon du précédent, sinon au Champ de saisie rapide (`focusChamp`) quand l'Encart
 * disparaît. Échec réseau : Bandeau d'erreur avec « Réessayer », Encart inchangé ; refus métier d'une reprise : son
 * message, puis l'Encart est rechargé.
 */
@Component({
  selector: 'app-encart-mots-deja-illustres',
  imports: [BandeauErreur, MatButtonModule, MatIconModule, VignetteReprise],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './encart-mots-deja-illustres.scss',
  template: `
    @if (echec(); as affiche) {
      <app-bandeau-erreur
        class="erreur-encart"
        [message]="affiche.message"
        [reessayable]="affiche.reessayer !== null"
        (reessayer)="reessayer(affiche)"
        (fermer)="echec.set(null)"
      />
    }
    @if (affiches().length > 0) {
      <section class="encart" [attr.aria-labelledby]="idTitre">
        <div class="encart__tete">
          <h2 [id]="idTitre" class="encart__titre">
            <mat-icon svgIcon="historique" aria-hidden="true" />
            {{ titre() }}
          </h2>
          <button matButton="filled" class="encart__tout" type="button" (click)="toutReprendre()">
            Tout reprendre
          </button>
        </div>
        <ul class="encart__liste">
          @for (reprise of affiches(); track reprise.motId) {
            <li class="encart__mot">
              <app-vignette-reprise [image]="reprise.image" [forme]="reprise.forme" />
              <span class="encart__texte">
                <span class="encart__forme">{{ reprise.forme }}</span>
                <span class="encart__sens">{{ libelleSens(reprise) }}</span>
                @if (reprise.image.dejaUtilisee) {
                  <span class="encart__marque">
                    <mat-icon svgIcon="historique" aria-hidden="true" />
                    déjà utilisée
                  </span>
                }
              </span>
              <span class="encart__actions">
                <button
                  #reprendre
                  matButton="tonal"
                  class="encart__reprendre"
                  type="button"
                  [attr.aria-label]="'Reprendre « ' + reprise.forme + ' »'"
                  (click)="reprendreUn(reprise)"
                >
                  Reprendre
                </button>
                <button
                  matButton
                  class="encart__ecarter"
                  type="button"
                  [attr.aria-label]="'Écarter « ' + reprise.forme + ' »'"
                  (click)="ecarter(reprise)"
                >
                  Écarter
                </button>
              </span>
            </li>
          }
        </ul>
      </section>
    }
  `,
})
export class EncartMotsDejaIllustres {
  readonly preparationId = input.required<string>();
  /** Mots du Lexique déjà dans la Préparation (Grille) : l'Encart ne les montre plus. */
  readonly motsPresents = input<ReadonlySet<string>>(new Set());
  /** Mots ajoutés à la Préparation par une reprise, dans l'ordre. */
  readonly ajoutes = output<MotPreparationDto[]>();
  /** Changement à annoncer poliment (geste et nouveau titre), par la région `aria-live` de la page. */
  readonly annonce = output<string>();
  /** L'Encart a disparu après un geste : le focus revient au Champ de saisie rapide. */
  readonly focusChamp = output<void>();

  private readonly api = inject(Api);
  private readonly bandeauAnnuler = inject(BandeauAnnuler);
  private readonly injecteur = inject(Injector);

  protected readonly libelleSens = libelleSensReprise;
  protected readonly idTitre = `encart-titre-${++prochainEncart}`;

  /** Mots candidats renvoyés par le back, dans l'ordre de l'Encart. */
  protected readonly reprises = signal<RepriseMotPreparationDto[]>([]);
  /** Candidats montrés : ceux qui ne sont pas déjà dans la Grille. */
  protected readonly affiches = computed(() => {
    const presents = this.motsPresents();
    return this.reprises().filter((reprise) => !presents.has(reprise.motId));
  });
  protected readonly titre = computed(() => titreEncart(this.affiches().length));
  /**
   * Vrai pendant un geste : les autres gestes sont ignorés jusqu'à la réponse. Les boutons ne sont pas désactivés, pour
   * ne pas perdre le focus.
   */
  protected readonly occupe = signal(false);
  protected readonly echec = signal<EchecEncart | null>(null);
  private readonly boutonsReprendre = viewChildren('reprendre', { read: ElementRef });

  /** Numéro du dernier chargement : une réponse pour une Préparation quittée n'écrit rien. */
  private chargement = 0;

  constructor() {
    effect(() => {
      const id = this.preparationId();
      untracked(() => {
        this.reprises.set([]);
        this.echec.set(null);
        this.occupe.set(false);
        void this.charger(id);
      });
    });
  }

  /**
   * Lit les candidats, dans l'ordre du back ; en échec, un Bandeau d'erreur avec « Réessayer » (la Préparation reste
   * utilisable sans l'Encart).
   */
  async charger(id: string = this.preparationId()): Promise<void> {
    const numero = ++this.chargement;
    try {
      const reprises = await this.api.invoke(listerReprisesPreparation, { id });
      if (numero === this.chargement) {
        this.reprises.set(reprises);
      }
    } catch (erreur) {
      if (numero === this.chargement) {
        this.echec.set({ message: messageErreur(erreur), reessayer: () => void this.charger(id) });
      }
    }
  }

  protected reessayer(affiche: EchecEncart): void {
    this.echec.set(null);
    affiche.reessayer?.();
  }

  /** « Reprendre » : le Mot est ajouté avec son Image proposée, puis quitte l'Encart. */
  protected async reprendreUn(reprise: RepriseMotPreparationDto): Promise<void> {
    if (this.occupe()) {
      return;
    }
    const id = this.preparationId();
    const numero = this.chargement;
    this.occupe.set(true);
    this.echec.set(null);
    try {
      const ajoute = await this.api.invoke(reutiliserImageMotPreparation, {
        id,
        body: { motId: reprise.motId, imageId: reprise.image.id },
      });
      if (numero !== this.chargement) {
        return;
      }
      this.ajoutes.emit([ajoute]);
      this.retirer(reprise, `« ${ajoute.forme} » repris avec son image.`);
    } catch (erreur) {
      if (numero !== this.chargement) {
        return;
      }
      if (erreurPassagere(erreur) || codeErreur(erreur) === null) {
        this.echec.set({
          message: `« ${reprise.forme} » n'a pas été repris. ${messageErreur(erreur)}`,
          reessayer: () => void this.reprendreUn(reprise),
        });
        return;
      }
      this.echec.set({ message: messageRefusReprise(reprise.forme, erreur), reessayer: null });
      await this.recharger();
    } finally {
      if (numero === this.chargement) {
        this.occupe.set(false);
      }
    }
  }

  /**
   * « Tout reprendre » : les Mots affichés partent par lots de {@link REPRISES_PAR_LOT}, dans l'ordre ; ceux que le back
   * ignore sont signalés. Un lot en échec arrête l'envoi : les Mots déjà ajoutés sont émis, les autres restent.
   */
  protected async toutReprendre(): Promise<void> {
    if (this.occupe()) {
      return;
    }
    const id = this.preparationId();
    const numero = this.chargement;
    const motIds = this.affiches().map((reprise) => reprise.motId);
    this.occupe.set(true);
    this.echec.set(null);
    const ajoutes: MotPreparationDto[] = [];
    let ignores = 0;
    try {
      for (let debut = 0; debut < motIds.length; debut += REPRISES_PAR_LOT) {
        const lot = motIds.slice(debut, debut + REPRISES_PAR_LOT);
        const ajoutesDuLot = await this.api.invoke(reprendreMotsPreparation, {
          id,
          body: { motIds: lot },
        });
        if (numero !== this.chargement) {
          return;
        }
        ajoutes.push(...ajoutesDuLot);
        ignores += lot.length - ajoutesDuLot.length;
      }
      this.appliquerReprises(ajoutes);
      if (ignores > 0) {
        this.echec.set({ message: messageReprisePartielle(ignores), reessayer: null });
        await this.recharger();
      }
      const restants = this.affiches().length;
      this.annoncer(
        restants > 0
          ? `${messageRepris(ajoutes.length)} ${this.titre()}.`
          : messageRepris(ajoutes.length),
      );
      this.focaliserApresRendu(0);
    } catch (erreur) {
      if (numero !== this.chargement) {
        return;
      }
      this.appliquerReprises(ajoutes);
      this.echec.set({
        message: `Les mots n'ont pas été repris. ${messageErreur(erreur)}`,
        reessayer: erreurPassagere(erreur) ? () => void this.toutReprendre() : null,
      });
    } finally {
      if (numero === this.chargement) {
        this.occupe.set(false);
      }
    }
  }

  /** Mots repris : émis vers la page et retirés de l'Encart. */
  private appliquerReprises(ajoutes: MotPreparationDto[]): void {
    if (ajoutes.length === 0) {
      return;
    }
    this.ajoutes.emit(ajoutes);
    const repris = new Set(ajoutes.map((mot) => mot.motId));
    this.reprises.update((reprises) => reprises.filter((reprise) => !repris.has(reprise.motId)));
  }

  /** « Écarter » : une fois enregistré, le Mot quitte l'Encart et le Bandeau « Annuler » propose de l'y rendre. */
  protected async ecarter(reprise: RepriseMotPreparationDto): Promise<void> {
    if (this.occupe()) {
      return;
    }
    const id = this.preparationId();
    const numero = this.chargement;
    this.occupe.set(true);
    this.echec.set(null);
    try {
      await this.api.invoke(ecarterMotPreparation, { id, motId: reprise.motId });
      if (numero !== this.chargement) {
        return;
      }
      this.retirer(reprise, `« ${reprise.forme} » écarté.`);
      this.bandeauAnnuler.afficher(
        `« ${reprise.forme} » écarté des mots déjà illustrés.`,
        () => void this.annulerEcart(id, reprise, numero),
      );
    } catch (erreur) {
      if (numero !== this.chargement) {
        return;
      }
      this.echec.set({
        message: `« ${reprise.forme} » n'a pas été écarté. ${messageErreur(erreur)}`,
        reessayer: () => void this.ecarter(reprise),
      });
    } finally {
      if (numero === this.chargement) {
        this.occupe.set(false);
      }
    }
  }

  /**
   * « Annuler » : l'écart est retiré, puis l'Encart est relu (ordre du back). Si le Mot y est de nouveau, son bouton
   * « Reprendre » prend le focus et « rendu » est annoncé ; un Mot qui n'est plus candidat (repris ailleurs, déjà dans
   * la Grille) ne revient pas. Pendant un autre geste, l'annulation est proposée de nouveau par « Réessayer ».
   */
  private async annulerEcart(
    id: string,
    reprise: RepriseMotPreparationDto,
    numero: number,
  ): Promise<void> {
    if (numero !== this.chargement) {
      return;
    }
    if (this.occupe()) {
      this.echec.set({
        message: `« ${reprise.forme} » n'a pas été rendu : une autre action est en cours.`,
        reessayer: () => void this.annulerEcart(id, reprise, numero),
      });
      return;
    }
    this.occupe.set(true);
    this.echec.set(null);
    try {
      await this.api.invoke(annulerEcartMotPreparation, { id, motId: reprise.motId });
      if (numero !== this.chargement) {
        return;
      }
      await this.recharger();
      const index = this.affiches().findIndex((autre) => autre.motId === reprise.motId);
      if (index >= 0) {
        this.annoncer(`« ${reprise.forme} » rendu. ${this.titre()}.`);
        this.focaliserApresRendu(index);
      }
    } catch (erreur) {
      if (numero !== this.chargement) {
        return;
      }
      this.echec.set({
        message: `« ${reprise.forme} » n'a pas été rendu. ${messageErreur(erreur)}`,
        reessayer: erreurPassagere(erreur)
          ? () => void this.annulerEcart(id, reprise, numero)
          : null,
      });
    } finally {
      if (numero === this.chargement) {
        this.occupe.set(false);
      }
    }
  }

  /** Le Mot quitte l'Encart ; annonce du geste et du nouveau titre, focus au Mot voisin ou au champ. */
  private retirer(reprise: RepriseMotPreparationDto, geste: string): void {
    const index = this.affiches().findIndex((autre) => autre.motId === reprise.motId);
    this.reprises.update((reprises) => reprises.filter((autre) => autre.motId !== reprise.motId));
    const restants = this.affiches().length;
    this.annoncer(restants > 0 ? `${geste} ${this.titre()}.` : geste);
    this.focaliserApresRendu(index < restants ? index : restants - 1);
  }

  /**
   * Relit les candidats, sans changer de chargement : les gestes en cours restent valables. La page l'appelle aussi
   * après le retrait (ou le rétablissement) d'un Mot de la Grille, qui redevient candidat (ou ne l'est plus).
   */
  async recharger(): Promise<void> {
    const numero = this.chargement;
    try {
      const reprises = await this.api.invoke(listerReprisesPreparation, {
        id: this.preparationId(),
      });
      if (numero === this.chargement) {
        this.reprises.set(reprises);
      }
    } catch {
      // L'Encart garde ce qu'il montrait ; le prochain geste ou la prochaine ouverture le corrigera.
    }
  }

  /** Après le rendu, focus au bouton « Reprendre » de la place `index`, ou au champ si l'Encart a disparu. */
  private focaliserApresRendu(index: number): void {
    afterNextRender(
      () => {
        const boutons = this.boutonsReprendre();
        if (boutons.length === 0) {
          this.focusChamp.emit();
          return;
        }
        const bouton = boutons[Math.min(Math.max(index, 0), boutons.length - 1)];
        (bouton.nativeElement as HTMLButtonElement).focus();
      },
      { injector: this.injecteur },
    );
  }

  private annoncer(message: string): void {
    this.annonce.emit(message);
  }
}

import { DestroyRef, inject, signal } from '@angular/core';
import { Api } from '../../api/api';
import { verserImages } from '../../api/fn/images-resource/verser-images';
import { RefusVersementImageDto } from '../../api/models/refus-versement-image-dto';
import { ResultatVersementLotDto } from '../../api/models/resultat-versement-lot-dto';
import { erreurPassagere, messageErreur } from '../erreurs/message-erreur';
import { Selection } from '../selection/selection';
import { MESSAGE_VERSEMENT, MESSAGE_VERSEMENT_PLURIEL, raisonRefusLot } from './raisons-versement';

/** Identifiants envoyés par appel de `POST /images/versements` : le maximum du back. */
export const TAILLE_PAQUET_VERSEMENT = 500;

/** Élément refusé par un versement en lot, tel que le récapitulatif le nomme. */
export interface RefusAffiche {
  /** Image refusée, ou clé propre à la page pour un élément refusé avant l'envoi (Mot sans Image). */
  readonly cle: string;
  /** « « loup » (animal) : raison ». */
  readonly texte: string;
}

/** Résultat cumulé d'un versement en lot, sur tous ses paquets. */
export interface ResultatVersement {
  readonly versees: number;
  readonly dejaVersees: number;
  readonly refusees: readonly RefusAffiche[];
}

export const RESULTAT_VIDE: ResultatVersement = { versees: 0, dejaVersees: 0, refusees: [] };

/** Récapitulatif d'un versement en lot, affiché dans la Barre d'actions en lot. */
export interface RecapitulatifVersement {
  /** Message de partage, si au moins une Image est versée. */
  readonly partage: string | null;
  /** « 2 images versées. 1 était déjà dans la banque. » */
  readonly bilan: string;
  readonly refusees: readonly RefusAffiche[];
}

/** Échec d'un versement en lot, affiché dans son propre Bandeau d'erreur. */
export interface EchecVersement {
  readonly message: string;
  readonly reessayable: boolean;
}

/** Récapitulatif d'un versement en lot : message de partage, bilan, puis les refusées et leur raison. */
export function recapitulatifVersement(resultat: ResultatVersement): RecapitulatifVersement {
  const { versees, dejaVersees } = resultat;
  let bilan =
    versees === 0
      ? 'Aucune image versée.'
      : `${versees} image${versees > 1 ? 's' : ''} versée${versees > 1 ? 's' : ''}.`;
  if (dejaVersees > 0) {
    bilan +=
      dejaVersees === 1
        ? ' 1 était déjà dans la banque.'
        : ` ${dejaVersees} étaient déjà dans la banque.`;
  }
  return {
    partage: versees === 0 ? null : versees === 1 ? MESSAGE_VERSEMENT : MESSAGE_VERSEMENT_PLURIEL,
    bilan,
    refusees: resultat.refusees,
  };
}

/**
 * Ajoute la réponse d'un paquet au résultat acquis ; une Image n'est refusée qu'une fois (la dernière raison reçue),
 * et ne l'est plus si elle est versée depuis.
 */
export function fusionnerResultat(
  acquis: ResultatVersement,
  reponse: ResultatVersementLotDto,
  noms: ReadonlyMap<string, string>,
): ResultatVersement {
  const refusees = new Map(acquis.refusees.map((refus) => [refus.cle, refus]));
  for (const refus of reponse.refusees) {
    refusees.set(refus.imageId, refusAffiche(refus, noms));
  }
  for (const id of [...reponse.versees, ...reponse.dejaVersees]) {
    refusees.delete(id);
  }
  return {
    versees: acquis.versees + reponse.versees.length,
    dejaVersees: acquis.dejaVersees + reponse.dejaVersees.length,
    refusees: [...refusees.values()],
  };
}

/** Nom d'un refus dont l'Image n'était pas nommée à l'envoi (réponse inattendue du back). */
const NOM_INCONNU = 'Élément inconnu';

/** « « loup » (animal) : raison » d'une Image refusée. */
function refusAffiche(
  refus: RefusVersementImageDto,
  noms: ReadonlyMap<string, string>,
): RefusAffiche {
  const nom = noms.get(refus.imageId) ?? NOM_INCONNU;
  return {
    cle: refus.imageId,
    texte: `${nom} : ${raisonRefusLot(refus.code, refus.licence ?? null)}`,
  };
}

/** Lot de versement : ce qui reste à envoyer, les noms pris à l'envoi et le résultat déjà acquis. */
interface LotVersement {
  readonly restants: readonly string[];
  readonly noms: ReadonlyMap<string, string>;
  readonly resultat: ResultatVersement;
}

/** Ce que la page fournit au versement en lot. */
export interface OptionsVersementLot {
  /** Sélection de la page, figée pendant l'envoi. */
  readonly selection: Selection;
  /** Images des éléments encore sélectionnés : « Réessayer » n'envoie qu'elles. */
  readonly imagesSelectionnees: () => ReadonlySet<string>;
  /**
   * Images versées ou déjà versées par un paquet : la page met ses cartes à jour (« versée »), les sort de la sélection
   * et relit la Carte d'identité ouverte sur l'une d'elles.
   */
  readonly appliquer: (imageIds: readonly string[]) => void;
}

/**
 * Orchestration d'un versement en lot (story 3.3, UX-DR-12), partagée par la Banque et la Préparation : paquets de 500
 * envoyés l'un après l'autre, sélection figée, chaque paquet appliqué aussitôt par la page, réponses fusionnées en un
 * récapitulatif (message de partage, bilan, refusées et leur raison). Échec : Bandeau propre au versement, avec le
 * récapitulatif des paquets appliqués ; « Réessayer », pour une erreur passagère seulement, envoie les Images non
 * envoyées encore sélectionnées et complète le même récapitulatif. Un changement de contexte (`changerDeContexte`) ou
 * la page détruite arrêtent l'envoi sans plus rien écrire, sauf le journal.
 *
 * Créée par la page dans son contexte d'injection (champ initialisé), comme `Selection`.
 */
export class VersementLot {
  private readonly api = inject(Api);
  private readonly etatEnCours = signal(false);
  /** Vrai pendant l'envoi d'un lot. */
  readonly enCours = this.etatEnCours.asReadonly();
  /** Récapitulatif du dernier versement en lot. */
  readonly recapitulatif = signal<RecapitulatifVersement | null>(null);
  /** Échec du dernier versement en lot, indépendant des erreurs de la page. */
  readonly erreur = signal<EchecVersement | null>(null);
  private readonly journalVersements: string[] = [];
  /** Lot en échec réessayable : « Réessayer » le reprend. */
  private lotEnEchec: LotVersement | null = null;
  /** Contexte de la sélection : un versement lancé dans un autre n'écrit plus rien. */
  private contexte = 0;
  private detruite = false;

  constructor(private readonly options: OptionsVersementLot) {
    inject(DestroyRef).onDestroy(() => (this.detruite = true));
  }

  /** Images versées ou déjà versées, dans l'ordre : une lecture partie avant peut les reprendre en `versee`. */
  get journal(): readonly string[] {
    return this.journalVersements;
  }

  /** Vrai tant qu'un lot en échec attend « Réessayer » : les gestes de sélection ne ferment pas le récapitulatif. */
  repriseEnAttente(): boolean {
    return this.lotEnEchec !== null;
  }

  /**
   * Nouveau lot : `imageIds` dans l'ordre de la page, `noms` des Images pour le récapitulatif (pris à l'envoi), et
   * `refusesAvant`, éléments refusés sans envoi (Mot sans Image). Vrai si le récapitulatif complet est affiché.
   */
  verser(
    imageIds: readonly string[],
    noms: ReadonlyMap<string, string>,
    refusesAvant: readonly RefusAffiche[] = [],
  ): Promise<boolean> {
    if (this.etatEnCours()) {
      return Promise.resolve(false);
    }
    this.lotEnEchec = null;
    this.erreur.set(null);
    this.recapitulatif.set(null);
    return this.envoyer({
      restants: [...new Set(imageIds)],
      noms,
      resultat: { ...RESULTAT_VIDE, refusees: refusesAvant },
    });
  }

  /** « Réessayer » : les Images non envoyées du lot en échec encore sélectionnées, dans le même récapitulatif. */
  reessayer(): Promise<boolean> {
    const lot = this.lotEnEchec;
    if (lot === null || this.etatEnCours()) {
      return Promise.resolve(false);
    }
    const selectionnees = this.options.imagesSelectionnees();
    this.lotEnEchec = null;
    this.erreur.set(null);
    return this.envoyer({ ...lot, restants: lot.restants.filter((id) => selectionnees.has(id)) });
  }

  /** Bandeau du versement fermé : plus de reprise ; le récapitulatif partiel reste. */
  fermerErreur(): void {
    this.erreur.set(null);
    this.lotEnEchec = null;
  }

  fermerRecapitulatif(): void {
    this.recapitulatif.set(null);
  }

  /** Ferme le récapitulatif, sauf s'il résume un lot en échec que « Réessayer » doit compléter. */
  fermerRecapitulatifLibre(): void {
    if (this.lotEnEchec === null) {
      this.recapitulatif.set(null);
    }
  }

  /**
   * Contexte quitté (provenance, filtres, autre Préparation) : récapitulatif, échec et reprise oubliés, envoi arrêté ;
   * le nouveau contexte n'attend pas la réponse en cours (plus de « Versement… », sélection libre).
   */
  changerDeContexte(): void {
    this.contexte++;
    this.etatEnCours.set(false);
    this.options.selection.figer(false);
    this.recapitulatif.set(null);
    this.erreur.set(null);
    this.lotEnEchec = null;
  }

  private async envoyer(lot: LotVersement): Promise<boolean> {
    const contexte = this.contexte;
    const actuel = () => !this.detruite && contexte === this.contexte;
    const selection = this.options.selection;
    this.etatEnCours.set(true);
    selection.figer(true);
    let resultat = lot.resultat;
    let reste = lot.restants;
    try {
      while (reste.length > 0) {
        const paquet = reste.slice(0, TAILLE_PAQUET_VERSEMENT);
        const reponse = await this.api.invoke(verserImages, { body: { imageIds: [...paquet] } });
        reste = reste.slice(paquet.length);
        this.journalVersements.push(...reponse.versees, ...reponse.dejaVersees);
        if (!actuel()) {
          return false;
        }
        this.options.appliquer([...reponse.versees, ...reponse.dejaVersees]);
        resultat = fusionnerResultat(resultat, reponse, lot.noms);
      }
    } catch (erreur) {
      if (!actuel()) {
        return false;
      }
      const reessayable = erreurPassagere(erreur);
      this.lotEnEchec = reessayable ? { ...lot, restants: reste, resultat } : null;
      this.erreur.set({ message: messageErreur(erreur), reessayable });
      // Les paquets déjà appliqués sont résumés avec le Bandeau.
      if (resultat.versees + resultat.dejaVersees + resultat.refusees.length > 0) {
        this.recapitulatif.set(recapitulatifVersement(resultat));
      }
      return false;
    } finally {
      // Contexte changé : il a déjà tout remis à zéro, et un autre lot a pu partir depuis.
      if (contexte === this.contexte) {
        this.etatEnCours.set(false);
        selection.figer(false);
      }
    }
    this.recapitulatif.set(recapitulatifVersement(resultat));
    return true;
  }
}

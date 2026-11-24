/**
 * Nom d'une Image par son Mot et son Sens, partagé par la vignette de la Banque (« Carte d'identité de … »), sa Case de
 * sélection (« Sélectionner … ») et le récapitulatif d'un versement en lot (Banque et Préparation) : « « loup »
 * (animal) », ou « « loup » » sans Sens.
 */
export function nomImage(forme: string, sensLibelle: string | null | undefined): string {
  return `« ${forme} »${sensLibelle ? ` (${sensLibelle})` : ''}`;
}

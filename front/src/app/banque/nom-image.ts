/**
 * Nom d'une Image de la Banque, partagé par la vignette (« Carte d'identité de … »), sa Case de sélection
 * (« Sélectionner … ») et le récapitulatif d'un versement en lot : « « loup » (animal) », ou « « loup » » sans Sens.
 */
export function nomImage(forme: string, sensLibelle: string | null | undefined): string {
  return `« ${forme} »${sensLibelle ? ` (${sensLibelle})` : ''}`;
}

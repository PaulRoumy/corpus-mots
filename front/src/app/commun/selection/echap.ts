/**
 * Vrai si Échap vient d'un champ de saisie, d'un menu ouvert ou d'un élément de `ignores` (sélecteurs CSS propres à la
 * page) : il ne vide pas la sélection (story 3.3). Partagé par la Banque et la Préparation.
 */
export function echapDeSaisieOuMenu(
  cible: EventTarget | null,
  ignores: readonly string[] = [],
): boolean {
  if (!(cible instanceof Element)) {
    return false;
  }
  if (cible.closest(['[role="menu"]', '.mat-mdc-menu-panel', ...ignores].join(', '))) {
    return true;
  }
  if (cible instanceof HTMLTextAreaElement || cible instanceof HTMLSelectElement) {
    return true;
  }
  return (
    cible instanceof HTMLInputElement &&
    !['checkbox', 'radio', 'button', 'submit', 'reset'].includes(cible.type)
  );
}

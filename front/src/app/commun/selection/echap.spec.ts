import { echapDeSaisieOuMenu } from './echap';

describe('echapDeSaisieOuMenu', () => {
  function element(html: string, selecteur: string): Element {
    const racine = document.createElement('div');
    racine.innerHTML = html;
    return racine.querySelector(selecteur)!;
  }

  it('champs de texte, zone de texte et liste déroulante : ignorés', () => {
    expect(echapDeSaisieOuMenu(element('<input type="text">', 'input'))).toBe(true);
    expect(echapDeSaisieOuMenu(element('<input type="search">', 'input'))).toBe(true);
    expect(echapDeSaisieOuMenu(element('<textarea></textarea>', 'textarea'))).toBe(true);
    expect(echapDeSaisieOuMenu(element('<select></select>', 'select'))).toBe(true);
  });

  it('case, bouton radio et boutons : pris en compte', () => {
    for (const type of ['checkbox', 'radio', 'button', 'submit', 'reset']) {
      expect(echapDeSaisieOuMenu(element(`<input type="${type}">`, 'input'))).toBe(false);
    }
    expect(echapDeSaisieOuMenu(element('<button></button>', 'button'))).toBe(false);
  });

  it('dans un menu ouvert : ignoré', () => {
    expect(echapDeSaisieOuMenu(element('<div role="menu"><button></button></div>', 'button'))).toBe(
      true,
    );
    expect(
      echapDeSaisieOuMenu(element('<div class="mat-mdc-menu-panel"><span></span></div>', 'span')),
    ).toBe(true);
  });

  it('dans un élément de la liste `ignores` : ignoré ; hors de la liste, pris en compte', () => {
    const bouton = element(
      '<mat-form-field><div class="mat-mdc-select"><button></button></div></mat-form-field>',
      'button',
    );
    expect(echapDeSaisieOuMenu(bouton)).toBe(false);
    expect(echapDeSaisieOuMenu(bouton, ['mat-form-field'])).toBe(true);
    expect(echapDeSaisieOuMenu(bouton, ['.mat-mdc-select'])).toBe(true);
    expect(echapDeSaisieOuMenu(bouton, ['app-panneau-detection'])).toBe(false);
  });

  it('cible absente ou hors du DOM des éléments : pris en compte', () => {
    expect(echapDeSaisieOuMenu(null)).toBe(false);
    expect(echapDeSaisieOuMenu(window)).toBe(false);
  });
});

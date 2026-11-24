import { signal } from '@angular/core';
import { Selection } from './selection';

describe('Selection', () => {
  const affiches = signal<readonly string[]>(['a', 'b', 'c', 'd', 'e', 'f']);
  let selection: Selection;

  beforeEach(() => {
    affiches.set(['a', 'b', 'c', 'd', 'e', 'f']);
    selection = new Selection(() => affiches());
  });

  it('bascule : coche puis décoche, nombre et activité suivent', () => {
    expect(selection.active()).toBe(false);
    selection.basculer('b');
    expect(selection.estSelectionne('b')).toBe(true);
    expect(selection.nombre()).toBe(1);
    expect(selection.active()).toBe(true);
    selection.basculer('b');
    expect(selection.estSelectionne('b')).toBe(false);
    expect(selection.active()).toBe(false);
  });

  it('identifiants : dans l’ordre d’affichage, pas dans l’ordre des clics', () => {
    selection.basculer('e');
    selection.basculer('a');
    selection.basculer('c');
    expect(selection.identifiants()).toEqual(['a', 'c', 'e']);
  });

  it('plage : de l’ancre (dernier basculé) jusqu’à l’élément, sans rien désélectionner', () => {
    selection.basculer('f');
    selection.basculer('b');
    selection.selectionnerPlage('e');
    expect(selection.identifiants()).toEqual(['b', 'c', 'd', 'e', 'f']);
  });

  it('plage vers le haut ; l’ancre reste après une plage', () => {
    selection.basculer('d');
    selection.selectionnerPlage('b');
    expect(selection.identifiants()).toEqual(['b', 'c', 'd']);
    selection.selectionnerPlage('f');
    expect(selection.identifiants()).toEqual(['b', 'c', 'd', 'e', 'f']);
  });

  it('plage sans ancre : l’élément est basculé et devient l’ancre', () => {
    selection.selectionnerPlage('c');
    expect(selection.identifiants()).toEqual(['c']);
    selection.selectionnerPlage('e');
    expect(selection.identifiants()).toEqual(['c', 'd', 'e']);
  });

  it('plage sans ancre sur un élément déjà sélectionné : il reste sélectionné et devient l’ancre', () => {
    selection.toutSelectionner();
    selection.retirer(['a', 'b', 'c', 'e', 'f']);
    selection.selectionnerPlage('d');
    expect(selection.identifiants()).toEqual(['d']);
    selection.selectionnerPlage('b');
    expect(selection.identifiants()).toEqual(['b', 'c', 'd']);
  });

  it('tout sélectionner : tous les affichés ; tout désélectionner vide et oublie l’ancre', () => {
    selection.basculer('b');
    selection.toutSelectionner();
    expect(selection.nombre()).toBe(6);
    selection.toutDeselectionner();
    expect(selection.nombre()).toBe(0);
    selection.selectionnerPlage('d');
    expect(selection.identifiants()).toEqual(['d']);
  });

  it('réduction : ne garde que les identifiants encore affichés, ancre comprise', () => {
    selection.basculer('a');
    selection.basculer('c');
    affiches.set(['c', 'd', 'e']);
    selection.garderSeulement(affiches());
    expect(selection.identifiants()).toEqual(['c']);
    expect(selection.nombre()).toBe(1);
  });

  it('réduction : ancre disparue, la plage suivante part de zéro', () => {
    selection.basculer('a');
    selection.garderSeulement(['b', 'c', 'd']);
    selection.selectionnerPlage('d');
    expect(selection.identifiants()).toEqual(['d']);
  });

  it('retirer : ôte les identifiants donnés seulement', () => {
    selection.toutSelectionner();
    selection.retirer(['a', 'c', 'z']);
    expect(selection.identifiants()).toEqual(['b', 'd', 'e', 'f']);
  });

  it('figée : les gestes sont ignorés, la page peut retirer, réduire et réinitialiser', () => {
    selection.basculer('a');
    selection.basculer('b');
    selection.figer(true);
    selection.basculer('c');
    selection.selectionnerPlage('f');
    selection.toutSelectionner();
    selection.toutDeselectionner();
    expect(selection.identifiants()).toEqual(['a', 'b']);
    selection.retirer(['a']);
    expect(selection.identifiants()).toEqual(['b']);
    selection.reinitialiser();
    expect(selection.nombre()).toBe(0);
    selection.figer(false);
    selection.basculer('c');
    expect(selection.identifiants()).toEqual(['c']);
  });
});

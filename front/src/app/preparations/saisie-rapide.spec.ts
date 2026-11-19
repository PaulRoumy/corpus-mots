import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LONGUEUR_MAX_SAISIE, SaisieRapide } from './saisie-rapide';

@Component({
  imports: [SaisieRapide],
  template: `<app-saisie-rapide
    [focusInitial]="focusInitial()"
    [idListe]="'liste'"
    [deplie]="deplie()"
    [idActif]="idActif()"
    (ajouter)="ajoutes.push($event)"
    (naviguer)="navigations.push($event)"
    (saisieModifiee)="saisies.push($event)"
  />`,
})
class Hote {
  readonly focusInitial = signal(false);
  readonly deplie = signal(false);
  readonly idActif = signal<string | null>(null);
  readonly navigations: string[] = [];
  readonly ajoutes: string[] = [];
  readonly saisies: string[] = [];
  readonly saisie = viewChild.required(SaisieRapide);
}

describe('SaisieRapide', () => {
  let fixture: ComponentFixture<Hote>;
  let racine: HTMLElement;

  const champ = () => racine.querySelector<HTMLInputElement>('input')!;

  async function creer(focusInitial: boolean) {
    fixture = TestBed.createComponent(Hote);
    fixture.componentInstance.focusInitial.set(focusInitial);
    racine = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  }

  async function entree(saisie: string) {
    champ().value = saisie;
    champ().dispatchEvent(new Event('input'));
    champ().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    await fixture.whenStable();
  }

  it('prend le focus à l’affichage si demandé, pas sinon', async () => {
    await creer(true);
    expect(document.activeElement).toBe(champ());

    fixture.destroy();
    await creer(false);
    expect(document.activeElement).not.toBe(champ());
  });

  it('Entrée émet la saisie rognée et vide le champ ; une saisie blanche n’émet rien', async () => {
    await creer(true);

    await entree('  la citrouille ');
    expect(champ().value).toBe('');
    expect(document.activeElement).toBe(champ());

    await entree('   ');
    expect(fixture.componentInstance.ajoutes).toEqual(['la citrouille']);
  });

  it('émet chaque valeur du champ pour la détection : frappe, vidage après Entrée, saisie refusée remise', async () => {
    await creer(true);

    champ().value = 'fa';
    champ().dispatchEvent(new Event('input'));
    await entree('farine');
    fixture.componentInstance.saisie().refuser('Ce mot est déjà dans la préparation.', 'farine');
    await fixture.whenStable();

    expect(fixture.componentInstance.saisies).toEqual(['fa', 'farine', '', 'farine']);
    expect(document.activeElement).toBe(champ());
  });

  it('combobox ARIA 1.2 : état déplié, liste contrôlée et option active suivent le panneau', async () => {
    await creer(true);
    expect(champ().getAttribute('role')).toBe('combobox');
    expect(champ().getAttribute('aria-autocomplete')).toBe('list');
    expect(champ().getAttribute('aria-expanded')).toBe('false');
    expect(champ().hasAttribute('aria-controls')).toBe(false);
    expect(champ().hasAttribute('aria-activedescendant')).toBe(false);

    fixture.componentInstance.deplie.set(true);
    fixture.componentInstance.idActif.set('liste-image-i1');
    await fixture.whenStable();
    expect(champ().getAttribute('aria-expanded')).toBe('true');
    expect(champ().getAttribute('aria-controls')).toBe('liste');
    expect(champ().getAttribute('aria-activedescendant')).toBe('liste-image-i1');
  });

  it('↓ et ↑ émis seulement quand la liste est dépliée, sans déplacer le curseur ; Échap seulement avec un choix', async () => {
    await creer(true);
    const touche = (key: string) => {
      const evenement = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      champ().dispatchEvent(evenement);
      return evenement;
    };

    expect(touche('ArrowDown').defaultPrevented).toBe(false);
    expect(touche('Escape').defaultPrevented).toBe(false);
    expect(fixture.componentInstance.navigations).toEqual([]);

    fixture.componentInstance.deplie.set(true);
    await fixture.whenStable();
    expect(touche('ArrowDown').defaultPrevented).toBe(true);
    expect(touche('ArrowUp').defaultPrevented).toBe(true);
    expect(touche('Escape').defaultPrevented).toBe(false);

    fixture.componentInstance.idActif.set('liste-image-i1');
    await fixture.whenStable();
    const echap = touche('Escape');
    expect(echap.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.navigations).toEqual(['suivant', 'precedent', 'annuler']);
    expect(document.activeElement).toBe(champ());
  });

  it('vider : champ vidé, message retiré, focus rendu', async () => {
    await creer(false);
    champ().value = 'farine';
    champ().dispatchEvent(new Event('input'));

    fixture.componentInstance.saisie().vider();
    await fixture.whenStable();

    expect(champ().value).toBe('');
    expect(document.activeElement).toBe(champ());
    expect(fixture.componentInstance.saisies.at(-1)).toBe('');
  });

  it('limite la saisie à 100 caractères plus l’article le plus long et son espace', async () => {
    await creer(false);
    expect(LONGUEUR_MAX_SAISIE).toBe(104);
    expect(champ().maxLength).toBe(LONGUEUR_MAX_SAISIE);
  });

  it('refuser : message annoncé sous le champ, saisie remise seulement si le champ est vide', async () => {
    await creer(true);

    fixture.componentInstance.saisie().refuser('Ce mot est déjà dans la préparation.', 'lapin');
    await fixture.whenStable();
    expect(champ().value).toBe('lapin');
    expect(racine.querySelector('[role="alert"]')?.textContent?.trim()).toBe(
      'Ce mot est déjà dans la préparation.',
    );

    champ().value = 'loup';
    champ().dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(racine.querySelector('[role="alert"]')).toBeNull();

    fixture.componentInstance.saisie().refuser('Ce mot est déjà dans la préparation.', 'ours');
    await fixture.whenStable();
    expect(champ().value).toBe('loup');
    expect(racine.querySelector('[role="alert"]')).not.toBeNull();
  });
});

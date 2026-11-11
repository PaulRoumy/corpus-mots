import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LONGUEUR_MAX_SAISIE, SaisieRapide } from './saisie-rapide';

@Component({
  imports: [SaisieRapide],
  template: `<app-saisie-rapide
    [focusInitial]="focusInitial()"
    (ajouter)="ajoutes.push($event)"
  />`,
})
class Hote {
  readonly focusInitial = signal(false);
  readonly ajoutes: string[] = [];
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

import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { BarreActionsLot, libelleSelection } from './barre-actions-lot';

@Component({
  imports: [BarreActionsLot],
  template: `
    <app-barre-actions-lot
      [nombre]="nombre()"
      [ouverte]="ouverte()"
      [figee]="figee()"
      [annoncer]="annoncer()"
      (toutSelectionner)="tout = tout + 1"
      (deselectionner)="aucun = aucun + 1"
    >
      <button type="button" class="action">Verser</button>
      <p barreActionsLotSuite class="suite">Récapitulatif</p>
    </app-barre-actions-lot>
  `,
})
class Hote {
  readonly nombre = signal(0);
  readonly ouverte = signal(false);
  readonly figee = signal(false);
  readonly annoncer = signal(true);
  tout = 0;
  aucun = 0;
}

describe('BarreActionsLot', () => {
  let fixture: ComponentFixture<Hote>;
  let racine: HTMLElement;
  const announce = vi.fn(() => Promise.resolve());

  beforeEach(async () => {
    announce.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        { provide: LiveAnnouncer, useValue: { announce } },
      ],
    });
    fixture = TestBed.createComponent(Hote);
    racine = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  const barre = () => racine.querySelector('.barre-actions-lot');
  const bouton = (libelle: string) =>
    [...racine.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent?.trim() === libelle,
    );
  async function poser(modifier: (hote: Hote) => void) {
    modifier(fixture.componentInstance);
    await fixture.whenStable();
  }

  it('accorde le libellé', () => {
    expect(libelleSelection(0)).toBe('Aucune image sélectionnée');
    expect(libelleSelection(1)).toBe('1 image sélectionnée');
    expect(libelleSelection(650)).toBe('650 images sélectionnées');
  });

  it('sans sélection : masquée, rien d’annoncé', () => {
    expect(barre()).toBeNull();
    expect(announce).not.toHaveBeenCalled();
  });

  it('avec une sélection : nombre, « Tout sélectionner », « Désélectionner », actions projetées, suite', async () => {
    await poser((hote) => hote.nombre.set(1));

    expect(barre()?.getAttribute('role')).toBe('region');
    expect(racine.querySelector('.barre-actions-lot__nombre')?.textContent?.trim()).toBe(
      '1 image sélectionnée',
    );
    expect(
      [...racine.querySelectorAll('button')].map((b) => b.textContent?.trim()),
    ).toEqual(['Tout sélectionner', 'Désélectionner', 'Verser']);
    expect(racine.querySelector('.barre-actions-lot .suite')).not.toBeNull();

    bouton('Tout sélectionner')!.click();
    bouton('Désélectionner')!.click();
    expect(fixture.componentInstance.tout).toBe(1);
    expect(fixture.componentInstance.aucun).toBe(1);
  });

  it('chaque changement du nombre est annoncé poliment, le retour à zéro aussi', async () => {
    await poser((hote) => hote.nombre.set(1));
    await poser((hote) => hote.nombre.set(4));
    await poser((hote) => hote.nombre.set(4));
    await poser((hote) => hote.nombre.set(0));
    expect(announce.mock.calls).toEqual([
      ['1 image sélectionnée.', 'polite'],
      ['4 images sélectionnées.', 'polite'],
      ['Aucune image sélectionnée.', 'polite'],
    ]);
    expect(barre()).toBeNull();
  });

  it('annoncer à faux : le changement du nombre n’est pas annoncé, le suivant l’est', async () => {
    await poser((hote) => {
      hote.nombre.set(3);
      hote.annoncer.set(false);
    });
    await poser((hote) => {
      hote.nombre.set(2);
      hote.annoncer.set(true);
    });
    expect(announce.mock.calls).toEqual([['2 images sélectionnées.', 'polite']]);
  });

  it('ouverte sans sélection : affichée, sans « Désélectionner »', async () => {
    await poser((hote) => hote.ouverte.set(true));
    expect(barre()).not.toBeNull();
    expect(racine.querySelector('.barre-actions-lot__nombre')?.textContent?.trim()).toBe(
      'Aucune image sélectionnée',
    );
    expect(bouton('Désélectionner')).toBeUndefined();
  });

  it('figée : « Tout sélectionner » et « Désélectionner » indisponibles mais focusables', async () => {
    await poser((hote) => {
      hote.nombre.set(2);
      hote.figee.set(true);
    });
    for (const libelle of ['Tout sélectionner', 'Désélectionner']) {
      expect(bouton(libelle)?.getAttribute('aria-disabled')).toBe('true');
      expect(bouton(libelle)?.hasAttribute('disabled')).toBe(false);
      bouton(libelle)!.click();
    }
    expect(fixture.componentInstance.tout).toBe(0);
    expect(fixture.componentInstance.aucun).toBe(0);
  });
});

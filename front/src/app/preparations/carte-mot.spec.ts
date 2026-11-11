import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcones } from '../commun/icones';
import { CarteMot } from './carte-mot';

describe('CarteMot', () => {
  let fixture: ComponentFixture<CarteMot>;
  let racine: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideIcones()] });
    fixture = TestBed.createComponent(CarteMot);
    fixture.componentRef.setInput('mot', {
      id: '0190f0a0-0000-7000-8000-0000000f0001',
      motId: '0190f0a0-0000-7000-8000-0000000e0001',
      forme: 'citrouille',
      ordre: 1,
      sens: { id: '0190f0a0-0000-7000-8000-0000000d0001', libelle: 'à compléter' },
      illustre: false,
    });
    await fixture.whenStable();
    racine = fixture.nativeElement as HTMLElement;
  });

  const boutonRetirer = () => racine.querySelector<HTMLButtonElement>('.carte-mot__retirer')!;

  it('Carte « à illustrer » : vignette vide, Mot en cursive, badge « à illustrer »', () => {
    expect(racine.classList).toContain('carte-mot--a-illustrer');
    expect(racine.querySelector('.carte-mot__vignette')?.getAttribute('aria-hidden')).toBe('true');
    expect(racine.querySelector('.carte-mot__mot')?.textContent?.trim()).toBe('citrouille');
    expect(racine.querySelector('.carte-mot__etat')?.textContent?.trim()).toBe('à illustrer');
  });

  it('bouton icône « Retirer « citrouille » de la préparation » (croix), toujours visible', () => {
    expect(boutonRetirer().getAttribute('type')).toBe('button');
    expect(boutonRetirer().getAttribute('aria-label')).toBe(
      'Retirer « citrouille » de la préparation',
    );
    expect(boutonRetirer().querySelector('mat-icon[svgIcon="fermer"]')).not.toBeNull();
    expect(boutonRetirer().hidden).toBe(false);
  });

  it('« Retirer » émet `retirer` ; `focusRetirer` lui donne le focus', () => {
    let retraits = 0;
    fixture.componentInstance.retirer.subscribe(() => retraits++);

    boutonRetirer().click();
    fixture.componentInstance.focusRetirer();

    expect(retraits).toBe(1);
    expect(document.activeElement).toBe(boutonRetirer());
  });
});

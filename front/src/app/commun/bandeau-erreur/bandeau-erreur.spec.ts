import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideIcones } from '../icones';
import { BandeauErreur } from './bandeau-erreur';

@Component({
  imports: [BandeauErreur],
  template: `
    <input id="saisie" />
    @if (affiche()) {
      <app-bandeau-erreur
        [message]="message()"
        [reessayable]="reessayable()"
        (reessayer)="reessais = reessais + 1"
        (fermer)="affiche.set(false)"
      />
    }
  `,
})
class Page {
  readonly affiche = signal(true);
  readonly message = signal(
    'Connexion au serveur impossible. Vérifiez votre réseau, puis réessayez.',
  );
  readonly reessayable = signal(true);
  reessais = 0;
}

describe('BandeauErreur', () => {
  let fixture: ComponentFixture<Page>;
  let racine: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Page],
      providers: [
        provideIcones(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    fixture = TestBed.createComponent(Page);
    racine = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  const bandeau = () => racine.querySelector<HTMLElement>('app-bandeau-erreur .bandeau-erreur');
  const alerte = () => racine.querySelector<HTMLElement>('app-bandeau-erreur [role="alert"]');
  const bouton = (libelle: string) =>
    [...racine.querySelectorAll<HTMLButtonElement>('app-bandeau-erreur button')].find(
      (element) =>
        element.textContent?.trim() === libelle || element.getAttribute('aria-label') === libelle,
    )!;

  it('affiche le message dans une alerte, avec icône, « Réessayer » et « Fermer »', () => {
    // Seul le message est annoncé, pas les libellés des boutons.
    expect(alerte()?.tagName).toBe('P');
    expect(alerte()?.textContent?.trim()).toBe(
      'Connexion au serveur impossible. Vérifiez votre réseau, puis réessayez.',
    );
    expect(bandeau()?.textContent).toContain(
      'Connexion au serveur impossible. Vérifiez votre réseau, puis réessayez.',
    );
    expect(bandeau()?.querySelector('mat-icon[svgIcon="alerte"]')).not.toBeNull();
    expect(bouton('Réessayer')).toBeDefined();
    expect(bouton('Fermer')).toBeDefined();
  });

  it('Réessayer : événement émis, bandeau toujours affiché, saisie intacte', async () => {
    const saisie = racine.querySelector<HTMLInputElement>('#saisie')!;
    saisie.value = 'galette';
    bouton('Réessayer').click();
    bouton('Réessayer').click();
    await fixture.whenStable();
    expect(fixture.componentInstance.reessais).toBe(2);
    expect(bandeau()).not.toBeNull();
    expect(saisie.value).toBe('galette');
  });

  it('suit le message que lui donne le parent', async () => {
    fixture.componentInstance.message.set("Cet élément n'existe plus. Rechargez la page.");
    await fixture.whenStable();
    expect(bandeau()?.textContent).toContain("Cet élément n'existe plus. Rechargez la page.");
  });

  it('Fermer : événement émis, le parent retire le bandeau', async () => {
    bouton('Fermer').click();
    await fixture.whenStable();
    expect(bandeau()).toBeNull();
    expect(fixture.componentInstance.reessais).toBe(0);
  });
});

describe('BandeauErreur sans « Réessayer »', () => {
  it('reessayable à faux : message et « Fermer » seuls', async () => {
    TestBed.configureTestingModule({
      imports: [Page],
      providers: [
        provideIcones(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    const fixture = TestBed.createComponent(Page);
    fixture.componentInstance.reessayable.set(false);
    await fixture.whenStable();
    const racine = fixture.nativeElement as HTMLElement;
    const libelles = [...racine.querySelectorAll('app-bandeau-erreur button')].map(
      (bouton) => bouton.textContent?.trim() || bouton.getAttribute('aria-label'),
    );

    expect(racine.querySelector('app-bandeau-erreur [role="alert"]')).not.toBeNull();
    expect(libelles).toEqual(['Fermer']);
  });
});

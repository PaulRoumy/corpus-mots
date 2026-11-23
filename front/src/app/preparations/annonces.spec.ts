import { ApplicationRef, Component, inject } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Annonces } from './annonces';

@Component({
  providers: [Annonces],
  template: `<p aria-live="polite">{{ annonces.texte() }}</p>`,
})
class Hote {
  readonly annonces = inject(Annonces);
}

describe('Annonces', () => {
  let fixture: ComponentFixture<Hote>;
  let region: HTMLElement;
  let annonces: Annonces;
  /** Textes successifs de la région. */
  let textes: string[];
  let observateur: MutationObserver;

  const tour = () => new Promise((fin) => setTimeout(fin));

  async function stabiliser() {
    await tour();
    await TestBed.inject(ApplicationRef).whenStable();
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(Hote);
    await stabiliser();
    region = (fixture.nativeElement as HTMLElement).querySelector('p')!;
    annonces = fixture.componentInstance.annonces;
    textes = [];
    observateur = new MutationObserver(() => textes.push(region.textContent ?? ''));
    observateur.observe(region, { childList: true, characterData: true, subtree: true });
  });

  afterEach(() => observateur.disconnect());

  it('annonce après le rendu', async () => {
    annonces.annoncer('« loup » ajouté.');
    await stabiliser();

    expect(region.textContent).toBe('« loup » ajouté.');
  });

  it('un même message est vidé puis répété', async () => {
    annonces.annoncer('Image de « farine » changée.');
    await stabiliser();
    annonces.annoncer('Image de « farine » changée.');
    await stabiliser();

    expect(textes.filter((texte) => texte === 'Image de « farine » changée.')).toHaveLength(2);
  });

  it('deux annonces dans le même tour : la dernière, entière, jamais vidée ensuite', async () => {
    annonces.annoncer('« loup » ajouté.');
    annonces.annoncer('« renard » repris.');
    await stabiliser();
    await stabiliser();

    expect(region.textContent).toBe('« renard » repris.');
    expect(textes.at(-1)).toBe('« renard » repris.');
    expect(textes).not.toContain('« loup » ajouté.');
  });

  it('`effacer` vide la région et abandonne l’annonce en attente', async () => {
    annonces.annoncer('« loup » ajouté.');
    await stabiliser();
    annonces.annoncer('« renard » repris.');
    annonces.effacer();
    await stabiliser();

    expect(region.textContent).toBe('');
  });

  it('pas fourni en `root`', () => {
    expect(() => TestBed.inject(Annonces)).toThrow();
  });
});

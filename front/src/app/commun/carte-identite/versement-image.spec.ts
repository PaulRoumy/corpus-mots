import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import {
  LIBELLE_VERSEMENT_EN_COURS,
  LIBELLE_VERSER,
  MESSAGE_VERSEMENT,
} from '../versement/raisons-versement';
import { VersementImage } from './versement-image';

describe('VersementImage', () => {
  let fixture: ComponentFixture<VersementImage>;
  let racine: HTMLElement;
  let emissions: number;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }],
    });
    fixture = TestBed.createComponent(VersementImage);
    fixture.componentRef.setInput('versabilite', 'versable');
    emissions = 0;
    fixture.componentInstance.verser.subscribe(() => emissions++);
    racine = fixture.nativeElement as HTMLElement;
    document.body.appendChild(racine);
    await fixture.whenStable();
  });

  afterEach(() => racine.remove());

  const bouton = () => racine.querySelector<HTMLButtonElement>('button');
  const message = () => racine.querySelector<HTMLElement>('.versement__message');

  async function poser(entrees: Record<string, unknown>) {
    for (const [nom, valeur] of Object.entries(entrees)) {
      fixture.componentRef.setInput(nom, valeur);
    }
    await fixture.whenStable();
  }

  it('versable : bouton actif qui émet `verser`, sans raison', () => {
    expect(bouton()?.textContent?.trim()).toBe(LIBELLE_VERSER);
    expect(bouton()?.getAttribute('aria-disabled')).not.toBe('true');
    expect(bouton()?.hasAttribute('aria-describedby')).toBe(false);

    bouton()!.click();
    expect(emissions).toBe(1);
  });

  it('refus : bouton indisponible mais focusable, raison liée, clic sans effet', async () => {
    await poser({ versabilite: 'image.versement.licence_non_versable', licence: 'pixabay' });

    expect(bouton()?.getAttribute('aria-disabled')).toBe('true');
    expect(bouton()?.hasAttribute('disabled')).toBe(false);
    bouton()!.focus();
    expect(document.activeElement).toBe(bouton());
    const raison = document.getElementById(bouton()!.getAttribute('aria-describedby')!);
    expect(raison?.textContent?.trim()).toBe('Verser indisponible : licence non partageable.');

    bouton()!.click();
    expect(emissions).toBe(0);
  });

  it('en cours : « Versement… », indisponible, clic sans effet', async () => {
    await poser({ enCours: true });

    expect(bouton()?.textContent?.trim()).toBe(LIBELLE_VERSEMENT_EN_COURS);
    expect(bouton()?.getAttribute('aria-disabled')).toBe('true');
    bouton()!.click();
    expect(emissions).toBe(0);
  });

  it('versée : le message remplace le bouton, sans région vive, et prend le focus', async () => {
    await poser({ versabilite: null, versee: true });

    expect(bouton()).toBeNull();
    expect(message()?.textContent?.trim()).toBe(MESSAGE_VERSEMENT);
    expect(message()?.hasAttribute('role')).toBe(false);
    expect(message()?.hasAttribute('aria-live')).toBe(false);
    fixture.componentInstance.focusMessage();
    expect(document.activeElement).toBe(message());
  });

  it('versabilité nulle sans versement : rien n’est affiché', async () => {
    await poser({ versabilite: null });

    expect(bouton()).toBeNull();
    expect(message()).toBeNull();
  });
});

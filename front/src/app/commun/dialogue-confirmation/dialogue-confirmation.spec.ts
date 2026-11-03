import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { DialogueConfirmation } from './dialogue-confirmation';

const DEMANDE = {
  titre: 'Supprimer cette image ?',
  phrase: 'Elle disparaîtra de vos préparations.',
  libelleConfirmer: "Supprimer l'image",
};

describe('DialogueConfirmation', () => {
  let dialogue: DialogueConfirmation;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } }],
    });
    dialogue = TestBed.inject(DialogueConfirmation);
  });

  const tour = () => new Promise((fin) => setTimeout(fin));

  /** Ouvre le dialogue et attend qu'il soit rendu et que le focus initial soit posé. */
  async function ouvrir(): Promise<{ reponse: Promise<boolean> }> {
    const reponse = dialogue.confirmer(DEMANDE);
    await TestBed.inject(ApplicationRef).whenStable();
    await tour();
    return { reponse };
  }

  const panneau = () => document.querySelector<HTMLElement>('mat-dialog-container');
  const bouton = (libelle: string) =>
    [...document.querySelectorAll<HTMLButtonElement>('mat-dialog-container button')].find(
      (element) => element.textContent?.trim() === libelle,
    )!;

  async function fermeture(reponse: Promise<boolean>): Promise<boolean> {
    const valeur = await reponse;
    await TestBed.inject(ApplicationRef).whenStable();
    return valeur;
  }

  it('montre titre, phrase, « Annuler » puis le bouton grave au libellé fourni', async () => {
    const { reponse } = await ouvrir();
    expect(panneau()?.getAttribute('role')).toBe('alertdialog');
    const description = panneau()?.getAttribute('aria-describedby');
    expect(description).toBe('dialogue-confirmation-phrase');
    expect(document.getElementById(description!)?.textContent?.trim()).toBe(
      'Elle disparaîtra de vos préparations.',
    );
    expect(panneau()?.querySelector('h2')?.textContent?.trim()).toBe('Supprimer cette image ?');
    expect(panneau()?.textContent).toContain('Elle disparaîtra de vos préparations.');
    const boutons = [...panneau()!.querySelectorAll('button')].map((b) => b.textContent?.trim());
    expect(boutons).toEqual(['Annuler', "Supprimer l'image"]);
    bouton('Annuler').click();
    await fermeture(reponse);
  });

  it('focus initial sur « Annuler » : Entrée sans rien toucher refuse', async () => {
    const { reponse } = await ouvrir();
    expect(document.activeElement).toBe(bouton('Annuler'));
    // Entrée sur un bouton focalisé déclenche son clic (jsdom ne le simule pas).
    (document.activeElement as HTMLButtonElement).click();
    expect(await fermeture(reponse)).toBe(false);
    expect(panneau()).toBeNull();
  });

  it('« Annuler » : false', async () => {
    const { reponse } = await ouvrir();
    bouton('Annuler').click();
    expect(await fermeture(reponse)).toBe(false);
  });

  it('Échap : false', async () => {
    const { reponse } = await ouvrir();
    const echap = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    Object.defineProperty(echap, 'keyCode', { get: () => 27 });
    panneau()!.dispatchEvent(echap);
    expect(await fermeture(reponse)).toBe(false);
    expect(panneau()).toBeNull();
  });

  it('clic hors du dialogue : false', async () => {
    const { reponse } = await ouvrir();
    document.querySelector<HTMLElement>('.cdk-overlay-backdrop')!.click();
    expect(await fermeture(reponse)).toBe(false);
  });

  it('bouton grave : true', async () => {
    const { reponse } = await ouvrir();
    bouton("Supprimer l'image").click();
    expect(await fermeture(reponse)).toBe(true);
    expect(panneau()).toBeNull();
  });
});

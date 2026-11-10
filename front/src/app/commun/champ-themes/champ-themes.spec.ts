import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { ThemeDto } from '../../api/models/theme-dto';
import { provideIcones } from '../icones';
import { ChampThemes, normaliserNom } from './champ-themes';

const MOI = '0190f0a0-0000-7000-8000-00000000e001';
const CUISINE: ThemeDto = {
  id: '0190f0a0-0000-7000-8000-00000000c001',
  nom: 'cuisine',
  createurId: MOI,
};
const CUISINE_MONDE: ThemeDto = {
  id: '0190f0a0-0000-7000-8000-00000000c002',
  nom: 'La Cuisiné du monde',
};
const ANIMAUX: ThemeDto = { id: '0190f0a0-0000-7000-8000-00000000c003', nom: 'les animaux' };
const THEMES = [ANIMAUX, CUISINE, CUISINE_MONDE];

@Component({
  imports: [ChampThemes],
  template: `
    <app-champ-themes
      etiquette="Thème par défaut"
      [themes]="themes()"
      [choisis]="choisis()"
      [limite]="limite()"
      [gerable]="gerable"
      [erreur]="erreur()"
      (choisisChange)="changements.push($event)"
      (creer)="creations.push($event)"
      (renommer)="renommages.push($event)"
      (supprimer)="suppressions.push($event)"
    />
  `,
})
class Hote {
  readonly themes = signal<ThemeDto[]>(THEMES);
  readonly choisis = signal<string[]>([]);
  readonly limite = signal(1);
  readonly erreur = signal<string | null>(null);
  readonly gerable = (theme: ThemeDto) => theme.createurId === MOI;
  readonly changements: string[][] = [];
  readonly creations: string[] = [];
  readonly renommages: ThemeDto[] = [];
  readonly suppressions: ThemeDto[] = [];
}

describe('Champ à étiquettes des Thèmes', () => {
  let fixture: ComponentFixture<Hote>;
  let hote: Hote;
  let racine: HTMLElement;

  const tour = () => new Promise((fin) => setTimeout(fin));

  async function stabiliser() {
    await tour();
    await fixture.whenStable();
    await tour();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Hote],
      providers: [
        provideIcones(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    fixture = TestBed.createComponent(Hote);
    hote = fixture.componentInstance;
    racine = fixture.nativeElement as HTMLElement;
    document.body.appendChild(racine);
    await stabiliser();
  });

  afterEach(() => {
    racine.remove();
    document.querySelectorAll('.cdk-overlay-container').forEach((surcouche) => surcouche.remove());
  });

  const saisie = () => racine.querySelector<HTMLInputElement>('input.champ-themes__saisie')!;
  const etiquettes = () =>
    [...racine.querySelectorAll<HTMLElement>('mat-chip-row')].map((puce) =>
      puce.querySelector('.mdc-evolution-chip__text-label')?.textContent?.trim(),
    );
  const propositions = () =>
    [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')].map((option) =>
      option.textContent?.replace(/\s+/g, ' ').trim(),
    );
  const propositionActive = () =>
    document
      .querySelector<HTMLElement>('.cdk-overlay-pane mat-option.mat-mdc-option-active')
      ?.textContent?.replace(/\s+/g, ' ')
      .trim();

  /** Touche au clavier, avec le `keyCode` que lisent les composants Material. */
  function touche(cible: HTMLElement, key: string, keyCode: number) {
    const evenement = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    Object.defineProperty(evenement, 'keyCode', { get: () => keyCode });
    cible.dispatchEvent(evenement);
    return evenement;
  }

  async function taper(texte: string) {
    saisie().focus();
    saisie().value = texte;
    saisie().dispatchEvent(new Event('input'));
    await stabiliser();
  }

  async function choisirEtiquettes(ids: string[]) {
    hote.choisis.set(ids);
    await stabiliser();
  }

  it('étiquette du champ, une puce par Thème choisi, chacune avec « Retirer … » étiqueté', async () => {
    await choisirEtiquettes([CUISINE.id]);

    expect(racine.querySelector('mat-label')?.textContent?.trim()).toBe('Thème par défaut');
    expect(saisie().labels?.[0]?.textContent?.trim()).toBe('Thème par défaut');
    expect(racine.querySelector('mat-chip-grid')?.getAttribute('aria-label')).toBe(
      'Thème par défaut',
    );
    expect(etiquettes()).toEqual(['cuisine']);
    expect(racine.querySelector('[matchipremove]')?.getAttribute('aria-label')).toBe(
      'Retirer cuisine',
    );
  });

  it('frappe « cuis » : les Thèmes dont le nom normalisé contient « cuis », puis « Créer le thème « cuis » »', async () => {
    await taper('cuis');

    expect(propositions()).toEqual(['cuisine', 'La Cuisiné du monde', 'Créer le thème « cuis »']);
    expect(propositionActive()).toBe('cuisine');
  });

  it('nom déjà porté, à la casse, aux accents et à l’article près : pas de création proposée', async () => {
    await taper('  LA  cuisiné ');

    expect(propositions()).toEqual(['cuisine', 'La Cuisiné du monde']);
  });

  it('champ vide : tous les Thèmes non choisis, sans création', async () => {
    await choisirEtiquettes([CUISINE.id]);
    await taper('');

    expect(propositions()).toEqual(['les animaux', 'La Cuisiné du monde']);
  });

  it('Entrée choisit la proposition mise en avant ; à la limite, elle remplace l’étiquette', async () => {
    await choisirEtiquettes([ANIMAUX.id]);
    await taper('monde');

    touche(saisie(), 'Enter', 13);
    await stabiliser();

    expect(hote.changements).toEqual([[CUISINE_MONDE.id]]);
  });

  it('sans limite atteinte, choisir ajoute une étiquette après les autres', async () => {
    hote.limite.set(3);
    await choisirEtiquettes([ANIMAUX.id]);
    await taper('cuisine');

    touche(saisie(), 'Enter', 13);
    await stabiliser();

    expect(hote.changements).toEqual([[ANIMAUX.id, CUISINE.id]]);
  });

  it('« Créer le thème « … » » émet le nom rogné et garde la saisie jusqu’au choix du Thème créé', async () => {
    await taper('  Les   saisons ');
    expect(propositions()).toEqual(['Créer le thème « Les saisons »']);

    touche(saisie(), 'Enter', 13);
    await stabiliser();

    expect(hote.creations).toEqual(['Les saisons']);
    expect(hote.changements).toEqual([]);
    expect(saisie().value).toBe('  Les   saisons ');

    const saisons = { id: '0190f0a0-0000-7000-8000-00000000c009', nom: 'Les saisons' };
    hote.themes.set([...THEMES, saisons]);
    await choisirEtiquettes([saisons.id]);

    expect(saisie().value).toBe('');
    expect(etiquettes()).toEqual(['Les saisons']);
  });

  it('échec de la création : message sous le champ, relié à la saisie, masqué dès la frappe suivante', async () => {
    hote.erreur.set('Un thème de ce nom existe déjà.');
    await stabiliser();

    const message = racine.querySelector('.champ-themes__erreur[role="alert"]')!;
    expect(message.textContent?.trim()).toBe('Un thème de ce nom existe déjà.');
    expect(saisie().getAttribute('aria-describedby')).toContain(message.id);

    await taper('autre');
    expect(racine.querySelector('.champ-themes__erreur')).toBeNull();
  });

  it('Retour arrière dans le champ vide retire la dernière étiquette ; avec du texte, rien', async () => {
    hote.limite.set(3);
    await choisirEtiquettes([ANIMAUX.id, CUISINE.id]);

    await taper('cu');
    touche(saisie(), 'Backspace', 8);
    expect(hote.changements).toEqual([]);

    await taper('');
    const evenement = touche(saisie(), 'Backspace', 8);
    await stabiliser();

    expect(evenement.defaultPrevented).toBe(true);
    expect(hote.changements).toEqual([[ANIMAUX.id]]);
  });

  it('« Retirer » une étiquette émet la liste sans elle', async () => {
    await choisirEtiquettes([CUISINE.id]);

    racine.querySelector<HTMLButtonElement>('[matchipremove]')!.click();
    await stabiliser();

    expect(hote.changements).toEqual([[]]);
  });

  it('étiquette gérable : son menu « Renommer », « Supprimer » s’ouvre au clic', async () => {
    await choisirEtiquettes([CUISINE.id]);
    const puce = racine.querySelector<HTMLElement>('mat-chip-row')!;
    expect(puce.getAttribute('aria-haspopup')).toBe('menu');

    puce.click();
    await stabiliser();
    const items = [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane [mat-menu-item]')];
    expect(items.map((item) => item.textContent?.trim())).toEqual(['Renommer', 'Supprimer']);

    items[0].click();
    await stabiliser();
    expect(hote.renommages).toEqual([CUISINE]);
  });

  it('étiquette gérable : Entrée sur la puce ouvre le menu, au clavier seul', async () => {
    await choisirEtiquettes([CUISINE.id]);
    const action = racine.querySelector<HTMLElement>('mat-chip-row [matchipaction]')!;
    expect(action.getAttribute('aria-description')).toBe('Entrée : renommer ou supprimer le thème');

    action.focus();
    touche(action, 'Enter', 13);
    await stabiliser();
    const supprimer = [
      ...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane [mat-menu-item]'),
    ].find((item) => item.textContent?.trim() === 'Supprimer')!;
    supprimer.click();
    await stabiliser();

    expect(hote.suppressions).toEqual([CUISINE]);
  });

  it('étiquette d’un Thème d’un collègue : aucun menu', async () => {
    await choisirEtiquettes([ANIMAUX.id]);
    const puce = racine.querySelector<HTMLElement>('mat-chip-row')!;

    expect(puce.getAttribute('aria-haspopup')).toBeNull();
    puce.click();
    await stabiliser();
    expect(document.querySelector('.cdk-overlay-pane [mat-menu-item]')).toBeNull();
  });
});

describe('normaliserNom', () => {
  it.each([
    ['  Les   Saisons ', 'saisons'],
    ['La cuisiné', 'cuisine'],
    ['l’arbre', 'arbre'],
    ["L'ARBRE", 'arbre'],
    ['des', 'des'],
    ['Lapin', 'lapin'],
  ])('« %s » → « %s »', (nom, attendu) => {
    expect(normaliserNom(nom)).toBe(attendu);
  });
});

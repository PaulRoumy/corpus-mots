import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MESSAGE_RESEAU, MESSAGES_PAR_CODE } from '../erreurs/message-erreur';
import { provideIcones } from '../icones';
import {
  CreationSens,
  MESSAGE_CATEGORIE_REQUISE,
  MESSAGE_LIBELLE_SENS,
  NouveauSens,
} from './creation-sens';

describe('CreationSens', () => {
  let fixture: ComponentFixture<CreationSens>;
  let racine: HTMLElement;
  let envoyer: ReturnType<typeof vi.fn<(sens: NouveauSens) => Promise<void>>>;

  async function stabiliser() {
    await new Promise((fin) => setTimeout(fin));
    await fixture.whenStable();
    await new Promise((fin) => setTimeout(fin));
  }
  const texte = (selecteur: string) =>
    racine.querySelector(selecteur)?.textContent?.replace(/\s+/g, ' ').trim();
  const bouton = (libelle: string) =>
    [...racine.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidat) => candidat.textContent?.trim() === libelle,
    );
  const libelle = () => racine.querySelector<HTMLInputElement>('.creation-sens__libelle')!;
  const valeurCategorie = () => texte('.creation-sens__categorie .mat-mdc-select-value');
  const etiquettes = () =>
    [...racine.querySelectorAll('mat-label')].map((etiquette) => etiquette.textContent?.trim());

  async function ouvrir() {
    bouton('Nouveau sens')!.click();
    await stabiliser();
  }

  async function saisir(valeur: string) {
    libelle().value = valeur;
    libelle().dispatchEvent(new Event('input'));
    await stabiliser();
  }

  async function entree() {
    libelle().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    // Soumission implicite du formulaire par Entrée, que jsdom ne simule pas.
    racine
      .querySelector('form')!
      .dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
    await stabiliser();
  }

  async function choisirCategorie(nom: string) {
    racine.querySelector<HTMLElement>('.creation-sens__categorie .mat-mdc-select-trigger')!.click();
    await stabiliser();
    [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')]
      .find((option) => option.textContent?.trim() === nom)!
      .click();
    await stabiliser();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideIcones(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    fixture = TestBed.createComponent(CreationSens);
    envoyer = vi.fn<(sens: NouveauSens) => Promise<void>>(() => Promise.resolve());
    fixture.componentRef.setInput('envoyer', envoyer);
    racine = fixture.nativeElement as HTMLElement;
    document.body.appendChild(racine);
    await stabiliser();
  });

  afterEach(() => {
    racine.remove();
    document.querySelectorAll('.cdk-overlay-container').forEach((surcouche) => surcouche.remove());
  });

  it('déplier : formulaire sur place, focus sur le libellé, catégorie préremplie', async () => {
    fixture.componentRef.setInput('categorieInitiale', 'adjectif');
    expect(racine.querySelector('form')).toBeNull();

    await ouvrir();

    expect(racine.querySelector('form')?.getAttribute('aria-label')).toBe('Nouveau sens');
    expect(document.querySelector('mat-dialog-container, [role="dialog"]')).toBeNull();
    expect(etiquettes()).toEqual(['Libellé du sens', 'Catégorie grammaticale']);
    expect(document.activeElement).toBe(libelle());
    expect(valeurCategorie()).toBe('adjectif');
    expect(bouton('Créer le sens')).toBeDefined();
    expect(bouton('Nouveau sens')).toBeUndefined();
  });

  it('cinq catégories, dans l’ordre ; sans catégorie actuelle connue, le champ reste vide', async () => {
    fixture.componentRef.setInput('categorieInitiale', null);
    await ouvrir();
    expect(valeurCategorie()).toBe('');

    racine.querySelector<HTMLElement>('.creation-sens__categorie .mat-mdc-select-trigger')!.click();
    await stabiliser();
    expect(
      [...document.querySelectorAll('.cdk-overlay-pane mat-option')].map((o) =>
        o.textContent?.trim(),
      ),
    ).toEqual(['nom', 'verbe', 'adjectif', 'adverbe', 'autre']);
  });

  it('Entrée : libellé nettoyé et catégorie envoyés, formulaire replié, `creee` émis', async () => {
    fixture.componentRef.setInput('categorieInitiale', 'nom');
    let creees = 0;
    fixture.componentInstance.creee.subscribe(() => creees++);
    await ouvrir();

    await saisir('  chute   libre ');
    await entree();

    expect(envoyer).toHaveBeenCalledExactlyOnceWith({ libelle: 'chute libre', categorie: 'nom' });
    expect(racine.querySelector('form')).toBeNull();
    expect(creees).toBe(1);
  });

  it('« Créer le sens » avec la catégorie choisie', async () => {
    await ouvrir();
    await saisir('chute');
    await choisirCategorie('verbe');

    bouton('Créer le sens')!.click();
    await stabiliser();

    expect(envoyer).toHaveBeenCalledExactlyOnceWith({ libelle: 'chute', categorie: 'verbe' });
  });

  it('invalide : libellé vide ou de 41 caractères, catégorie vide, message sous le champ et aucun envoi', async () => {
    await ouvrir();

    await entree();
    expect(texte('mat-form-field:first-of-type mat-error')).toBe(MESSAGE_LIBELLE_SENS);
    expect(texte('mat-form-field:last-of-type mat-error')).toBe(MESSAGE_CATEGORIE_REQUISE);

    await saisir('a'.repeat(41));
    await choisirCategorie('nom');
    await entree();
    expect(texte('mat-error')).toBe(MESSAGE_LIBELLE_SENS);
    expect(envoyer).not.toHaveBeenCalled();
    expect(racine.querySelector('form')).not.toBeNull();

    await saisir('b'.repeat(40));
    await entree();
    expect(envoyer).toHaveBeenCalledOnce();
  });

  it('Échap : replié sans rien envoyer, sans remonter au panneau, focus sur « Nouveau sens »', async () => {
    const remontees = vi.fn();
    document.body.addEventListener('keydown', remontees);
    await ouvrir();
    await saisir('chute');

    libelle().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await stabiliser();
    document.body.removeEventListener('keydown', remontees);

    expect(racine.querySelector('form')).toBeNull();
    expect(envoyer).not.toHaveBeenCalled();
    expect(remontees).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(bouton('Nouveau sens'));

    // Rouvert, le formulaire repart vide.
    await ouvrir();
    expect(libelle().value).toBe('');
  });

  it('refus du libellé par le back : message sous le champ, formulaire ouvert', async () => {
    envoyer.mockRejectedValueOnce(
      new HttpErrorResponse({
        status: 400,
        error: { status: 400, code: 'sens.libelle_invalide' },
      }),
    );
    fixture.componentRef.setInput('categorieInitiale', 'nom');
    await ouvrir();
    await saisir('banane');
    await entree();

    expect(racine.querySelector('form')).not.toBeNull();
    expect(texte('mat-error')).toBe(MESSAGES_PAR_CODE['sens.libelle_invalide']);

    await saisir('fruit');
    expect(racine.querySelector('mat-error')).toBeNull();
  });

  it('autre échec : message sous le formulaire, annoncé, formulaire ouvert', async () => {
    envoyer.mockRejectedValueOnce(new HttpErrorResponse({ status: 0 }));
    fixture.componentRef.setInput('categorieInitiale', 'nom');
    let creees = 0;
    fixture.componentInstance.creee.subscribe(() => creees++);
    await ouvrir();
    await saisir('fruit');
    await entree();

    expect(texte('.creation-sens__erreur')).toBe(MESSAGE_RESEAU);
    expect(racine.querySelector('.creation-sens__erreur')?.getAttribute('role')).toBe('alert');
    expect(racine.querySelector('form')).not.toBeNull();
    expect(creees).toBe(0);
  });

  it('« à compléter » refusé sans requête, avec le message du libellé', async () => {
    fixture.componentRef.setInput('categorieInitiale', 'nom');
    await ouvrir();

    await saisir(' À  Compléter ');
    await entree();

    expect(texte('mat-error')).toBe(MESSAGE_LIBELLE_SENS);
    expect(envoyer).not.toHaveBeenCalled();
  });

  it('nettoyé comme le back : apostrophe unifiée, forme NFC comptée pour les 40 caractères', async () => {
    fixture.componentRef.setInput('categorieInitiale', 'nom');
    await ouvrir();

    // 40 « é » décomposés (80 caractères avant NFC) restent un libellé de 40 caractères.
    await saisir('é'.repeat(40));
    await entree();
    expect(envoyer).toHaveBeenLastCalledWith({ libelle: 'é'.repeat(40), categorie: 'nom' });

    await ouvrir();
    await saisir('l’étale');
    await entree();
    expect(envoyer).toHaveBeenLastCalledWith({ libelle: "l'étale", categorie: 'nom' });
  });

  it('pendant l’envoi, le libellé et la catégorie sont désactivés', async () => {
    let terminer!: () => void;
    envoyer.mockReturnValueOnce(new Promise<void>((fin) => (terminer = fin)));
    fixture.componentRef.setInput('categorieInitiale', 'nom');
    await ouvrir();
    await saisir('fruit');
    await entree();

    expect(libelle().disabled).toBe(true);
    expect(racine.querySelector('mat-select')?.getAttribute('aria-disabled')).toBe('true');
    expect(bouton('Créer le sens')!.disabled).toBe(true);

    terminer();
    await stabiliser();
    expect(racine.querySelector('form')).toBeNull();
  });

  it('réinitialiser : replié et vidé, la réponse d’un envoi en cours est ignorée', async () => {
    let terminer!: () => void;
    envoyer.mockReturnValueOnce(new Promise<void>((fin) => (terminer = fin)));
    fixture.componentRef.setInput('categorieInitiale', 'nom');
    let creees = 0;
    fixture.componentInstance.creee.subscribe(() => creees++);
    await ouvrir();
    await saisir('fruit');
    await entree();

    fixture.componentInstance.reinitialiser();
    await stabiliser();
    expect(racine.querySelector('form')).toBeNull();
    fixture.componentRef.setInput('categorieInitiale', 'verbe');
    await ouvrir();
    expect(libelle().value).toBe('');
    expect(libelle().disabled).toBe(false);
    expect(valeurCategorie()).toBe('verbe');

    terminer();
    await stabiliser();
    expect(creees).toBe(0);
    expect(racine.querySelector('form')).not.toBeNull();
  });

  it('désactivée pendant un autre envoi du panneau : ni ouverture ni création', async () => {
    fixture.componentRef.setInput('desactive', true);
    await stabiliser();
    expect(bouton('Nouveau sens')!.disabled).toBe(true);
  });
});

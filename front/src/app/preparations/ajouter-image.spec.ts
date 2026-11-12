import { LiveAnnouncer } from '@angular/cdk/a11y';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MesMotsImageDto } from '../api/models/mes-mots-image-dto';
import { provideIcones } from '../commun/icones';
import { AjouterImage, annonceImageAjoutee } from './ajouter-image';

const AJOUTEE: MesMotsImageDto = {
  id: '0190f0a0-0000-7000-8000-0000000c0002',
  proprietaireId: '0190f0a0-0000-7000-8000-00000000e001',
  etat: 'privee',
  aRemplacer: null,
  reutilisable: true,
  typeImage: 'image_libre',
  aCompleter: false,
  motId: '0190f0a0-0000-7000-8000-0000000e0001',
  forme: 'citrouille',
  sens: { id: '0190f0a0-0000-7000-8000-0000000d0001', libelle: 'à compléter' },
};

describe('« + › Ajouter une image »', () => {
  let serveur: HttpTestingController;
  let declencheur: HTMLButtonElement;
  const announce = vi.fn(() => Promise.resolve());
  const original = { creer: URL.createObjectURL, revoquer: URL.revokeObjectURL };

  const tour = () => new Promise((fin) => setTimeout(fin));

  async function stabiliser() {
    await tour();
    await TestBed.inject(ApplicationRef).whenStable();
    await tour();
  }

  /** Attend que le dialogue, chargé à la demande, soit ouvert. */
  async function attendreDialogue() {
    await import('./televerser-image-dialogue');
    await stabiliser();
  }

  beforeEach(() => {
    announce.mockClear();
    URL.createObjectURL = vi.fn(() => 'blob:http://localhost/apercu');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideIcones(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        { provide: LiveAnnouncer, useValue: { announce } },
      ],
    });
    serveur = TestBed.inject(HttpTestingController);
    declencheur = document.createElement('button');
    declencheur.textContent = '+';
    document.body.appendChild(declencheur);
    declencheur.focus();
  });

  afterEach(() => {
    serveur.verify();
    declencheur.remove();
    document.querySelectorAll('.cdk-overlay-container').forEach((surcouche) => surcouche.remove());
    URL.createObjectURL = original.creer;
    URL.revokeObjectURL = original.revoquer;
  });

  const dialogue = () => document.querySelector<HTMLElement>('app-televerser-image');
  const bouton = (libelle: string) =>
    [...dialogue()!.querySelectorAll<HTMLButtonElement>('button')].find(
      (element) => element.textContent?.trim() === libelle,
    )!;

  async function remplirEtEnregistrer() {
    const mot = dialogue()!.querySelector<HTMLInputElement>('.televerser__saisie-mot')!;
    mot.value = 'citrouille';
    mot.dispatchEvent(new Event('input'));
    const selecteur = dialogue()!.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(selecteur, 'files', {
      value: [new File([new Uint8Array(4)], 'citrouille.png', { type: 'image/png' })],
    });
    selecteur.dispatchEvent(new Event('change'));
    await stabiliser();
    dialogue()!.querySelector<HTMLElement>('.televerser__type .mat-mdc-select-trigger')!.click();
    await stabiliser();
    [...document.querySelectorAll<HTMLElement>('.cdk-overlay-pane mat-option')]
      .find((option) => option.textContent?.trim() === 'image libre')!
      .click();
    await stabiliser();
    bouton('Enregistrer').click();
    await stabiliser();
  }

  it('ouvre le dialogue en mode « Mes mots » ; après l’enregistrement, il se ferme et l’annonce polie est faite', async () => {
    const fin = TestBed.inject(AjouterImage).ouvrir(declencheur);
    await attendreDialogue();
    expect(dialogue()).not.toBeNull();

    await remplirEtEnregistrer();
    serveur.expectOne('/api/images').flush(AJOUTEE, { status: 201, statusText: 'Created' });
    await fin;
    await stabiliser();

    expect(dialogue()).toBeNull();
    expect(announce).toHaveBeenCalledWith(
      'Image enregistrée dans Mes mots pour « citrouille ».',
      'polite',
    );
    expect(annonceImageAjoutee('citrouille')).toBe(
      'Image enregistrée dans Mes mots pour « citrouille ».',
    );
    expect(document.activeElement).toBe(declencheur);
  });

  it('fermé sans enregistrer : aucune annonce, le focus revient au déclencheur', async () => {
    const fin = TestBed.inject(AjouterImage).ouvrir(declencheur);
    await attendreDialogue();

    bouton('Annuler').click();
    await fin;
    await stabiliser();

    expect(announce).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(declencheur);
  });

  it('un double appel n’ouvre qu’un dialogue', async () => {
    const service = TestBed.inject(AjouterImage);
    const fin = service.ouvrir(declencheur);
    void service.ouvrir(declencheur);
    await attendreDialogue();

    expect(document.querySelectorAll('app-televerser-image').length).toBe(1);
    bouton('Annuler').click();
    await fin;
  });
});

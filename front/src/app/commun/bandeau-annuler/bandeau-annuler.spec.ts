import { LiveAnnouncer } from '@angular/cdk/a11y';
import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { BandeauAnnuler, DUREE_BANDEAU_ANNULER_MS } from './bandeau-annuler';

describe('BandeauAnnuler', () => {
  let bandeau: BandeauAnnuler;
  let annonce: ReturnType<typeof vi.fn>;
  let erreurs: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    annonce = vi.fn(() => Promise.resolve());
    erreurs = vi.fn();
    TestBed.configureTestingModule({
      // Les erreurs des écouteurs vont à l'ErrorHandler factice au lieu d'être relancées par TestBed.
      rethrowApplicationErrors: false,
      providers: [
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
        { provide: LiveAnnouncer, useValue: { announce: annonce, clear: vi.fn() } },
        // Une erreur levée dans un écouteur de clic part à l'ErrorHandler d'Angular.
        { provide: ErrorHandler, useValue: { handleError: erreurs } },
      ],
    });
    bandeau = TestBed.inject(BandeauAnnuler);
  });

  afterEach(() => {
    vi.useRealTimers();
    // Les erreurs ne sont plus relancées par TestBed : aucune ne doit passer inaperçue.
    expect(erreurs).not.toHaveBeenCalled();
  });

  /** Avance le temps puis laisse Angular rendre (ouverture, fermeture du snackbar). */
  async function avancer(ms: number) {
    await vi.advanceTimersByTimeAsync(ms);
    TestBed.tick();
    await vi.advanceTimersByTimeAsync(0);
  }

  function afficher(message: string, annuler: () => void) {
    bandeau.afficher(message, annuler);
    TestBed.tick();
  }

  const bandeaux = () => [...document.querySelectorAll<HTMLElement>('app-bandeau-annuler')];
  const boutonAnnuler = (element: HTMLElement) =>
    element.querySelector<HTMLButtonElement>('button')!;

  it('affiche le message et « Annuler », et annonce le message aux lecteurs d’écran', () => {
    afficher('Mot retiré de la préparation.', vi.fn());
    expect(bandeaux()).toHaveLength(1);
    expect(bandeaux()[0].textContent).toContain('Mot retiré de la préparation.');
    expect(boutonAnnuler(bandeaux()[0]).textContent?.trim()).toBe('Annuler');
    expect(annonce).toHaveBeenCalledWith('Mot retiré de la préparation.', 'polite');
    // Région vive du snackbar coupée : le message n'est annoncé qu'une fois.
    expect(
      document.querySelector('mat-snack-bar-container [aria-live]')?.getAttribute('aria-live'),
    ).toBe('off');
  });

  it('Annuler à 5 s : opération inverse appelée une fois, bandeau fermé', async () => {
    const annuler = vi.fn();
    afficher('Mot retiré.', annuler);
    await avancer(5000);
    const bouton = boutonAnnuler(bandeaux()[0]);
    bouton.click();
    bouton.click();
    await avancer(500);
    expect(annuler).toHaveBeenCalledTimes(1);
    expect(bandeaux()).toHaveLength(0);
  });

  it('opération inverse en échec : bandeau fermé quand même', async () => {
    const annuler = vi.fn(() => {
      throw new Error('échec');
    });
    afficher('Mot retiré.', annuler);
    boutonAnnuler(bandeaux()[0]).click();
    await avancer(500);
    expect(annuler).toHaveBeenCalledTimes(1);
    expect(erreurs).toHaveBeenCalledWith(new Error('échec'));
    erreurs.mockClear();
    expect(bandeaux()).toHaveLength(0);
  });

  it('délai écoulé : fermé à 8 s, opération inverse jamais appelée', async () => {
    const annuler = vi.fn();
    afficher('Mot retiré.', annuler);
    await avancer(DUREE_BANDEAU_ANNULER_MS - 1);
    expect(bandeaux()).toHaveLength(1);
    await avancer(1);
    await avancer(500);
    expect(bandeaux()).toHaveLength(0);
    expect(annuler).not.toHaveBeenCalled();
  });

  it('survol de 3 s à 20 s : pas de fermeture pendant le survol, fermeture 5 s après la sortie', async () => {
    const annuler = vi.fn();
    afficher('Mot retiré.', annuler);
    await avancer(3000);
    bandeaux()[0].dispatchEvent(new MouseEvent('mouseenter'));
    await avancer(17000);
    expect(bandeaux()).toHaveLength(1);
    bandeaux()[0].dispatchEvent(new MouseEvent('mouseleave'));
    await avancer(4999);
    expect(bandeaux()).toHaveLength(1);
    await avancer(1);
    await avancer(500);
    expect(bandeaux()).toHaveLength(0);
    expect(annuler).not.toHaveBeenCalled();
  });

  it('focus sur « Annuler » : décompte suspendu, repris avec le temps restant à la sortie du focus', async () => {
    afficher('Mot retiré.', vi.fn());
    await avancer(2000);
    const bouton = boutonAnnuler(bandeaux()[0]);
    bouton.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await avancer(30000);
    expect(bandeaux()).toHaveLength(1);

    // Survol puis sortie du pointeur alors que le focus reste : toujours suspendu.
    bandeaux()[0].dispatchEvent(new MouseEvent('mouseenter'));
    bandeaux()[0].dispatchEvent(new MouseEvent('mouseleave'));
    await avancer(30000);
    expect(bandeaux()).toHaveLength(1);

    bouton.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    await avancer(5999);
    expect(bandeaux()).toHaveLength(1);
    await avancer(1);
    await avancer(500);
    expect(bandeaux()).toHaveLength(0);
  });

  it('second bandeau : le premier disparaît sans annuler, seul le second est actif', async () => {
    const annulerPremier = vi.fn();
    const annulerSecond = vi.fn();
    afficher('Premier mot retiré.', annulerPremier);
    await avancer(5000);
    afficher('Second mot retiré.', annulerSecond);
    await avancer(500);

    expect(bandeaux()).toHaveLength(1);
    expect(bandeaux()[0].textContent).toContain('Second mot retiré.');
    expect(annulerPremier).not.toHaveBeenCalled();

    // Le délai du premier (8 s après son ouverture) ne ferme pas le second.
    await avancer(3000);
    expect(bandeaux()).toHaveLength(1);

    boutonAnnuler(bandeaux()[0]).click();
    await avancer(500);
    expect(annulerSecond).toHaveBeenCalledTimes(1);
    expect(annulerPremier).not.toHaveBeenCalled();
    expect(bandeaux()).toHaveLength(0);
  });
});

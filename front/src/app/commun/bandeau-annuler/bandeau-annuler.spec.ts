import { LiveAnnouncer } from '@angular/cdk/a11y';
import { DestroyRef, ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter, Router } from '@angular/router';
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
        provideRouter([
          { path: 'preparations', children: [] },
          { path: 'preparations/:id', children: [] },
          { path: 'administration/comptes', children: [] },
        ]),
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

  function afficher(message: string, annuler: () => void, appelant?: DestroyRef) {
    bandeau.afficher(message, annuler, appelant);
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

  describe('navigation', () => {
    async function naviguer(url: string) {
      await TestBed.inject(Router).navigateByUrl(url);
      await avancer(500);
    }

    it('retrait puis « Mes préparations » : bandeau fermé, opération inverse jamais appelée', async () => {
      const annuler = vi.fn();
      afficher('« chat » retiré de la préparation.', annuler);
      await avancer(2000);
      await naviguer('/preparations');
      expect(bandeaux()).toHaveLength(0);
      expect(annuler).not.toHaveBeenCalled();
    });

    it('« Annuler » cliqué juste après le début de la navigation, bandeau encore affiché : sans effet', async () => {
      const annuler = vi.fn();
      afficher('« chat » retiré de la préparation.', annuler);
      const bouton = boutonAnnuler(bandeaux()[0]);
      const navigation = TestBed.inject(Router).navigateByUrl('/preparations');
      // `NavigationStart` est émis, mais la vue du bandeau n'est pas encore retirée.
      expect(bouton.isConnected).toBe(true);
      bouton.click();
      await navigation;
      await avancer(500);
      expect(annuler).not.toHaveBeenCalled();
      expect(bandeaux()).toHaveLength(0);
    });

    it('passage à une autre Préparation : bandeau fermé', async () => {
      await naviguer('/preparations/1');
      const annuler = vi.fn();
      afficher('« chat » écarté des mots déjà illustrés.', annuler);
      await naviguer('/preparations/2');
      expect(bandeaux()).toHaveLength(0);
      expect(annuler).not.toHaveBeenCalled();
    });

    it('comptes : bandeau fermé à la navigation, l’action reste faite', async () => {
      await naviguer('/administration/comptes');
      const annuler = vi.fn();
      afficher('Compte désactivé.', annuler);
      await naviguer('/preparations');
      expect(bandeaux()).toHaveLength(0);
      expect(annuler).not.toHaveBeenCalled();
    });

    it('un bandeau ouvert après une navigation s’affiche et son « Annuler » fonctionne', async () => {
      const premier = vi.fn();
      afficher('Premier.', premier);
      await naviguer('/preparations');
      const second = vi.fn();
      afficher('Second.', second);
      await avancer(500);
      expect(bandeaux()).toHaveLength(1);
      boutonAnnuler(bandeaux()[0]).click();
      await avancer(500);
      expect(second).toHaveBeenCalledTimes(1);
      expect(premier).not.toHaveBeenCalled();
    });
  });

  it('« Annuler » du bandeau remplacé, cliqué avant sa sortie : sans effet', async () => {
    const annulerPremier = vi.fn();
    afficher('Premier mot retiré.', annulerPremier);
    const ancien = boutonAnnuler(bandeaux()[0]);
    bandeau.afficher('Second mot retiré.', vi.fn());
    ancien.click();
    await avancer(500);
    expect(annulerPremier).not.toHaveBeenCalled();
  });

  describe('appelant détruit', () => {
    function appelant() {
      let detruit = false;
      const rappels: (() => void)[] = [];
      const ref = {
        get destroyed() {
          return detruit;
        },
        onDestroy(rappel: () => void) {
          rappels.push(rappel);
          return () => rappels.splice(rappels.indexOf(rappel), 1);
        },
      } as unknown as DestroyRef;
      return {
        ref,
        detruire: () => {
          detruit = true;
          [...rappels].forEach((rappel) => rappel());
        },
      };
    }

    it('réponse arrivée après la destruction de l’appelant : aucun bandeau', async () => {
      const page = appelant();
      page.detruire();
      const annuler = vi.fn();
      afficher('« chat » retiré de la préparation.', annuler, page.ref);
      await avancer(500);
      expect(bandeaux()).toHaveLength(0);
      expect(annonce).not.toHaveBeenCalled();
    });

    it('destruction de l’appelant : son bandeau se ferme sans annuler', async () => {
      const page = appelant();
      const annuler = vi.fn();
      afficher('« chat » retiré de la préparation.', annuler, page.ref);
      expect(bandeaux()).toHaveLength(1);
      page.detruire();
      await avancer(500);
      expect(bandeaux()).toHaveLength(0);
      expect(annuler).not.toHaveBeenCalled();
    });
  });
});

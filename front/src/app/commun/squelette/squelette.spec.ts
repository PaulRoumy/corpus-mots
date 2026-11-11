import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormeSquelette, Squelette } from './squelette';

describe('Squelette', () => {
  let fixture: ComponentFixture<Squelette>;

  async function rendre(forme?: FormeSquelette, nombre?: number) {
    fixture = TestBed.createComponent(Squelette);
    if (forme !== undefined) {
      fixture.componentRef.setInput('forme', forme);
    }
    if (nombre !== undefined) {
      fixture.componentRef.setInput('nombre', nombre);
    }
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const blocs = (racine: HTMLElement) => [...racine.querySelectorAll('.squelette__bloc')];

  it.each(['carte', 'ligne', 'texte', 'vignette'] as const)(
    'forme %s : nombre de blocs demandé',
    async (forme) => {
      const racine = await rendre(forme, 4);
      expect(racine.querySelector('.squelette')?.classList).toContain(`squelette--${forme}`);
      expect(racine.querySelector('.squelette')?.classList).toContain('squelette');
      expect(blocs(racine)).toHaveLength(4);
    },
  );

  it('par défaut : trois lignes', async () => {
    const racine = await rendre();
    expect(racine.querySelector('.squelette--ligne')).not.toBeNull();
    expect(blocs(racine)).toHaveLength(3);
  });

  it('nombre négatif ou décimal : borné', async () => {
    expect(blocs(await rendre('carte', -2))).toHaveLength(0);
    expect(blocs(await rendre('carte', 2.7))).toHaveLength(2);
  });

  it('blocs masqués aux lecteurs d’écran, conteneur qui annonce « Chargement »', async () => {
    const racine = await rendre('carte', 2);
    const conteneur = racine.querySelector('.squelette')!;
    expect(conteneur.getAttribute('role')).toBe('status');
    expect(conteneur.textContent?.trim()).toBe('Chargement');
    for (const bloc of blocs(racine)) {
      expect(bloc.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('animation coupée sous prefers-reduced-motion', async () => {
    await rendre();
    const styles = [...document.querySelectorAll('style')].map((style) => style.textContent ?? '');
    const regle = styles.find((texte) => texte.includes('squelette-pulsation'));
    expect(regle).toBeDefined();
    expect(regle).toMatch(/prefers-reduced-motion:\s*reduce[^}]*\{[^}]*animation:\s*none/);
  });
});

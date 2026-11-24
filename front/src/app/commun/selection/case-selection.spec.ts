import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BasculeSelection, CaseSelection } from './case-selection';

describe('CaseSelection', () => {
  let fixture: ComponentFixture<CaseSelection>;
  let racine: HTMLElement;
  let gestes: BasculeSelection[];
  let clicsParent: number;
  let parent: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(CaseSelection);
    fixture.componentRef.setInput('nom', 'Sélectionner « loup » (animal)');
    gestes = [];
    fixture.componentInstance.basculer.subscribe((geste) => gestes.push(geste));
    racine = fixture.nativeElement as HTMLElement;
    parent = document.createElement('div');
    clicsParent = 0;
    parent.addEventListener('click', () => clicsParent++);
    parent.appendChild(racine);
    document.body.appendChild(parent);
    await fixture.whenStable();
  });

  afterEach(() => parent.remove());

  const caseACocher = () => racine.querySelector<HTMLInputElement>('input[type="checkbox"]')!;

  it('case native nommée, décochée par défaut', () => {
    expect(caseACocher().getAttribute('aria-label')).toBe('Sélectionner « loup » (animal)');
    expect(caseACocher().checked).toBe(false);
  });

  it('clic : émet une bascule simple, sans cocher d’elle-même ni remonter à la carte', async () => {
    caseACocher().click();
    await fixture.whenStable();
    expect(gestes).toEqual([{ plage: false }]);
    expect(caseACocher().checked).toBe(false);
    expect(clicsParent).toBe(0);

    fixture.componentRef.setInput('cochee', true);
    await fixture.whenStable();
    expect(caseACocher().checked).toBe(true);
  });

  it('Maj+clic : plage ; clic sur la cible autour de la case : bascule aussi', () => {
    caseACocher().dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }),
    );
    racine.click();
    expect(gestes).toEqual([{ plage: true }, { plage: false }]);
  });

  it('figée : focusable, aria-disabled, aucun geste émis', async () => {
    fixture.componentRef.setInput('figee', true);
    await fixture.whenStable();
    expect(caseACocher().getAttribute('aria-disabled')).toBe('true');
    expect(caseACocher().disabled).toBe(false);
    caseACocher().click();
    expect(gestes).toEqual([]);
  });
});

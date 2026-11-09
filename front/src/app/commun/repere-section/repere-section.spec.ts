import { TestBed } from '@angular/core/testing';
import { RepereSection, Section } from './repere-section';

describe('RepereSection', () => {
  async function rendre(section: Section): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(RepereSection);
    fixture.componentRef.setInput('section', section);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it.each([
    ['ps', 'PS'],
    ['ms', 'MS'],
    ['gs', 'GS'],
  ] as const)(
    '%s : forme, couleur et libellé « %s », jamais la couleur seule',
    async (section, libelle) => {
      const racine = await rendre(section);
      const repere = racine.querySelector('.repere')!;
      const forme = repere.querySelector('.forme-section')!;

      expect(repere.classList).toContain(`repere--${section}`);
      expect(forme.classList).toContain(`forme-section--${section}`);
      expect(forme.getAttribute('aria-hidden')).toBe('true');
      expect(repere.textContent?.replace(/\s+/g, ' ').trim()).toBe(`Section ${libelle}`);
      expect(repere.querySelector('.cm-visuellement-masque')?.textContent).toBe('Section ');
    },
  );
});

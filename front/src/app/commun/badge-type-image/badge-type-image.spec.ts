import { TestBed } from '@angular/core/testing';
import { provideIcones } from '../icones';
import { BadgeTypeImage, TypeImage } from './badge-type-image';

describe('BadgeTypeImage', () => {
  async function rendre(type: TypeImage): Promise<HTMLElement> {
    TestBed.configureTestingModule({ providers: [provideIcones()] });
    const fixture = TestBed.createComponent(BadgeTypeImage);
    fixture.componentRef.setInput('type', type);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it.each([
    ['image_libre', 'globe', 'image libre'],
    ['photo_personnelle', 'appareil-photo', 'photo personnelle'],
    ['image_album', 'livre', "image d'album"],
    ['inconnu', 'interrogation', 'inconnu'],
  ] as const)(
    '%s : icône « %s », bordure du type et libellé « %s », jamais la couleur seule',
    async (type, icone, libelle) => {
      const racine = await rendre(type);
      const badge = racine.querySelector('.badge-type')!;

      expect(badge.classList).toContain(`badge-type--${type}`);
      expect(
        badge.querySelector(`mat-icon[data-mat-icon-name="${icone}"]`)?.getAttribute('aria-hidden'),
      ).toBe('true');
      expect(badge.textContent?.replace(/\s+/g, ' ').trim()).toBe(`Type : ${libelle}`);
      expect(badge.querySelector('.cm-visuellement-masque')?.textContent).toBe('Type : ');
    },
  );
});

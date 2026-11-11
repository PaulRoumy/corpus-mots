import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChargementImage, ImageSecurisee } from './image-securisee';

@Component({
  imports: [ImageSecurisee],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <img [appImageSecurisee]="charger()" alt="citrouille" (echec)="echecs = echecs + 1" />
    }
  `,
})
class Hote {
  readonly visible = signal(true);
  readonly charger = signal<ChargementImage>(() => new Promise<Blob>(() => undefined));
  echecs = 0;
}

describe('ImageSecurisee', () => {
  let fixture: ComponentFixture<Hote>;
  let racine: HTMLElement;
  const creerUrl = vi.fn<(fichier: Blob) => string>();
  const revoquerUrl = vi.fn<(url: string) => void>();
  const original = { creer: URL.createObjectURL, revoquer: URL.revokeObjectURL };
  let numero = 0;

  const tour = () => new Promise((fin) => setTimeout(fin));
  const image = () => racine.querySelector('img');

  /** Fonction de chargement qui rend un `Blob` aussitôt. */
  const rend =
    (contenu: string): ChargementImage =>
    () =>
      Promise.resolve(new Blob([contenu], { type: 'image/png' }));

  beforeEach(async () => {
    numero = 0;
    creerUrl.mockReset().mockImplementation(() => `blob:http://localhost/${++numero}`);
    revoquerUrl.mockReset();
    URL.createObjectURL = creerUrl;
    URL.revokeObjectURL = revoquerUrl;
    fixture = TestBed.createComponent(Hote);
    racine = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
  });

  afterEach(() => {
    URL.createObjectURL = original.creer;
    URL.revokeObjectURL = original.revoquer;
  });

  async function stabiliser() {
    await fixture.whenStable();
    await tour();
    await fixture.whenStable();
  }

  it('sans fichier chargé, pas de `src`', () => {
    expect(image()?.hasAttribute('src')).toBe(false);
    expect(image()?.getAttribute('alt')).toBe('citrouille');
  });

  it('pose une URL `blob:` du fichier rendu par la fonction, sans jeton', async () => {
    fixture.componentInstance.charger.set(rend('png-1'));
    await stabiliser();

    expect(image()?.getAttribute('src')).toBe('blob:http://localhost/1');
    expect(creerUrl).toHaveBeenCalledTimes(1);
    expect(creerUrl.mock.calls[0][0]).toBeInstanceOf(Blob);
  });

  it('nouvelle fonction : révoque l’ancienne URL et pose la nouvelle', async () => {
    fixture.componentInstance.charger.set(rend('png-1'));
    await stabiliser();

    fixture.componentInstance.charger.set(rend('png-2'));
    await stabiliser();

    expect(revoquerUrl).toHaveBeenCalledWith('blob:http://localhost/1');
    expect(image()?.getAttribute('src')).toBe('blob:http://localhost/2');
  });

  it('à la destruction, révoque l’URL', async () => {
    fixture.componentInstance.charger.set(rend('png-1'));
    await stabiliser();

    fixture.componentInstance.visible.set(false);
    await stabiliser();

    expect(revoquerUrl).toHaveBeenCalledWith('blob:http://localhost/1');
  });

  it('fichier arrivé après un changement de fonction : ignoré, aucune URL créée', async () => {
    let rendre: (fichier: Blob) => void = () => undefined;
    fixture.componentInstance.charger.set(() => new Promise<Blob>((fin) => (rendre = fin)));
    await stabiliser();
    fixture.componentInstance.charger.set(() => new Promise<Blob>(() => undefined));
    await stabiliser();

    rendre(new Blob(['tard']));
    await stabiliser();

    expect(creerUrl).not.toHaveBeenCalled();
    expect(image()?.hasAttribute('src')).toBe(false);
  });

  it('fichier chargé mais illisible (`error` de l’image) : émet `echec`', async () => {
    image()!.dispatchEvent(new Event('error'));
    expect(fixture.componentInstance.echecs).toBe(0);

    fixture.componentInstance.charger.set(rend('pas une image'));
    await stabiliser();
    image()!.dispatchEvent(new Event('error'));

    expect(fixture.componentInstance.echecs).toBe(1);
  });

  it('échec du chargement : émet `echec`, pas de `src`', async () => {
    fixture.componentInstance.charger.set(() => Promise.reject(new Error('503')));
    await stabiliser();

    expect(fixture.componentInstance.echecs).toBe(1);
    expect(image()?.hasAttribute('src')).toBe(false);
  });
});

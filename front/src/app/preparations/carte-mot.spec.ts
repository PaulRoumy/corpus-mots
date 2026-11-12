import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';
import { provideIcones } from '../commun/icones';
import { CarteMot } from './carte-mot';

describe('CarteMot', () => {
  let fixture: ComponentFixture<CarteMot>;
  let racine: HTMLElement;
  let serveur: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideIcones()],
    });
    serveur = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CarteMot);
    fixture.componentRef.setInput('mot', {
      id: '0190f0a0-0000-7000-8000-0000000f0001',
      motId: '0190f0a0-0000-7000-8000-0000000e0001',
      forme: 'citrouille',
      ordre: 1,
      sens: { id: '0190f0a0-0000-7000-8000-0000000d0001', libelle: 'à compléter' },
      illustre: false,
    });
    await fixture.whenStable();
    racine = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    // Recherche des suggestions ARASAAC, vérifiée par le test qui lui est consacré.
    serveur.match('/api/arasaac/suggestions?mot=citrouille');
    serveur.verify();
  });

  const boutonRetirer = () => racine.querySelector<HTMLButtonElement>('.carte-mot__retirer')!;

  it('Carte « à illustrer » : vignette vide, Mot en cursive, badge « à illustrer »', () => {
    expect(racine.classList).toContain('carte-mot--a-illustrer');
    expect(racine.querySelector('.carte-mot__vignette')?.getAttribute('aria-hidden')).toBe('true');
    expect(racine.querySelector('.carte-mot__mot')?.textContent?.trim()).toBe('citrouille');
    expect(racine.querySelector('.carte-mot__etat')?.textContent?.trim()).toBe('à illustrer');
  });

  it('Carte « à illustrer » : partie gauche, puis suggestions ARASAAC et « Téléverser » à droite', async () => {
    const recherche = serveur.expectOne('/api/arasaac/suggestions?mot=citrouille');
    recherche.flush([]);
    await new Promise((fin) => setTimeout(fin));
    await fixture.whenStable();

    const enfants = [...racine.children].map((enfant) => enfant.className.split(' ')[0]);
    expect(enfants.slice(-2)).toEqual(['carte-mot__gauche', 'carte-mot__droite']);
    expect(racine.querySelector('.carte-mot__gauche .carte-mot__mot')).not.toBeNull();
    expect(racine.querySelector('.carte-mot__droite .suggestions__repere')?.textContent).toBe(
      'Suggestions ARASAAC · simple, claire, peu de détails',
    );
    expect(racine.querySelector('.suggestions__message')?.textContent?.trim()).toBe(
      'Aucun pictogramme ARASAAC pour ce mot.',
    );
    // « Téléverser » sous les suggestions, y compris quand ARASAAC ne donne rien.
    const droite = [...racine.querySelector('.carte-mot__droite')!.children];
    expect(droite.at(-1)?.classList).toContain('carte-mot__televerser');
  });

  it('bouton texte « Téléverser » : nom accessible avec le Mot ; il émet `televerser`', () => {
    let ouvertures = 0;
    fixture.componentInstance.televerser.subscribe(() => ouvertures++);
    const bouton = racine.querySelector<HTMLButtonElement>('.carte-mot__televerser')!;

    expect(bouton.textContent?.trim()).toBe('Téléverser');
    expect(bouton.getAttribute('type')).toBe('button');
    expect(bouton.getAttribute('aria-label')).toBe('Téléverser une image pour « citrouille »');
    bouton.click();

    expect(ouvertures).toBe(1);
    expect(fixture.componentInstance.elementTeleverser()).toBe(bouton);
  });

  it('bouton icône « Retirer « citrouille » de la préparation » (croix), toujours visible', () => {
    expect(boutonRetirer().getAttribute('type')).toBe('button');
    expect(boutonRetirer().getAttribute('aria-label')).toBe(
      'Retirer « citrouille » de la préparation',
    );
    expect(boutonRetirer().querySelector('mat-icon[svgIcon="fermer"]')).not.toBeNull();
    expect(boutonRetirer().hidden).toBe(false);
  });

  it('« Retirer » émet `retirer` ; `focusRetirer` lui donne le focus', () => {
    let retraits = 0;
    fixture.componentInstance.retirer.subscribe(() => retraits++);

    boutonRetirer().click();
    fixture.componentInstance.focusRetirer();

    expect(retraits).toBe(1);
    expect(document.activeElement).toBe(boutonRetirer());
  });

  const boutonTheme = () => racine.querySelector<HTMLButtonElement>('.carte-mot__theme');

  it('Thèmes pas encore chargés (`theme` indéfini) : pas de bouton du Thème', () => {
    expect(boutonTheme()).toBeNull();
  });

  it('bouton texte du Thème : « cuisine », nom accessible complet ; il émet `changerTheme`', async () => {
    fixture.componentRef.setInput('theme', 'cuisine');
    await fixture.whenStable();
    let ouvertures = 0;
    fixture.componentInstance.changerTheme.subscribe(() => ouvertures++);

    expect(boutonTheme()?.textContent?.trim()).toBe('cuisine');
    expect(boutonTheme()?.getAttribute('type')).toBe('button');
    expect(boutonTheme()?.getAttribute('aria-label')).toBe('Thème de « citrouille » : cuisine');
    boutonTheme()!.click();

    expect(ouvertures).toBe(1);
    expect(fixture.componentInstance.elementTheme()).toBe(boutonTheme());
  });

  it('Mot sans thème : « Sans thème »', async () => {
    fixture.componentRef.setInput('theme', null);
    await fixture.whenStable();

    expect(boutonTheme()?.textContent?.trim()).toBe('Sans thème');
    expect(boutonTheme()?.getAttribute('aria-label')).toBe('Thème de « citrouille » : sans thème');
  });
});

describe('CarteMot illustrée', () => {
  const IMAGE = '0190f0a0-0000-7000-8000-0000000c0001';
  const MOT_ILLUSTRE: MotPreparationDto = {
    id: '0190f0a0-0000-7000-8000-0000000f0001',
    motId: '0190f0a0-0000-7000-8000-0000000e0001',
    forme: 'citrouille',
    ordre: 1,
    sens: { id: '0190f0a0-0000-7000-8000-0000000d0001', libelle: 'légume', categorie: 'nom' },
    illustre: true,
    image: {
      id: IMAGE,
      proprietaireId: '0190f0a0-0000-7000-8000-00000000e001',
      etat: 'privee',
      aRemplacer: null,
      reutilisable: true,
      typeImage: 'image_libre',
      aCompleter: false,
    },
  };
  const original = { creer: URL.createObjectURL, revoquer: URL.revokeObjectURL };

  let fixture: ComponentFixture<CarteMot>;
  let racine: HTMLElement;
  let serveur: HttpTestingController;

  const tour = () => new Promise((fin) => setTimeout(fin));
  async function stabiliser() {
    await tour();
    await fixture.whenStable();
    await tour();
  }
  const miniature = () =>
    serveur.expectOne(
      (requete) =>
        requete.url === `/api/images/${IMAGE}/fichier` &&
        requete.params.get('taille') === 'miniature',
    );

  beforeEach(async () => {
    URL.createObjectURL = vi.fn(() => 'blob:http://localhost/miniature');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideIcones()],
    });
    serveur = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CarteMot);
    fixture.componentRef.setInput('mot', MOT_ILLUSTRE);
    racine = fixture.nativeElement as HTMLElement;
    await stabiliser();
  });

  afterEach(() => {
    serveur.verify();
    URL.createObjectURL = original.creer;
    URL.revokeObjectURL = original.revoquer;
  });

  it('une colonne : vignette en blob par `?taille=miniature`, alternative « Mot, Sens », Badge de type, Mot en cursive', async () => {
    const requete = miniature();
    expect(requete.request.responseType).toBe('blob');
    expect(requete.request.urlWithParams).not.toContain('token');
    requete.flush(new Blob(['png'], { type: 'image/png' }));
    await stabiliser();

    expect(racine.classList).not.toContain('carte-mot--a-illustrer');
    const image = racine.querySelector<HTMLImageElement>('.carte-mot__miniature')!;
    expect(image.getAttribute('src')).toBe('blob:http://localhost/miniature');
    expect(image.getAttribute('alt')).toBe('citrouille, légume');
    expect(
      racine.querySelector('app-badge-type-image')?.textContent?.replace(/\s+/g, ' ').trim(),
    ).toBe('Type : image libre');
    expect(racine.querySelector('.carte-mot__mot')?.textContent?.trim()).toBe('citrouille');
    // Ni badge « à illustrer », ni suggestions ARASAAC, ni « Téléverser ».
    expect(racine.querySelector('.carte-mot__etat')).toBeNull();
    expect(racine.querySelector('app-suggestions-arasaac')).toBeNull();
    expect(racine.querySelector('.carte-mot__televerser')).toBeNull();
    expect(racine.querySelector('.carte-mot__retirer')).not.toBeNull();
  });

  it('un changement de Thème ne recharge pas la miniature ; une autre Image, si', async () => {
    miniature().flush(new Blob(['png']));
    await stabiliser();

    fixture.componentRef.setInput('mot', {
      ...MOT_ILLUSTRE,
      themeId: '0190f0a0-0000-7000-8000-00000000c001',
    });
    await stabiliser();
    serveur.expectNone(() => true);

    const autre = '0190f0a0-0000-7000-8000-0000000c0002';
    fixture.componentRef.setInput('mot', {
      ...MOT_ILLUSTRE,
      image: { ...MOT_ILLUSTRE.image!, id: autre },
    });
    await stabiliser();
    serveur
      .expectOne((requete) => requete.url === `/api/images/${autre}/fichier`)
      .flush(new Blob(['png']));
  });

  it('miniature en échec : l’icône d’image, l’alternative reste lue', async () => {
    miniature().flush(null, { status: 404, statusText: 'Not Found' });
    await stabiliser();

    expect(racine.querySelector('.carte-mot__miniature')).toBeNull();
    expect(racine.querySelector('.carte-mot__repli')).not.toBeNull();
    expect(racine.querySelector('.carte-mot__image .cm-visuellement-masque')?.textContent).toBe(
      'citrouille, légume',
    );
  });
});

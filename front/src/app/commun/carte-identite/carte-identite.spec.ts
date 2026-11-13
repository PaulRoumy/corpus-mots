import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CarteIdentiteImageDto } from '../../api/models/carte-identite-image-dto';
import { CompteCourant } from '../compte-courant';
import { MESSAGES_PAR_CODE } from '../erreurs/message-erreur';
import { provideIcones } from '../icones';
import { CarteIdentite } from './carte-identite';

const MOI = '0190f0a0-0000-7000-8000-00000000e001';
const ZOE = '0190f0a0-0000-7000-8000-00000000e002';
const ANCIEN = '0190f0a0-0000-7000-8000-00000000e003';
const IMAGE = '0190f0a0-0000-7000-8000-0000000c0001';
const AUTRE = '0190f0a0-0000-7000-8000-0000000c0002';

const CARTE: CarteIdentiteImageDto = {
  id: IMAGE,
  proprietaireId: MOI,
  etat: 'privee',
  aRemplacer: null,
  reutilisable: true,
  typeImage: 'image_libre',
  aCompleter: false,
  motId: '0190f0a0-0000-7000-8000-0000000e0001',
  forme: 'citrouille',
  sens: {
    id: '0190f0a0-0000-7000-8000-0000000d0001',
    libelle: 'légume',
    categorie: 'nom',
    aCompleter: false,
  },
  albumOrigine: null,
  licence: 'cc0_domaine_public',
  source: 'site web',
  auteur: null,
};

describe('CarteIdentite', () => {
  let fixture: ComponentFixture<CarteIdentite>;
  let racine: HTMLElement;
  let serveur: HttpTestingController;
  const original = { creer: URL.createObjectURL, revoquer: URL.revokeObjectURL };

  async function stabiliser() {
    await new Promise((fin) => setTimeout(fin));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    URL.createObjectURL = vi.fn(() => 'blob:http://localhost/grande');
    URL.revokeObjectURL = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideIcones()],
    });
    serveur = TestBed.inject(HttpTestingController);
    TestBed.inject(CompteCourant).mettreAJour({
      id: MOI,
      nomAffiche: 'Claire',
      email: 'claire@ecole.fr',
      administrateur: false,
    });
    fixture = TestBed.createComponent(CarteIdentite);
    fixture.componentRef.setInput('imageId', IMAGE);
    racine = fixture.nativeElement as HTMLElement;
    document.body.appendChild(racine);
    await stabiliser();
    serveur.expectOne('/api/enseignants').flush([
      { id: MOI, nomAffiche: 'Claire', statut: 'actif' },
      { id: ZOE, nomAffiche: 'Zoé', statut: 'actif' },
    ]);
  });

  afterEach(() => {
    serveur.match((requete) => requete.url.endsWith('/fichier'));
    serveur.verify();
    racine.remove();
    URL.createObjectURL = original.creer;
    URL.revokeObjectURL = original.revoquer;
  });

  async function servir(carte: CarteIdentiteImageDto, id = IMAGE) {
    serveur.expectOne(`/api/images/${id}`).flush(carte);
    await stabiliser();
  }

  /** Paires « intitulé : valeur » de la liste des champs, dans l'ordre. */
  const champs = () =>
    [...racine.querySelectorAll('dt')].map(
      (dt) =>
        `${dt.textContent?.trim()} : ${dt.nextElementSibling?.textContent?.replace(/\s+/g, ' ').trim()}`,
    );
  const texte = (selecteur: string) =>
    racine.querySelector(selecteur)?.textContent?.replace(/\s+/g, ' ').trim();

  it('aside nommé « Carte d’identité », squelette pendant la lecture, puis le focus va au panneau', async () => {
    const panneau = racine.querySelector<HTMLElement>('aside')!;
    expect(document.getElementById(panneau.getAttribute('aria-labelledby')!)?.textContent).toBe(
      "Carte d'identité",
    );
    expect(racine.querySelector('app-squelette')).not.toBeNull();
    expect(document.activeElement).toBe(panneau);

    await servir(CARTE);
    expect(racine.querySelector('app-squelette')).toBeNull();
  });

  it('les douze champs dans l’ordre du Glossaire ; un champ vide affiche « — »', async () => {
    await servir(CARTE);

    expect(champs()).toEqual([
      'Mot : citrouille',
      'Sens : légume',
      'Catégorie : nom',
      'Sections : —',
      "Album d'origine : —",
      'Module : —',
      'Thèmes : —',
      'Type : image libre',
      'Source : site web',
      'Licence : domaine public / CC0',
      'Auteur : —',
      'Propriétaire : Claire (vous)',
    ]);
    expect(racine.querySelector('.carte-identite__mot')?.textContent).toBe('citrouille');
    expect(texte('app-badge-type-image')).toBe('Type : image libre');
    expect(racine.querySelector('.carte-identite__lecture-seule')).toBeNull();
    expect(racine.querySelector('.carte-identite__basse-resolution')).toBeNull();
    expect(racine.querySelector('footer, .carte-identite__actions')).toBeNull();
  });

  it('grande vignette en blob par `?taille=grande`, alternative « Mot, Sens »', async () => {
    await servir(CARTE);
    const requete = serveur.expectOne((r) => r.url === `/api/images/${IMAGE}/fichier`);
    expect(requete.request.params.get('taille')).toBe('grande');
    expect(requete.request.responseType).toBe('blob');
    requete.flush(new Blob(['png']));
    await stabiliser();

    const image = racine.querySelector<HTMLImageElement>('.carte-identite__image')!;
    expect(image.getAttribute('src')).toBe('blob:http://localhost/grande');
    expect(image.getAttribute('alt')).toBe('citrouille, légume');
  });

  it('image d’album d’un collègue : album (titre puis auteur), « basse résolution », « lecture seule »', async () => {
    await servir({
      ...CARTE,
      proprietaireId: ZOE,
      reutilisable: false,
      typeImage: 'image_album',
      licence: 'usage_pedagogique_album',
      albumOrigine: {
        id: '0190f0a0-0000-7000-8000-00000000a001',
        titre: 'Roule galette',
        auteur: 'Natha Caputo',
      },
    });

    expect(champs()).toContain("Album d'origine : Roule galette, Natha Caputo");
    expect(champs()).toContain("Licence : usage pédagogique de l'album");
    expect(champs()).toContain('Propriétaire : Zoé');
    expect(texte('.carte-identite__basse-resolution')).toBe('basse résolution');
    expect(texte('.carte-identite__lecture-seule')).toBe('lecture seule');
  });

  it('propriétaire absent de l’annuaire : « un ancien membre de l’équipe »', async () => {
    await servir({ ...CARTE, proprietaireId: ANCIEN });

    expect(champs().at(-1)).toBe("Propriétaire : un ancien membre de l'équipe");
  });

  it('Sens « à compléter » mis en avant par la couleur, l’icône et le libellé', async () => {
    await servir({
      ...CARTE,
      sens: { ...CARTE.sens, libelle: 'à compléter', categorie: null, aCompleter: true },
    });

    const sens = racine.querySelector('.carte-identite__sens-a-completer')!;
    expect(sens.textContent?.trim()).toBe('à compléter');
    expect(sens.querySelector('mat-icon')?.getAttribute('svgicon')).toBe('crayon');
    expect(champs()).toContain('Catégorie : —');
  });

  it('échec : message traduit et « Réessayer » dans le panneau, qui relit', async () => {
    serveur.expectOne(`/api/images/${IMAGE}`).error(new ProgressEvent('error'));
    await stabiliser();

    expect(racine.querySelector('aside app-bandeau-erreur [role="alert"]')).not.toBeNull();
    [...racine.querySelectorAll<HTMLButtonElement>('app-bandeau-erreur button')]
      .find((bouton) => bouton.textContent?.trim() === 'Réessayer')!
      .click();
    await stabiliser();
    await servir(CARTE);
    expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
    expect(champs()[0]).toBe('Mot : citrouille');
  });

  it('404 ressource.introuvable : message traduit, sans « Réessayer »', async () => {
    serveur
      .expectOne(`/api/images/${IMAGE}`)
      .flush(
        { status: 404, code: 'ressource.introuvable' },
        { status: 404, statusText: 'Not Found' },
      );
    await stabiliser();

    expect(racine.querySelector('app-bandeau-erreur [role="alert"]')?.textContent?.trim()).toBe(
      MESSAGES_PAR_CODE['ressource.introuvable'],
    );
    expect(
      [...racine.querySelectorAll('app-bandeau-erreur button')].map((b) => b.textContent?.trim()),
    ).not.toContain('Réessayer');
  });

  it('réponse tardive : la première lecture, servie après la seconde, ne remplace pas la Carte', async () => {
    const premiere = serveur.expectOne(`/api/images/${IMAGE}`);
    fixture.componentRef.setInput('imageId', AUTRE);
    await stabiliser();

    await servir({ ...CARTE, id: AUTRE, forme: 'galette' }, AUTRE);
    premiere.flush(CARTE);
    await stabiliser();
    expect(champs()[0]).toBe('Mot : galette');

    // Même chose pour un échec tardif.
    fixture.componentRef.setInput('imageId', IMAGE);
    await stabiliser();
    const troisieme = serveur.expectOne(`/api/images/${IMAGE}`);
    fixture.componentRef.setInput('imageId', AUTRE);
    await stabiliser();
    await servir({ ...CARTE, id: AUTRE, forme: 'galette' }, AUTRE);
    troisieme.error(new ProgressEvent('error'));
    await stabiliser();
    expect(champs()[0]).toBe('Mot : galette');
    expect(racine.querySelector('app-bandeau-erreur')).toBeNull();
  });

  it('une autre Image remplace la Carte affichée', async () => {
    await servir(CARTE);
    fixture.componentRef.setInput('imageId', AUTRE);
    await stabiliser();
    expect(racine.querySelector('app-squelette')).not.toBeNull();

    await servir({ ...CARTE, id: AUTRE, forme: 'galette' }, AUTRE);
    expect(champs()[0]).toBe('Mot : galette');
  });

  it('« Fermer » et Échap émettent `fermer`', async () => {
    await servir(CARTE);
    let fermetures = 0;
    fixture.componentInstance.fermer.subscribe(() => fermetures++);

    racine.querySelector<HTMLButtonElement>('button[aria-label="Fermer"]')!.click();
    racine
      .querySelector('aside')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(fermetures).toBe(2);
  });
});

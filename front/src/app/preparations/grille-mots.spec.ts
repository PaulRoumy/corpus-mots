import { TestBed } from '@angular/core/testing';
import { MotPreparationDto } from '../api/models/mot-preparation-dto';
import { GrilleMots } from './grille-mots';

function mot(forme: string, ordre: number, illustre = false): MotPreparationDto {
  const suffixe = String(ordre).padStart(4, '0');
  return {
    id: `0190f0a0-0000-7000-8000-0000000f${suffixe}`,
    motId: `0190f0a0-0000-7000-8000-0000000e${suffixe}`,
    forme,
    ordre,
    sens: { id: `0190f0a0-0000-7000-8000-0000000d${suffixe}`, libelle: 'à compléter' },
    illustre,
  };
}

const LOUP = mot('loup', 1);
const GALETTE = mot('galette', 2);
const RENARD = mot('renard', 3);

describe('GrilleMots', () => {
  let grille: GrilleMots;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GrilleMots] });
    grille = TestBed.inject(GrilleMots);
  });

  const formes = () => grille.mots()?.map((autre) => autre.forme);

  it('vide tant que rien n’est chargé : aucune écriture n’a d’effet ni ne compte', () => {
    expect(grille.mots()).toBeNull();
    grille.ajouter(LOUP);
    grille.retirer(LOUP.id);
    expect(grille.remplacer(LOUP)).toBe(false);
    expect(grille.mots()).toBeNull();
    expect(grille.revision()).toBe(0);
  });

  it('relecture seule : la liste relue remplace la Grille, sans changer la révision', () => {
    expect(grille.charger([LOUP], 0)).toBe(true);
    expect(grille.charger([LOUP, GALETTE], grille.revision())).toBe(true);
    expect(formes()).toEqual(['loup', 'galette']);
    expect(grille.revision()).toBe(0);
  });

  it('chaque écriture locale augmente la révision ; une relecture partie avant est ignorée', () => {
    grille.charger([LOUP, GALETTE], 0);
    const auDepart = grille.revision();

    grille.ajouter(RENARD);
    expect(grille.revision()).toBe(auDepart + 1);
    grille.remplacer({ ...LOUP, illustre: true });
    expect(grille.revision()).toBe(auDepart + 2);
    grille.retirer(GALETTE.id);
    expect(grille.revision()).toBe(auDepart + 3);

    expect(grille.charger([LOUP, GALETTE], auDepart)).toBe(false);
    expect(formes()).toEqual(['loup', 'renard']);
    expect(grille.mots()![0].illustre).toBe(true);
  });

  it('ajout en double : un seul exemplaire, à sa place selon `ordre`', () => {
    grille.charger([LOUP, RENARD], 0);

    grille.ajouter(GALETTE);
    grille.ajouter({ ...GALETTE, illustre: true });

    expect(formes()).toEqual(['loup', 'galette', 'renard']);
    expect(grille.mots()![1].illustre).toBe(true);
  });

  it('remplacer un Mot retiré : faux, Grille et révision inchangées', () => {
    grille.charger([LOUP, GALETTE], 0);
    grille.retirer(GALETTE.id);
    const avant = grille.mots();
    const revision = grille.revision();

    expect(grille.remplacer({ ...GALETTE, illustre: true })).toBe(false);

    expect(grille.mots()).toBe(avant);
    expect(grille.revision()).toBe(revision);
  });

  it('retirer un Mot absent : Grille et révision inchangées, une relecture reste valable', () => {
    grille.charger([LOUP], 0);
    const avant = grille.mots();

    grille.retirer(GALETTE.id);

    expect(grille.mots()).toBe(avant);
    expect(grille.revision()).toBe(0);
    expect(grille.charger([LOUP, GALETTE], 0)).toBe(true);
  });

  it('listes dérivées : Mots du Lexique présents et nombre d’illustrés', () => {
    expect(grille.nombreIllustres()).toBeNull();
    grille.charger([LOUP, mot('galette', 2, true)], 0);

    expect(grille.nombreIllustres()).toBe(1);
    expect([...grille.motsPresents()]).toEqual([LOUP.motId, GALETTE.motId]);
  });

  it('autre Préparation : `vider` remet Grille et révision à zéro', () => {
    grille.charger([LOUP], 0);
    grille.ajouter(GALETTE);

    grille.vider();

    expect(grille.mots()).toBeNull();
    expect(grille.revision()).toBe(0);
    expect(grille.charger([RENARD], 0)).toBe(true);
    expect(formes()).toEqual(['renard']);
  });

  it('pas fourni en `root` : seul le composant qui le déclare le fournit', () => {
    TestBed.resetTestingModule();

    expect(() => TestBed.inject(GrilleMots)).toThrow();
  });
});

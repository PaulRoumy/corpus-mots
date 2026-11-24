import {
  estRefusVersement,
  phraseVersementIndisponible,
  raisonRefusLot,
  raisonVersement,
} from './raisons-versement';

describe('raisons-versement', () => {
  it('estRefusVersement : vrai pour un code de refus seulement', () => {
    expect(estRefusVersement('image.versement.source_manquante')).toBe(true);
    expect(estRefusVersement('versable')).toBe(false);
    expect(estRefusVersement(null)).toBe(false);
    expect(estRefusVersement(undefined)).toBe(false);
    expect(estRefusVersement('image.versement.inconnu')).toBe(false);
    expect(estRefusVersement('toString')).toBe(false);
  });

  it('licence non versable : « licence à préciser » sans licence, « licence non partageable » sinon', () => {
    const code = 'image.versement.licence_non_versable';
    expect(raisonVersement(code, null)).toBe('licence à préciser');
    expect(raisonVersement(code, undefined)).toBe('licence à préciser');
    expect(raisonVersement(code, 'pixabay')).toBe('licence non partageable');
    expect(raisonVersement(code, 'autre_inconnue')).toBe('licence non partageable');
  });

  it('code inconnu : « motif inconnu », jamais « undefined »', () => {
    expect(phraseVersementIndisponible('image.versement.nouveau', null)).toBe(
      'Verser indisponible : motif inconnu.',
    );
  });

  it('lot : « image d’un collègue », « image indisponible », puis les raisons de versabilité', () => {
    expect(raisonRefusLot('image.reservee_au_proprietaire', null)).toBe("image d'un collègue");
    expect(raisonRefusLot('image.indisponible', null)).toBe('image indisponible');
    expect(raisonRefusLot('image.versement.image_album', null)).toBe(
      "une image d'album reste dans Mes mots",
    );
    expect(raisonRefusLot('image.versement.licence_non_versable', null)).toBe('licence à préciser');
    expect(raisonRefusLot('image.versement.licence_non_versable', 'pixabay')).toBe(
      'licence non partageable',
    );
    expect(raisonRefusLot('toString', null)).toBe('motif inconnu');
  });

  it('phrase : « Verser indisponible : <raison>. »', () => {
    expect(phraseVersementIndisponible('image.versement.type_inconnu', null)).toBe(
      "Verser indisponible : type inconnu, précisez le type de l'image.",
    );
  });
});

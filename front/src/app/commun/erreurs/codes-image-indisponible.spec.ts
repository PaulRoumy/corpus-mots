import { CODES_IMAGE_INDISPONIBLE } from './codes-image-indisponible';
import { MESSAGES_PAR_CODE } from './message-erreur';

describe('CODES_IMAGE_INDISPONIBLE', () => {
  it('reconnaît une Image non proposable ou d’un autre Sens, et rien d’autre', () => {
    expect([...CODES_IMAGE_INDISPONIBLE].sort()).toEqual([
      'image.indisponible',
      'image.sens_different',
    ]);
    expect(CODES_IMAGE_INDISPONIBLE.has('ressource.introuvable')).toBe(false);
    expect(CODES_IMAGE_INDISPONIBLE.has('preparation.sens_invalide')).toBe(false);
  });

  it('chaque code a son message traduit', () => {
    for (const code of CODES_IMAGE_INDISPONIBLE) {
      expect(MESSAGES_PAR_CODE[code]).toBeTruthy();
    }
  });
});

import {
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  output,
  Renderer2,
  untracked,
} from '@angular/core';

/** Chargement du fichier d'une image par le client généré (réponse `blob`, jeton dans l'en-tête, jamais dans l'URL). */
export type ChargementImage = () => Promise<Blob>;

/**
 * Image chargée par le client généré (AD-7) : `<img [appImageSecurisee]="charger" alt="…">`. La fonction rend le
 * fichier en `Blob` ; la directive pose une URL `blob:` en `src` et la révoque quand la fonction change ou que l'image
 * disparaît. Aucune URL d'image ne porte de jeton. Tant que le fichier n'est pas chargé, l'`<img>` n'a pas de `src` ;
 * un échec du chargement, ou un fichier que le navigateur ne sait pas afficher (événement `error`), émet `echec`.
 *
 * La fonction doit garder la même identité d'une détection de changements à l'autre : chaque nouvelle fonction
 * recharge le fichier.
 */
@Directive({
  selector: 'img[appImageSecurisee]',
  host: { '(error)': 'signalerFichierIllisible()' },
})
export class ImageSecurisee {
  readonly appImageSecurisee = input.required<ChargementImage>();
  readonly echec = output<unknown>();

  private readonly image = inject<ElementRef<HTMLImageElement>>(ElementRef).nativeElement;
  private readonly rendu = inject(Renderer2);
  /** URL `blob:` posée en `src`, `null` sans fichier. */
  private urlCourante: string | null = null;

  constructor() {
    effect((nettoyer) => {
      const charger = this.appImageSecurisee();
      let abandonne = false;
      let urlObjet: string | null = null;
      // Sans fichier, pas de `src` du tout : une liaison `[attr.src]` à null poserait `src=""`.
      this.poserSource(null);
      nettoyer(() => {
        abandonne = true;
        if (urlObjet !== null) {
          URL.revokeObjectURL(urlObjet);
        }
      });
      untracked(() => charger()).then(
        (fichier) => {
          if (abandonne) {
            return;
          }
          urlObjet = URL.createObjectURL(fichier);
          this.poserSource(urlObjet);
        },
        (erreur: unknown) => {
          if (!abandonne) {
            this.echec.emit(erreur);
          }
        },
      );
    });
  }

  /** Le navigateur n'a pas pu afficher le fichier : ignoré tant qu'aucune URL `blob:` n'est posée. */
  protected signalerFichierIllisible(): void {
    if (this.urlCourante !== null) {
      this.echec.emit(new Error('Fichier image illisible'));
    }
  }

  private poserSource(url: string | null): void {
    this.urlCourante = url;
    if (url === null) {
      this.rendu.removeAttribute(this.image, 'src');
    } else {
      this.rendu.setAttribute(this.image, 'src', url);
    }
  }
}

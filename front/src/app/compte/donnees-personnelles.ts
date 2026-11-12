import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Texte « Données personnelles » (FR-3, NFR-12, NFR-13) : quelles données, pourquoi, combien de temps, comment en
 * demander l'effacement. Un seul texte, affiché dans la page publique et dans Mes données ; les titres commencent au
 * niveau 2, sous le titre de la page qui l'enveloppe. Périmètre de la V1, à relire à la story 6.8.
 */
@Component({
  selector: 'app-texte-donnees-personnelles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './donnees-personnelles.scss',
  template: `
    <div class="donnees">
      <p class="donnees__chapeau">
        corpus-mots est l'outil de vocabulaire de l'équipe de l'école. Cette page dit ce qu'il garde
        sur vous, pourquoi, combien de temps, et comment en demander l'effacement.
      </p>

      <section class="donnees__section" aria-labelledby="donnees-conservees">
        <h2 id="donnees-conservees" class="donnees__titre">Ce que l'application conserve</h2>

        <h3 class="donnees__sous-titre">Votre compte</h3>
        <ul class="donnees__liste">
          <li>votre nom affiché, que vous pouvez modifier dans Mon compte ;</li>
          <li>votre adresse e-mail ;</li>
          <li>le prénom et le nom saisis à l'activation du compte ;</li>
          <li>votre mot de passe, protégé : il n'est jamais enregistré en clair ;</li>
          <li>votre rôle (enseignant ou administrateur) ;</li>
          <li>le statut du compte (invité, actif, désactivé) et sa date de création.</li>
        </ul>

        <h3 class="donnees__sous-titre">Votre travail dans l'application</h3>
        <ul class="donnees__liste">
          <li>
            les Images que vous ajoutez, avec leur auteur : votre nom affiché ; une Image téléversée
            est réduite et enregistrée sans ses métadonnées (date, appareil, lieu de prise de vue) ;
          </li>
          <li>
            vos Préparations et leurs Mots ; un Mot tapé rejoint le lexique de l'école, sans nom
            d'auteur, et y reste après la suppression du compte ;
          </li>
          <li>l'historique des Fiches que vous générez ;</li>
          <li>vos notifications ;</li>
          <li>les mois au cours desquels vous avez utilisé l'application.</li>
        </ul>

        <h3 class="donnees__sous-titre">Cookies et stockage dans le navigateur</h3>
        <p class="donnees__paragraphe">
          Seuls les cookies de session du service de connexion (Keycloak) sont déposés : ils vous
          gardent connecté 10 heures, ou 30 jours si vous cochez « Rester connecté », ainsi qu'une
          donnée technique gardée dans le navigateur le temps de la connexion. Aucun autre cookie,
          aucun autre stockage.
        </p>

        <h3 class="donnees__sous-titre">Journaux techniques</h3>
        <p class="donnees__paragraphe">
          Les journaux du serveur, qui servent à corriger les pannes, désignent un compte par son
          identifiant interne. Ils ne contiennent pas votre adresse e-mail.
        </p>

        <h3 class="donnees__sous-titre">Pictogrammes ARASAAC</h3>
        <p class="donnees__paragraphe">
          Pour chercher des pictogrammes, le serveur envoie les Mots de vos Préparations à ARASAAC,
          un service extérieur, sans votre nom ni aucune information de votre compte.
        </p>

        <h3 class="donnees__sous-titre">Ce que l'application ne fait pas</h3>
        <ul class="donnees__liste">
          <li>aucune publicité, aucun traceur, aucune mesure d'audience ;</li>
          <li>
            aucune ressource chargée depuis un autre site : polices, images et scripts sont servis
            par l'application elle-même ;
          </li>
          <li>
            aucune donnée d'élève : aucun champ ne permet d'en saisir, et une photo ne doit pas
            montrer d'enfant identifiable.
          </li>
        </ul>
        <p class="donnees__paragraphe">
          L'application est hébergée dans l'Union européenne. Son code est libre (licence AGPL-3.0)
          : chacun peut vérifier ce qu'elle fait.
        </p>
      </section>

      <section class="donnees__section" aria-labelledby="donnees-pourquoi">
        <h2 id="donnees-pourquoi" class="donnees__titre">Pourquoi</h2>
        <ul class="donnees__liste">
          <li>
            l'adresse e-mail et le mot de passe servent à vous connecter et à recevoir l'invitation
            ou le lien « Mot de passe oublié » ;
          </li>
          <li>le nom affiché indique à l'équipe qui a ajouté une Image ;</li>
          <li>le rôle décide qui peut administrer les comptes de l'école ;</li>
          <li>
            vos Préparations, Images et Fiches sont le travail que vous faites dans l'application ;
          </li>
          <li>
            les mois d'activité permettent de faire le bilan de l'usage de l'outil dans l'école.
          </li>
        </ul>
      </section>

      <section class="donnees__section" aria-labelledby="donnees-duree">
        <h2 id="donnees-duree" class="donnees__titre">Combien de temps</h2>
        <ul class="donnees__liste">
          <li>vos données sont gardées tant que votre compte existe ;</li>
          <li>
            un compte sans connexion depuis un an est signalé à l'administrateur de l'école, pour
            suppression ;
          </li>
          <li>
            après la suppression d'un compte, ses données sont effacées de l'application. Les Images
            versées dans la Banque restent à l'école, attribuées à « ancien membre de l'équipe ».
            Les Mots tapés restent dans le lexique de l'école, sans nom d'auteur. Les données
            effacées restent jusqu'à 14 jours dans les sauvegardes, puis disparaissent.
          </li>
        </ul>
        <p class="donnees__paragraphe">
          Cette durée de conservation est en cours de validation avec le délégué à la protection des
          données.
        </p>
      </section>

      <section class="donnees__section" aria-labelledby="donnees-effacement">
        <h2 id="donnees-effacement" class="donnees__titre">Demander l'effacement</h2>
        <p class="donnees__paragraphe">
          Demandez-le à l'administrateur de l'école. L'effacement suit les règles de « Combien de
          temps ».
        </p>
      </section>
    </div>
  `,
})
export class TexteDonneesPersonnelles {}

/** Mes données, dans la coquille (Menu de profil › Mes données) : le même texte, sous le titre « Mes données ». */
@Component({
  selector: 'app-mes-donnees',
  imports: [TexteDonneesPersonnelles],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../commun/page-rubrique.scss',
  template: `
    <div class="page">
      <h1 class="page__titre">Mes données</h1>
      <app-texte-donnees-personnelles />
    </div>
  `,
})
export class MesDonnees {}

/**
 * Page publique « Données personnelles », hors de la coquille : en-tête minimal et lien « Ouvrir corpus-mots ».
 * Le lien est un `href` ordinaire : il recharge l'application, qui démarre alors la connexion.
 */
@Component({
  selector: 'app-page-donnees-personnelles',
  imports: [TexteDonneesPersonnelles],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './page-donnees-personnelles.scss',
  template: `
    <header class="publique__entete">
      <span class="publique__marque">corpus<span class="publique__point">·</span>mots</span>
      <a class="publique__ouvrir" href="/">Ouvrir corpus-mots</a>
    </header>
    <main class="publique__contenu">
      <h1 class="publique__titre">Données personnelles</h1>
      <app-texte-donnees-personnelles />
    </main>
  `,
})
export class PageDonneesPersonnelles {}

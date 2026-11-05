<#-- Pied de la carte, sur toutes les pages de connexion de keycloak.v2 (Connexion, Créer mon mot de passe,
     Mot de passe oublié, lien expiré) : lien « Données personnelles » (UX-DR-39). Lien relatif : la page est
     servie par l'application, à la même origine que /auth, en développement comme en production. Ouvert dans
     un nouvel onglet : l'invitée sur « Créer mon mot de passe » (lien de l'e-mail) ne quitte pas son parcours, que
     « Ouvrir corpus-mots » remplacerait sinon par une Connexion sans mot de passe. -->
<#macro content>
    <div class="${properties.kcLoginMainFooterBand!} ${properties.kcFormClass!}">
        <p class="${properties.kcLoginMainFooterBandItem!}">
            <a id="donnees-personnelles" href="/donnees-personnelles" target="_blank" rel="noopener">${msg("donneesPersonnelles")}</a>
        </p>
    </div>
</#macro>

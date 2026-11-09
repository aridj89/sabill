# Sabil School — High-Speed Local NFC USB Bridge Agent

Agent local autonome et ultra-rapide reliant votre lecteur NFC physique USB (connecté à votre PC de bureau) à votre application hébergée sur **Railway**.

---

## ⚡ Caractéristiques & Optimisations

- **Ultra-rapide** : Fréquence de scan de 60ms et persistance des connexions HTTPS (`keepAlive: true`) pour une validation d'assiduité quasi instantanée (<250ms).
- **100% Silencieux** : Exécution en arrière-plan sans aucune fenêtre de terminal noire intempestive.
- **Démarrage automatique** : Se lance automatiquement à l'allumage ou redémarrage de Windows via le dossier Démarrage (Startup).
- **Supervision & Auto-Restart** : Si le lecteur USB est déconnecté puis reconnecté ou si le processus rencontre une interruption, le superviseur le relance automatiquement avec protection contre les boucles rapides.
- **Instance unique protégée** : Empêche le lancement de doublons concurrents sur le même lecteur USB.
- **Compatible** : Supporte les lecteurs USB HID 5YOA (`VID 0x0483`, `PID 0x4343`) et PC/SC (`ACR122U`).

---

## 🚀 Installation en 1 Clic (Recommandé)

1. Assurez-vous que **Node.js (LTS)** est installé sur le PC Windows ([télécharger ici](https://nodejs.org/)).
2. Branchez le lecteur NFC USB.
3. Double-cliquez sur **`install-autostart.bat`**.
   - Ce script installe automatiquement les dépendances si nécessaire.
   - Il crée le raccourci de démarrage automatique silencieux dans le menu Démarrage de Windows.
   - Il lance immédiatement l'agent en arrière-plan.

**C'est tout !** L'agent tournera désormais automatiquement et silencieusement à chaque démarrage du PC.

---

## 🛠️ Outils de Gestion Inclus

- **`check-status.bat`** : Affiche en temps réel si l'agent est actif en arrière-plan et montre les dernières lignes de log.
- **`stop-agent.bat`** : Arrête immédiatement l'agent et son superviseur.
- **`uninstall-autostart.bat`** : Supprime le démarrage automatique de Windows et arrête l'agent.
- **`start.bat`** : Démarrage classique en mode console avec logs visibles (utile pour le débogage interactif).

---

## 📁 Logs
Les logs d'activité et de pointage sont enregistrés en continu dans le fichier :
`agent.log` (rotation automatique pour ne pas saturer le disque).

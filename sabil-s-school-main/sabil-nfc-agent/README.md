# Sabil NFC Agent

Agent Windows qui lit les lecteurs NFC **PC/SC** (ACR122U et compatibles) et envoie chaque scan
à l'API hébergée de Sabil School (`POST /api/nfc/scan`) en HTTPS, avec un jeton propre à chaque poste.

> **Lecteur « clavier » (HID) ?** Aucun agent nécessaire : ouvrez simplement le site et l'écran
> *Pointage NFC*. Test rapide : placez le curseur dans le Bloc-notes et scannez une carte. Si le numéro
> s'écrit, c'est un lecteur HID. Sinon, c'est un lecteur PC/SC et il faut cet agent.

## Architecture

```
 Lecteur PC/SC ─► Agent (Windows, en arrière-plan) ──HTTPS + X-Device-Token──► Backend Express (hébergé)
                    │  reader.js   détection / reconnexion                       │ /api/nfc/scan → nfcReaderService
                    │  sender.js   file d'attente, retry, scanId idempotent      │ attendanceService + SQLite
                    │  api.js      HTTPS + auth poste                            │ /api/nfc/heartbeat
                    └─ statusServer 127.0.0.1:47800 (page d'état locale)         ▼
                                                                         SSE /api/nfc/stream
 Lecteur HID ─► navigateur (useNfcReader) ──HTTPS + JWT admin──► /api/nfc/scan    ▼
                                                                  NfcAttendanceScreen (temps réel)
```

* Le **serveur seul** décide si la présence est valide (le client n'envoie que l'UID).
* Un scan réessayé (même `scanId`) n'est jamais traité deux fois.
* Le jeton du poste est chiffré avec **Windows DPAPI** (compte utilisateur courant) ; il n'est ni dans
  `config.json`, ni dans le code frontend, ni dans les logs.

## 1. Déploiement du backend (une fois)

1. Déployer l'application (Railway, nixpacks.toml fourni) **en HTTPS**.
2. Variables d'environnement : `JWT_SECRET` (long, aléatoire — obligatoire en production),
   `NODE_ENV=production`, `DATABASE_PATH` (volume persistant).
3. Se connecter en admin → *Pointage NFC* → **Postes clients NFC** → saisir un identifiant
   (ex. `SABIL-CLIENT-01`) → **Ajouter**. Le jeton `sdt_…` n'est affiché **qu'une fois** : le copier.
   Un poste perdu/volé se révoque depuis la même liste.

Aucun domaine n'est codé en dur : l'agent reçoit l'URL à l'installation.

## 2. Construire l'installateur Windows (machine de build, pas chez le client)

Choix du packaging : `pkg` (Vercel) est archivé ; `@yao-pkg/pkg` et Node SEA savent embarquer du JS mais
les addons natifs (`@pokusew/pcsclite`, fichier `.node`) doivent être extraits sur disque au runtime.
Pour éviter ce point fragile, l'installateur **embarque `node.exe` + le dossier `node_modules` compilé**
(Inno Setup 6, installation par utilisateur, sans droits administrateur). Le `node.exe` embarqué est celui
qui a compilé le module natif, donc l'ABI correspond toujours.

Prérequis : Windows x64, Node 22 LTS, Visual Studio Build Tools (C++) + Python 3, Inno Setup 6.

```powershell
cd sabil-nfc-agent
npm ci
npm test
powershell -ExecutionPolicy Bypass -File installer\build-windows.ps1
# → dist\SabilNfcAgentSetup.exe
```

Alternative : workflow GitHub Actions `.github/workflows/build-nfc-agent.yml` (runner `windows-latest`).

> L'exécutable n'est pas signé : SmartScreen affichera « Éditeur inconnu » tant qu'un certificat de
> signature de code n'est pas appliqué (`signtool`).

## 3. Installation chez le client (une seule fois)

1. Brancher le lecteur (le pilote CCID de Windows suffit en général ; sinon pilote ACS).
2. Lancer `SabilNfcAgentSetup.exe`, saisir l'adresse du site, l'identifiant du poste et le jeton.
3. C'est tout : l'agent démarre tout de suite et à chaque ouverture de session Windows (raccourci dans
   *Démarrage*), sans fenêtre.

Installation silencieuse :
`SabilNfcAgentSetup.exe /VERYSILENT /URL=https://site /DEVICE=SABIL-CLIENT-01 /TOKEN=sdt_…`

Menu Démarrer → *Sabil NFC Agent* : **État**, **Arrêter**, **Redémarrer**, **Journal**.
Le client n'ouvre jamais de terminal.

Ensuite : ouvrir le site → *Pointage NFC* → scanner. Les présences apparaissent en direct.

## 4. Développement local

```bash
cd sabil-nfc-agent
npm install                       # compile @pokusew/pcsclite (outils de compilation requis)
npm test                          # 14 tests (lecteur simulé, aucun matériel)
SABIL_API_URL=http://localhost:5000 SABIL_DEVICE_ID=DEV-1 SABIL_DEVICE_TOKEN=sdt_… npm start
```

Variables : `SABIL_API_URL`, `SABIL_DEVICE_ID`, `SABIL_DEVICE_TOKEN`, `SABIL_STATUS_PORT`,
`SABIL_AGENT_HOME` (dossier de données), `SABIL_ALLOW_HTTP=1` (HTTP hors localhost, déconseillé).
`config.example.json` montre les réglages optionnels (heartbeat, fenêtre anti-doublon, durée max de retry).

Données et logs : `%LOCALAPPDATA%\SabilNfcAgent\` (`config.json`, `device-token.dpapi`, `logs\agent.log`).

## 5. Dépannage

| Symptôme | Cause probable / action |
|---|---|
| Page d'état : « Aucun lecteur détecté » | Lecteur débranché ; service Windows *Carte à puce* arrêté (`services.msc` → démarrer) ; pilote absent. |
| « Authentification refusée » | Jeton révoqué ou erroné. Créer un nouveau jeton (admin) et réinstaller. |
| « Injoignable » | Pas d'Internet / URL erronée. L'agent réessaie seul ; un scan de plus de 5 min est abandonné (journalisé). |
| Rien dans l'écran Pointage NFC mais l'agent est vert | Carte non attribuée (message « Carte inconnue »), ou session admin expirée (reconnectez-vous). |
| Le numéro de la carte diffère entre HID et PC/SC | Certains lecteurs HID envoient l'UID en décimal ou en ordre inversé. Attribuez les cartes avec le **même** lecteur que celui utilisé pour pointer. |
| L'agent ne redémarre pas après un crash | Il est supervisé (redémarrage avec délai croissant). Consulter `agent.log`. Code 78 = configuration manquante. |

## 6. Ce qui n'a PAS été testé

Aucun test avec un lecteur physique ni sur Windows (voir le rapport final) : lecture réelle ACR122U,
DPAPI, installateur Inno Setup, démarrage automatique, raccourcis.


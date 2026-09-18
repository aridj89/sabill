# Sabil School — Local NFC USB Bridge Agent

Ce composant est un agent local autonome permettant de relier votre lecteur NFC physique USB (connecté à votre PC local) à votre application hébergée sur **Railway**.

---

## 📌 Pourquoi cet agent est-il nécessaire ?

- Votre serveur Express et SQLite tournent sur un conteneur distant dans le cloud (**Railway**).
- Le serveur Railway est une machine virtuelle distante sans port USB physique et sans pilote matériel `libusb`.
- Le lecteur NFC USB est physiquement branché sur votre PC de bureau (client).
- Cet agent s'exécute localement sur votre ordinateur, écoute les lectures de cartes NFC sur le port USB, et transmet instantanément le UID scanné à votre API Railway via une requête `POST /api/nfc/scan`.
- Le serveur Railway met à jour la base SQLite et notifie automatiquement l'interface web ouverte via Server-Sent Events (SSE).

---

## 🛡️ Note Importante sur le HTTPS & Mixed-Content

Si un site web hébergé en HTTPS (`https://votre-app.railway.app`) tente d'effectuer une requête JavaScript vers `http://localhost:5000`, les navigateurs modernes (Chrome, Firefox, Safari) **bloquent** la requête en raison des politiques :
1. **Mixed Content** (ressource non sécurisée HTTP appelée depuis une page HTTPS).
2. **Private Network Access (PNA)** (restriction d'accès au réseau local depuis l'internet public).

### 💡 Comment notre architecture évite ce problème :
Cet agent **n'écoute pas** en tant que serveur HTTP local que le navigateur doit appeler.  
Au contraire, **l'agent local effectue lui-même des requêtes sortantes** vers l'API Railway (`POST https://votre-app.railway.app/api/nfc/scan`).  
Puisque la requête part de Node.js vers l'URL HTTPS publique de Railway, elle n'est soumise à **aucune restriction de Mixed-Content** du navigateur !

---

## ⚙️ Configuration & Installation

### 1. Prérequis
- Node.js (version 18 ou supérieure) installé sur votre ordinateur Windows.
- Votre lecteur NFC USB branché.

### 2. Configuration de l'URL Railway
Ouvrez le fichier `.env` dans ce dossier (ou copiez `.env.example` en `.env`) et renseignez l'URL de votre déploiement Railway :

```env
API_BASE_URL=https://votre-projet.up.railway.app
SCAN_COOLDOWN_MS=1500
```

*(Pour tester en local sur votre machine avant déploiement, utilisez `API_BASE_URL=http://localhost:5000`).*

### 3. Démarrage rapide

#### Option A — Via le raccourci Windows :
Double-cliquez simplement sur le fichier **`start.bat`**.

#### Option B — En ligne de commande :
```bash
cd local-nfc-bridge
npm install
npm start
```

---

## 🔍 Lecteurs pris en charge
1. **Lecteurs USB HID 5YOA** (VID `0x0483`, PID `0x4343`) — Détecté et pris en charge nativement via `node-hid`.
2. **Lecteurs PC/SC standards** (ACR122U, ACR1252, etc.) — Détectés automatiquement via le pilote PC/SC Windows.

# Application d'Analyse de Risque Fournisseur

Cette application permet d'évaluer et de gérer les risques associés aux fournisseurs d'une entreprise. Elle intègre des fonctionnalités d'analyse par intelligence artificielle (OpenAI, Claude, DeepSeek) pour améliorer la détection des risques.

## Architecture

L'application est composée de trois parties principales :

1. **Frontend** : Application React avec Material UI (port 3040)
2. **Backend** : Serveur Node.js avec Express (port 5040)
3. **Base de données** : PostgreSQL dans Docker (port 5440)

## Prérequis

- Node.js (v14+)
- Docker
- Clés API pour les services d'IA (OpenAI, Anthropic, DeepSeek)

## Configuration

### Base de données PostgreSQL

1. Démarrer le conteneur Docker PostgreSQL :

```bash
docker run --name risk-analysis-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=risk_analysis -p 5440:5432 -d postgres
```

### Backend

1. Accéder au répertoire backend :

```bash
cd C:\App\RiskAnalysis\RiskAnalysis_1.0\backend
```

2. Installer les dépendances :

```bash
npm install
```

3. Configurer les variables d'environnement dans le fichier `.env` :
   - Renseigner les clés API pour OpenAI, Anthropic et DeepSeek
   - Vérifier les paramètres de connexion à la base de données

4. Initialiser la base de données :

```bash
npm run init-db
```

5. Démarrer le serveur backend :

```bash
npm start
```

Le serveur backend sera accessible à l'adresse : http://localhost:5040

### Frontend

1. Accéder au répertoire frontend :

```bash
cd C:\App\RiskAnalysis\RiskAnalysis_1.0\frontend
```

2. Installer les dépendances :

```bash
npm install
```

3. Démarrer l'application frontend :

```bash
npm start
```

L'application frontend sera accessible à l'adresse : http://localhost:3040

## Fonctionnalités principales

- **Tableau de bord** : Vue d'ensemble des risques fournisseurs
- **Gestion des fournisseurs** : Ajout, modification et suppression de fournisseurs
- **Évaluation des risques** : Création d'évaluations de risque pour les fournisseurs
- **Analyse IA** : Utilisation de modèles d'IA pour analyser les informations fournisseur
- **Paramètres** : Configuration des clés API et des paramètres de connexion

## Intégration avec les modèles d'IA

L'application utilise trois modèles d'IA différents pour l'analyse des risques :

1. **OpenAI GPT-4** : Analyse détaillée et recommandations basées sur les données textuelles
2. **Anthropic Claude** : Analyses nuancées avec une compréhension approfondie du contexte
3. **DeepSeek AI** : Capacités d'analyse avancées pour les données structurées

Les clés API pour ces services doivent être configurées dans la page Paramètres de l'application ou directement dans le fichier `.env` du backend.

## Sécurité

- Les clés API sont stockées localement dans le navigateur de l'utilisateur
- Les mots de passe et informations sensibles sont masqués par défaut dans l'interface
- Les données sont transmises de manière sécurisée entre le frontend et le backend

## Support et maintenance

Pour toute question ou problème, veuillez contacter l'équipe de développement.

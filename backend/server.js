const path = require('path');
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bodyParser = require('body-parser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');

// Importation des clients API pour les modèles d'IA
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Importer le service de formatage des réponses
const { formatAIResponse } = require('./services/responseFormatter');

// Import du service de scraping
const { scrapeCompanyInfo, scrapePappersData } = require('./services/scraper');
const { getPappersEssentialData } = require('./services/pappersEssentialService');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5040;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration de la connexion PostgreSQL
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Tester la connexion à PostgreSQL
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Erreur de connexion à PostgreSQL:', err.message);
  } else {
    console.log('Connecté à PostgreSQL à', res.rows[0].now);
  }
});

// Initialize AI clients only if not using mock responses
let openai;
let anthropic;
let genAI;

if (process.env.USE_MOCK_RESPONSE !== 'true') {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  if (process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
}

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, timestamp: result.rows[0].now });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Models routes
// Route pour le moteur de raisonnement qui consolide les quatre analyses
app.post('/api/reasoning', async (req, res) => {
  try {
    console.log('Received reasoning request body:', JSON.stringify(req.body, null, 2));
    
    const { openaiResult, anthropicResult, deepseekResult, geminiResult, companyName, scrapedData } = req.body;
    
    if (!openaiResult || !anthropicResult || !deepseekResult || !geminiResult || !companyName) {
      return res.status(400).json({ success: false, error: 'All analysis results and company name are required' });
    }
    
    console.log(`Running reasoning engine for ${companyName}`);
    console.log(`Scraped data available: ${scrapedData ? 'Yes' : 'No'}`);
    
    let result;
    
    // Utiliser une réponse simulée pour tester si le problème vient des API
    if (process.env.USE_MOCK_RESPONSE === 'true') {
      console.log('Using mock response for reasoning engine');
      
      // S'assurer que companyName est traité comme une chaîne de caractères
      let company = 'entreprise inconnue';
      if (companyName && typeof companyName === 'string' && companyName.trim() !== '') {
        company = companyName.trim();
        console.log('Using company name from request:', company);
      } else {
        console.log('Company name not provided or invalid, using default:', company);
      }
      
      result = `# Analyse consolidée pour ${company}

## Synthèse générale
Après analyse des résultats des trois modèles d'IA (OpenAI, Claude et DeepSeek), voici une synthèse consolidée des informations sur ${company}.

## Présentation de l'entreprise
${company} est une entreprise reconnue dans son secteur d'activité, avec une présence internationale et une gamme de produits diversifiée.

## Points clés identifiés par les trois modèles
1. Solidité financière et stabilité économique
2. Diversification des produits et services
3. Présence internationale
4. Stratégie d'innovation continue

## Analyse de risque

### Risques financiers
- Exposition aux fluctuations des taux de change en raison de la présence internationale
- Potentielle pression sur les marges due à la concurrence accrue

### Risques opérationnels
- Dépendance possible envers certains fournisseurs clés
- Risques liés à la chaîne d'approvisionnement mondiale

### Risques de conformité
- Exposition aux réglementations environnementales en évolution
- Exigences variables selon les marchés internationaux

### Risques de réputation
- Attentes croissantes en matière de responsabilité sociale et environnementale
- Sensibilité aux controverses potentielles sur les réseaux sociaux

## Recommandations
1. Surveiller régulièrement les indicateurs financiers clés
2. Évaluer la diversification des fournisseurs pour réduire les risques opérationnels
3. Mettre en place un système de veille réglementaire efficace
4. Renforcer les initiatives ESG pour améliorer la réputation

*Note: Cette analyse est basée sur la consolidation des résultats des trois modèles d'IA et représente une synthèse des informations disponibles.*`;
    } else {
      // Utiliser l'API OpenAI pour le moteur de raisonnement
      let reasoningPrompt = `Tu es un spécialiste de l'analyse de risque d'entreprise avec une expertise avancée dans l'évaluation des fournisseurs, l'identification des risques et la consolidation d'informations provenant de sources multiples.

## OBJECTIF
Consolide les quatre analyses ci-dessous en une seule analyse complète, structurée et cohérente pour la société ${companyName}, en mettant particulièrement l'accent sur une analyse de risque approfondie et détaillée.`;
      
      // Ajouter les instructions importantes
      reasoningPrompt += `

## INSTRUCTIONS IMPORTANTES
- Utilise un format Markdown avec des titres et sous-titres clairs
- Réconcilie les informations contradictoires en indiquant les différentes sources
- Indique explicitement "Information non disponible" lorsqu'aucune des quatre analyses ne fournit une donnée spécifique
- Cite les sources externes mentionnées dans les analyses (rapports annuels, sites officiels, etc.)
- Fournis les données les plus récentes disponibles en précisant la date
- Identifie les forces et faiblesses de l'entreprise en vous basant sur les quatre analyses
- Sois spécifique et concret dans l'identification des risques, évite les généralités
- Quantifie les risques lorsque possible (pourcentages, montants, parts de marché)
- Fais des liens explicites entre les différentes catégories de risques pour montrer leurs interactions
- Priorise les risques en fonction de leur impact potentiel et de leur probabilité
- Fournis des recommandations actionables et réalistes pour chaque risque majeur`;
      
      // Ajouter les données du scraping si disponibles
      if (scrapedData && Object.keys(scrapedData).length > 0) {
        reasoningPrompt += `

## DONNÉES DU SCRAPING INTERNET
Utilise également les données suivantes issues du scraping web pour enrichir ton analyse:

${JSON.stringify(scrapedData, null, 2)}`;
      }
      
      // Ajouter les sources d'analyse
      reasoningPrompt += `

## SOURCES D'ANALYSE

### Analyse d'OpenAI:
${openaiResult}

### Analyse de Claude:
${anthropicResult}

### Analyse de DeepSeek:
${deepseekResult}

### Analyse de Gemini:
${geminiResult}`;
      
      // Ajouter la structure requise
      reasoningPrompt += `

## STRUCTURE REQUISE
1. Synthèse générale de l'entreprise (1-2 paragraphes)
2. Informations consolidées sur l'entreprise (suivre les 12 catégories d'information)
3. Analyse de risque détaillée et approfondie (cette section doit constituer au moins 60% de l'analyse totale)

### ANALYSE DE RISQUE APPROFONDIE

#### 1. Risques financiers (section prioritaire)
- Risque de liquidité et de trésorerie (analyse détaillée)
  * Ratio de liquidité générale et immédiate
  * Besoin en fonds de roulement et évolution
  * Capacité à faire face aux échéances à court terme
  * Accès aux lignes de crédit et facilités de trésorerie

- Risque de crédit et d'exposition aux défaillances
  * Concentration des clients et dépendance aux grands comptes
  * Qualité du portefeuille clients et historique des défaillances
  * Politique de gestion des créances et délais de paiement
  * Provisions pour créances douteuses

- Risque de marché financier
  * Exposition aux variations des taux d'intérêt et stratégies de couverture
  * Exposition aux fluctuations des devises et impact sur les marges
  * Sensibilité aux prix des matières premières et commodités
  * Instruments financiers utilisés pour la couverture des risques

- Risque d'endettement et structure du capital
  * Ratio d'endettement et évolution
  * Structure de la dette (court terme vs long terme)
  * Covenants bancaires et risque de non-conformité
  * Capacité de remboursement (ratio de couverture du service de la dette)
  * Notation de la dette et évolution récente

- Risque de valorisation des actifs
  * Goodwill et risque de dépréciation
  * Actifs incorporels et leur valorisation
  * Actifs immobiliers et risque de dévaluation
  * Tests de dépréciation récents et résultats

- Risque de rentabilité et de performance
  * Volatilité des marges et facteurs d'influence
  * Seuil de rentabilité et sensibilité aux variations d'activité
  * Tendances des principaux ratios de rentabilité
  * Comparaison avec les benchmarks sectoriels

#### 2. Risques opérationnels
- Risques liés à la chaîne d'approvisionnement (dépendances, ruptures)
- Risques de production et de qualité
- Risques technologiques et informatiques (cybersécurité, obsolescence)
- Risques liés aux ressources humaines (talents clés, compétences)
- Risques liés aux infrastructures et aux actifs physiques

#### 3. Risques de conformité
- Risques réglementaires spécifiques au secteur
- Risques juridiques (litiges, propriété intellectuelle)
- Risques fiscaux
- Risques liés à la protection des données
- Risques de corruption et de non-conformité éthique

#### 4. Risques de réputation
- Risques ESG (environnementaux, sociaux, gouvernance)
- Risques liés aux médias sociaux et à l'image de marque
- Risques liés aux relations avec les parties prenantes
- Risques liés à la responsabilité sociale et environnementale
- Risques liés à la transparence et à la communication

#### 5. Risques stratégiques
- Risques concurrentiels et positionnement sur le marché
- Risques liés à l'innovation et à la disruption technologique
- Risques liés aux fusions, acquisitions et partenariats
- Risques liés à la diversification/concentration des activités
- Risques liés à la stratégie de croissance

#### 6. Risques géopolitiques et macroéconomiques
- Risques liés aux pays d'opération (instabilité politique, réglementations locales)
- Risques liés aux tensions commerciales internationales
- Risques liés aux crises sanitaires ou événements exceptionnels
- Risques liés aux changements climatiques
- Risques liés aux tendances macroéconomiques (inflation, récession)

Pour chaque risque identifié, tu dois obligatoirement fournir:
1. Une description détaillée du risque et son contexte spécifique pour ${companyName}
2. Une note de risque sur une échelle de 0 à 100 (0 = risque très faible, 100 = risque extrêmement élevé) avec le code couleur suivant:
   - 0-65: 🟢 Risque faible à modéré (vert)
   - 66-79: 🟠 Risque élevé (orange)
   - 80-100: 🔴 Risque critique (rouge)
   
   IMPORTANT: Pour obtenir une meilleure répartition des notes sur l'échelle:
   - Pour les risques que tu évaluerais normalement en dessous de 40, diminue encore leur note de 5 à 10 points
   - Pour les risques que tu évaluerais normalement entre 40 et 60, garde la note telle quelle
   - Pour les risques que tu évaluerais normalement au-dessus de 60, augmente leur note de 5 à 10 points
   
   Cette approche vise à avoir proportionnellement plus de notes dans la catégorie orange (51-75) pour une meilleure granularité de l'analyse.
3. Une justification de cette note basée sur des éléments concrets
4. L'impact potentiel quantifié ou qualifié sur l'entreprise (financier, opérationnel, réputation)
5. Des mesures d'atténuation spécifiques et réalistes
6. Des indicateurs de surveillance recommandés

## MATRICE DES RISQUES
Après l'analyse détaillée, présente une matrice des risques identifiant les 10 risques les plus critiques pour ${companyName}, classés par probabilité et impact potentiel. Pour chaque risque dans la matrice, indique:
1. Le nom du risque
2. La catégorie de risque (financier, opérationnel, etc.)
3. La note de risque sur 100 avec le code couleur correspondant (🟢 0-65, 🟠 66-79, 🔴 80-100), en appliquant les mêmes règles d'ajustement que pour les risques individuels
4. Une brève description de l'impact potentiel

## CONCLUSION
Termine par une évaluation globale du profil de risque de ${companyName}, en incluant:

### Évaluation globale du risque
Attribue une note globale de risque sur 100 avec le code couleur correspondant (🟢 0-65, 🟠 66-79, 🔴 80-100) et justifie cette évaluation globale. Applique les mêmes règles d'ajustement que pour les risques individuels afin d'obtenir une répartition plus équilibrée des notes, avec une préférence pour la zone orange (66-79) qui permet une meilleure granularité de l'analyse.

### Risques critiques et recommandations
1. Les 3-5 risques les plus critiques nécessitant une attention immédiate (avec leur note sur 100 et code couleur), en accordant une importance particulière aux risques financiers
2. Une évaluation synthétique de la solidité financière globale de l'entreprise
3. Les zones de vulnérabilité structurelle de l'entreprise, notamment sur le plan financier
4. Les forces financières qui peuvent atténuer certains risques
5. Des recommandations stratégiques pour la gestion globale des risques, avec un focus sur les stratégies de mitigation des risques financiers
6. Une perspective sur l'évolution probable du profil de risque financier à moyen terme (2-3 ans)`;
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "Tu es un spécialiste de l'analyse d'entreprise et d'analyse de risque. Réponds en français et formate ta réponse en markdown." },
          { role: "user", content: reasoningPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      });
      
      result = completion.choices[0].message.content;
    }
    
    // Formater et nettoyer les réponses avant de les envoyer
    const formattedResults = formatAIResponse({
      reasoning: result,
      openai: openaiResult,
      anthropic: anthropicResult,
      deepseek: deepseekResult,
      gemini: geminiResult
    });
    
    // Envoyer la réponse
    res.json(formattedResults);
  } catch (error) {
    console.error('Reasoning engine error:', error);
    console.error('Error stack:', error.stack);
    if (error.response) {
      console.error('API response error:', error.response.data);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    console.log('Received request body:', JSON.stringify(req.body, null, 2));
    
    const { text, model, companyName, country, identifier } = req.body;
    
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }
    
    console.log(`Analyzing with ${model}`);
    console.log(`Company name from request:`, companyName);
    console.log(`Country from request:`, country || 'France');
    console.log(`Identifier from request:`, identifier || 'Not provided');
    
    let result;
    
    // Utiliser une réponse simulée pour tester si le problème vient des API
    if (process.env.USE_MOCK_RESPONSE === 'true') {
      console.log('Using mock response for model:', model);
      
      // Utiliser le nom de l'entreprise envoyé directement par le frontend
      // S'assurer que companyName est traité comme une chaîne de caractères
      let company = 'entreprise inconnue';
      if (companyName && typeof companyName === 'string' && companyName.trim() !== '') {
        company = companyName.trim();
        console.log('Using company name from request:', company);
      } else {
        console.log('Company name not provided or invalid, using default:', company);
      }
      
      result = `# Analyse de ${company}

## Présentation générale
Cette entreprise est active dans son secteur et propose des produits ou services à ses clients.

## Historique
Fondée il y a plusieurs années, l'entreprise a connu une évolution constante.

## Risques identifiés
- Risques de marché liés à la concurrence
- Risques opérationnels potentiels
- Risques réglementaires selon le secteur d'activité

## Recommandations
- Approfondir l'analyse avec des données financières précises
- Évaluer la position concurrentielle
- Analyser la conformité réglementaire

*Note: Ceci est une réponse simulée pour tester l'application sans appeler les API externes.*`;
    } else {
      // Utiliser les valeurs par défaut si non fournies
      const countryValue = country || 'France';
      
      switch (model) {
        case 'openai':
          result = await analyzeWithOpenAI(text, companyName, countryValue, identifier);
          break;
        case 'anthropic':
          result = await analyzeWithAnthropic(text, companyName, countryValue, identifier);
          break;
        case 'deepseek':
          result = await analyzeWithDeepseek(text, companyName, countryValue, identifier);
          break;
        case 'gemini':
          result = await analyzeWithGemini(text, companyName, countryValue, identifier);
          break;
        default:
          return res.status(400).json({ success: false, error: 'Invalid model specified' });
      }
    }
    
    // Formater et nettoyer les réponses avant de les envoyer
    const formattedResults = formatAIResponse({
      [model]: result
    });
    
    // Envoyer la réponse
    res.json(formattedResults);
  } catch (error) {
    console.error('Analysis error:', error);
    console.error('Error stack:', error.stack);
    if (error.response) {
      console.error('API response error:', error.response.data);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Model integration functions
async function analyzeWithOpenAI(text, companyName = null, country = 'France') {
  try {
    console.log('Calling OpenAI API with text:', text.substring(0, 100) + '...');
    console.log('Using API key:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 5)}...` : 'Not set');
    console.log('Company name:', companyName);
    console.log('Country:', country);
    
    // Utiliser le nom de l'entreprise fourni ou extraire du texte si non fourni
    let company = companyName || 'entreprise inconnue';
    if (!companyName && text.includes('société:')) {
      const match = text.match(/société:\s*([^\n\.]+)/i);
      if (match && match[1]) {
        company = match[1].trim();
      }
    }
    
    // Prompt standardisé pour tous les modèles
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", 
      messages: [
        { role: "system", content: `Tu es un spécialiste de l'analyse d'entreprise avec une expertise particulière dans l'identification des risques, spécialement pour les entreprises basées en ${country}. Tu dois TOUJOURS formater ta réponse en markdown valide avec des titres, sous-titres, listes à puces et paragraphes bien structurés. Assure-toi que ta réponse est complète et correctement formatée.` },
        { role: "user", content: `Fournis une analyse détaillée et structurée de l'entreprise ${company} basée en ${country}, incluant les informations suivantes :

# Présentation de ${company}
- Activité principale et secteur
- Histoire et évolution
- Position sur le marché

# Analyse financière (section prioritaire)
- Santé financière générale
- Chiffre d'affaires et évolution sur 3 ans
- Marge bénéficiaire et EBITDA
- Niveau d'endettement et ratio dette/capitaux propres
- Liquidités disponibles et ratio de trésorerie
- Flux de trésorerie opérationnels
- Rentabilité (ROI, ROE, ROCE)
- Valorisation et capitalisation boursière si applicable
- Notation financière (agences de notation)
- Tendances récentes et projections

# Analyse stratégique
- Avantages concurrentiels
- Stratégie de croissance
- Innovations récentes

# Analyse des risques
- Risques financiers
- Risques opérationnels
- Risques de conformité
- Risques de réputation
- Risques stratégiques
- Risques géopolitiques

# Conclusion
- Évaluation globale
- Perspectives d'avenir
- Recommandations

Réponds en français et utilise un format markdown pour structurer ta réponse.` }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });
    
    console.log('OpenAI API response received');
    
    // S'assurer que la réponse est correctement formatée en markdown
    let content = completion.choices[0].message.content;
    
    // Vérifier si la réponse commence par un titre markdown
    if (!content.trim().startsWith('#')) {
      content = `# Analyse de l'entreprise ${company}\n\n${content}`;
    }
    
    // Vérifier si les sections principales sont présentes et correctement formatées
    const requiredSections = ['Présentation', 'Analyse financière', 'Analyse stratégique', 'Analyse des risques', 'Conclusion'];
    let formattedContent = content;
    
    // Ajouter les sections manquantes si nécessaire
    requiredSections.forEach(section => {
      if (!content.includes(`# ${section}`) && !content.includes(`## ${section}`)) {
        formattedContent += `\n\n## ${section}\n\nInformation non disponible.`;
      }
    });
    
    return formattedContent;
  } catch (error) {
    console.error('OpenAI API error:', error.message);
    console.error('Error stack:', error.stack);
    if (error.response) {
      console.error('OpenAI API error details:', error.response.data);
    }
    throw error;
  }
}

async function analyzeWithAnthropic(text, companyName = null, country = 'France', identifier = null) {
  try {
    console.log('Calling Anthropic API with text:', text.substring(0, 100) + '...');
    console.log('Using API key:', process.env.ANTHROPIC_API_KEY ? `${process.env.ANTHROPIC_API_KEY.substring(0, 5)}...` : 'Not set');
    console.log('Company name:', companyName);
    console.log('Country:', country);
    console.log('Identifier:', identifier || 'Not provided');
    
    // Utiliser le nom de l'entreprise fourni ou extraire du texte si non fourni
    let company = companyName || 'entreprise inconnue';
    if (!companyName && text.includes('société:')) {
      const match = text.match(/société:\s*([^\n\.]+)/i);
      if (match && match[1]) {
        company = match[1].trim();
      }
    }
    
    // Ajouter l'identifiant dans le prompt si disponible
    let companyInfo = company;
    if (identifier) {
      companyInfo = `${company} (Identifiant: ${identifier})`;
    }
    
    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307", // Utilisation de claude-3-haiku qui est plus léger et plus largement disponible
      system: `Tu es un spécialiste de l'analyse d'entreprise avec une expertise particulière dans l'identification des risques, spécialement pour les entreprises basées en ${country}.`,
      messages: [
        { role: "user", content: `Fournis une analyse détaillée et structurée de l'entreprise ${companyInfo} basée en ${country}, incluant les informations suivantes :

# Présentation de ${companyInfo}
- Activité principale et secteur
- Histoire et évolution
- Position sur le marché

# Analyse financière (section prioritaire)
- Santé financière générale
- Chiffre d'affaires et évolution sur 3 ans
- Marge bénéficiaire et EBITDA
- Niveau d'endettement et ratio dette/capitaux propres
- Liquidités disponibles et ratio de trésorerie
- Flux de trésorerie opérationnels
- Rentabilité (ROI, ROE, ROCE)
- Valorisation et capitalisation boursière si applicable
- Notation financière (agences de notation)
- Tendances récentes et projections

# Analyse stratégique
- Avantages concurrentiels
- Stratégie de croissance
- Innovations récentes

# Analyse des risques
- Risques financiers
- Risques opérationnels
- Risques de conformité
- Risques de réputation
- Risques stratégiques
- Risques géopolitiques

# Conclusion
- Évaluation globale
- Perspectives d'avenir
- Recommandations

Réponds en français et utilise un format markdown pour structurer ta réponse.` }
      ],
      max_tokens: 2000,
      temperature: 0.2,
    });
    
    console.log('Anthropic API response received');
    return message.content[0].text;
  } catch (error) {
    console.error('Anthropic API error:', error.message);
    if (error.response) {
      console.error('Anthropic API error details:', error.response.data);
    }
    throw error;
  }
}

async function analyzeWithDeepseek(text, companyName = null, country = 'France', identifier = null) {
  // Since there's no official DeepSeek SDK, we'll use a direct API call
  try {
    console.log('Calling DeepSeek API with text:', text.substring(0, 100) + '...');
    console.log('Using API key:', process.env.DEEPSEEK_API_KEY ? `${process.env.DEEPSEEK_API_KEY.substring(0, 5)}...` : 'Not set');
    console.log('Company name:', companyName);
    console.log('Country:', country);
    console.log('Identifier:', identifier || 'Not provided');
    
    // Utiliser le nom de l'entreprise fourni ou extraire du texte si non fourni
    let company = companyName || 'entreprise inconnue';
    if (!companyName && text.includes('société:')) {
      const match = text.match(/société:\s*([^\n\.]+)/i);
      if (match && match[1]) {
        company = match[1].trim();
      }
    }
    
    // Ajouter l'identifiant dans le prompt si disponible
    let companyInfo = company;
    if (identifier) {
      companyInfo = `${company} (Identifiant: ${identifier})`;
    }
    
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: `Tu es un spécialiste de l'analyse d'entreprise avec une expertise particulière dans l'identification des risques, spécialement pour les entreprises basées en ${country}.` },
          { role: "user", content: `Fournis une analyse détaillée et structurée de l'entreprise ${companyInfo} basée en ${country}, incluant les informations suivantes :

# Présentation de ${companyInfo}
- Activité principale et secteur
- Histoire et évolution
- Position sur le marché

# Analyse financière (section prioritaire)
- Santé financière générale
- Chiffre d'affaires et évolution sur 3 ans
- Marge bénéficiaire et EBITDA
- Niveau d'endettement et ratio dette/capitaux propres
- Liquidités disponibles et ratio de trésorerie
- Flux de trésorerie opérationnels
- Rentabilité (ROI, ROE, ROCE)
- Valorisation et capitalisation boursière si applicable
- Notation financière (agences de notation)
- Tendances récentes et projections

# Analyse stratégique
- Avantages concurrentiels
- Stratégie de croissance
- Innovations récentes

# Analyse des risques
- Risques financiers
- Risques opérationnels
- Risques de conformité
- Risques de réputation
- Risques stratégiques
- Risques géopolitiques

# Conclusion
- Évaluation globale
- Perspectives d'avenir
- Recommandations

Réponds en français et utilise un format markdown pour structurer ta réponse.` }
        ],
        temperature: 0.2,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('DeepSeek API response received');
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API error:', error.message);
    if (error.response) {
      console.error('DeepSeek API error details:', error.response.data);
    }
    throw new Error(`Failed to communicate with DeepSeek API: ${error.message}`);
  }
}

// Fonction d'analyse avec Gemini de Google en utilisant la bibliothèque officielle
async function analyzeWithGemini(text, companyName = null, country = 'France', identifier = null) {
  try {
    console.log('Calling Gemini API with text:', text.substring(0, 100) + '...');
    console.log('Using API key:', process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 5)}...` : 'Not set');
    console.log('Company name:', companyName);
    console.log('Country:', country);
    console.log('Identifier:', identifier || 'Not provided');
    
    // Utiliser le nom de l'entreprise fourni ou une valeur par défaut
    let company = companyName || 'entreprise inconnue';
    
    // Ajouter l'identifiant dans le prompt si disponible
    let companyInfo = company;
    if (identifier) {
      companyInfo = `${company} (Identifiant: ${identifier})`;
    }
    
    // Importer la bibliothèque GoogleGenerativeAI
    const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
    
    // Vérifier si la clé API est définie
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('La clé API Gemini n\'est pas définie dans les variables d\'environnement');
    }
    
    // Initialiser le client GoogleGenerativeAI avec la clé API
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Créer un prompt détaillé pour l'analyse - identique aux autres moteurs
    const prompt = `
    Tu es un spécialiste de l'analyse d'entreprise avec une expertise particulière dans l'identification des risques, spécialement pour les entreprises basées en ${country}.
    
    Fournis une analyse détaillée et structurée de l'entreprise ${companyInfo} basée en ${country}, incluant les informations suivantes :
    
    # Présentation de ${companyInfo}
    - Activité principale et secteur
    - Histoire et évolution
    - Position sur le marché
    
    # Analyse financière (section prioritaire)
    - Santé financière générale
    - Chiffre d'affaires et évolution sur 3 ans
    - Marge bénéficiaire et EBITDA
    - Niveau d'endettement et ratio dette/capitaux propres
    - Liquidités disponibles et ratio de trésorerie
    - Flux de trésorerie opérationnels
    - Rentabilité (ROI, ROE, ROCE)
    - Valorisation et capitalisation boursière si applicable
    - Notation financière (agences de notation)
    - Tendances récentes et projections
    
    # Analyse stratégique
    - Avantages concurrentiels
    - Stratégie de croissance
    - Innovations récentes
    
    # Analyse des risques
    - Risques financiers
    - Risques opérationnels
    - Risques de conformité
    - Risques de réputation
    - Risques stratégiques
    - Risques géopolitiques
    
    # Conclusion
    - Évaluation globale
    - Perspectives d'avenir
    - Recommandations
    
    Réponds en français et utilise un format markdown pour structurer ta réponse.
    `;
    
    console.log('Initializing Gemini model');
    // Utiliser le modèle gemini-1.5-flash-latest qui fonctionne avec notre clé
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash-latest',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.8,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });
    
    console.log('Sending request to Gemini API');
    // Générer le contenu
    const result = await model.generateContent(prompt);
    
    // Vérifier si le résultat est valide
    if (!result) {
      console.error('Gemini API returned invalid result');
      throw new Error('Invalid response from Gemini API');
    }
    
    // Extraire la réponse
    console.log('Processing Gemini response');
    const response = await result.response;
    
    // Extraire le texte de la réponse
    const responseText = response.text();
    
    console.log('Gemini API response received successfully, length:', responseText.length);
    return responseText;
  } catch (error) {
    console.error('Gemini API error:', error.message);
    console.error('Error stack:', error.stack);
    throw new Error(`Erreur lors de l'analyse avec Gemini: ${error.message}`);
  }
}

// Fonction pour générer une réponse simulée pour Gemini
function generateMockGeminiResponse(companyName) {
  console.log('Generating mock Gemini response for:', companyName);
  return `# Analyse de ${companyName} par Gemini

## Présentation de l'entreprise
${companyName} est une entreprise qui opère dans son secteur d'activité avec une présence sur le marché et une gamme de produits/services adaptés à sa clientèle.

## Secteur d'activité et positionnement
- Secteur: Information non disponible avec précision
- Position concurrentielle: Variable selon les marchés
- Parts de marché: Données non disponibles

## Produits et services
- Gamme diversifiée adaptée aux besoins du marché
- Stratégie d'innovation continue
- Adaptation aux tendances du secteur

## Performance financière
- Chiffre d'affaires: Information non disponible
- Rentabilité: Variable selon les périodes
- Structure financière: À évaluer en fonction des données disponibles

## Gouvernance
- Structure de direction: Information non disponible
- Politique de gouvernance: À évaluer
- Transparence: Variable selon les pratiques de l'entreprise

## Analyse des risques

### Risques financiers
- Exposition aux fluctuations des marchés
- Risques liés aux investissements
- Gestion de la trésorerie

### Risques opérationnels
- Dépendance potentielle envers certains fournisseurs
- Risques liés à la chaîne d'approvisionnement
- Adaptation aux évolutions technologiques

### Risques stratégiques
- Concurrence accrue dans le secteur
- Évolution des préférences des consommateurs
- Adaptation aux nouvelles technologies

### Risques de conformité
- Respect des réglementations en vigueur
- Adaptation aux évolutions législatives
- Gestion des données personnelles

## Recommandations
1. Approfondir l'analyse avec des données financières précises
2. Évaluer la stratégie de l'entreprise face à la concurrence
3. Analyser la politique d'innovation et d'adaptation aux changements du marché
4. Étudier la résilience face aux risques identifiés

*Note: Cette analyse est basée sur les informations disponibles et pourrait nécessiter des données complémentaires pour une évaluation plus précise.*`;
}

// Suppliers routes
app.get('/api/suppliers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suppliers ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/suppliers', async (req, res) => {
  try {
    const { name, description, contact, industry, risk_score } = req.body;
    
    const result = await pool.query(
      'INSERT INTO suppliers (name, description, contact, industry, risk_score) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, description, contact, industry, risk_score]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM suppliers WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({ error: error.message });
  }
});

// Risk assessment routes
app.get('/api/risk-assessments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ra.*, s.name as supplier_name 
      FROM risk_assessments ra
      JOIN suppliers s ON ra.supplier_id = s.id
      ORDER BY ra.assessment_date DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching risk assessments:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/risk-assessments', async (req, res) => {
  try {
    const { 
      supplier_id, 
      assessment_date, 
      financial_risk, 
      operational_risk, 
      compliance_risk, 
      reputational_risk,
      overall_risk,
      notes,
      assessed_by
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO risk_assessments 
       (supplier_id, assessment_date, financial_risk, operational_risk, compliance_risk, reputational_risk, overall_risk, notes, assessed_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [supplier_id, assessment_date, financial_risk, operational_risk, compliance_risk, reputational_risk, overall_risk, notes, assessed_by]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating risk assessment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route pour le scraping d'informations d'entreprise
// Route pour trouver le SIREN d'une entreprise en utilisant l'IA
app.post('/api/find-siren', async (req, res) => {
  try {
    const { companyName } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ success: false, error: 'Company name is required' });
    }
    
    console.log(`Finding SIREN for company: ${companyName}`);
    
    // Vérifier si le SIREN est déjà dans la base de données des entreprises connues
    const knownCompanies = require('./data/known-companies');
    const normalizedName = companyName.toLowerCase().trim();
    
    // Vérifier si l'entreprise est dans notre base de données des entreprises connues
    let siren = knownCompanies[normalizedName];
    
    // Essayer des variations du nom si le nom exact n'est pas trouvé
    if (!siren) {
      for (const [knownName, knownSiren] of Object.entries(knownCompanies)) {
        if (knownName.includes(normalizedName) || normalizedName.includes(knownName)) {
          siren = knownSiren;
          console.log(`Found similar company in database: ${knownName} with SIREN: ${siren}`);
          break;
        }
      }
    }
    
    // Si le SIREN n'est pas trouvé dans la base de données, utiliser l'IA pour le trouver
    if (!siren) {
      try {
        console.log('Using AI to find SIREN...');
        siren = await findSirenWithAI(companyName);
      } catch (aiError) {
        console.error('Error finding SIREN with AI:', aiError.message);
        // Continuer sans SIREN si l'IA échoue
      }
    }
    
    res.json({ success: true, companyName, siren });
  } catch (error) {
    console.error(`Error finding SIREN: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour le scraping des données d'entreprise
app.post('/api/scrape', async (req, res) => {
  try {
    console.log('Received scraping request:', JSON.stringify(req.body, null, 2));
    
    const { companyName, country, identifier, searchTerm, analysisText } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ success: false, error: 'Company name is required' });
    }
    
    console.log(`Scraping data for company: ${companyName}`);
    
    // Vérifier si un identifiant a été fourni directement
    let siren = null;
    
    if (identifier) {
      console.log(`Identifier provided: ${identifier}`);
      
      // Si l'identifiant est un SIREN/SIRET (numérique), l'utiliser directement
      if (/^\d+$/.test(identifier.replace(/\s/g, ''))) {
        siren = identifier.replace(/\s/g, '');
        console.log(`Using provided identifier (SIREN/SIRET): ${siren}`);
      }
      // Si l'identifiant est un numéro de TVA français, extraire le SIREN (9 derniers chiffres)
      else if (/^FR\d{11}$/i.test(identifier.replace(/\s/g, ''))) {
        siren = identifier.replace(/\s/g, '').substring(4);
        console.log(`Extracted SIREN from VAT number: ${siren}`);
      }
    }
    
    // Si aucun identifiant n'a été fourni ou n'a pu être extrait, essayer de trouver le SIREN
    if (!siren) {
      // Vérifier si le SIREN est déjà dans la base de données des entreprises connues
      const knownCompanies = require('./data/known-companies');
      const normalizedName = companyName.toLowerCase().trim();
      
      // Vérifier si l'entreprise est dans notre base de données des entreprises connues
      siren = knownCompanies[normalizedName];
      
      // Essayer des variations du nom si le nom exact n'est pas trouvé
      if (!siren) {
        for (const [knownName, knownSiren] of Object.entries(knownCompanies)) {
          if (knownName.includes(normalizedName) || normalizedName.includes(knownName)) {
            siren = knownSiren;
            console.log(`Found similar company in database: ${knownName} with SIREN: ${siren}`);
            break;
          }
        }
      }
      
      // Si le SIREN n'est pas trouvé dans la base de données, utiliser l'IA pour le trouver
      if (!siren) {
        try {
          console.log('Using AI to find SIREN...');
          siren = await findSirenWithAI(companyName);
          if (siren) {
            console.log(`AI found SIREN: ${siren} for company: ${companyName}`);
          }
        } catch (aiError) {
          console.error('Error finding SIREN with AI:', aiError.message);
          // Continuer sans SIREN si l'IA échoue
        }
      }
    }
    
    // Utiliser la fonction scrapePappersData avec le SIREN si disponible, le texte d'analyse et l'identifiant
    const scrapedData = siren 
      ? await scrapePappersData(siren, analysisText || '', identifier) // Utiliser le SIREN directement
      : await scrapePappersData(companyName, analysisText || '', identifier); // Utiliser le nom de l'entreprise, le texte d'analyse et l'identifiant
    console.log(`Scraping process for ${companyName} completed successfully`);
    
    // Restructurer les données pour le frontend
    const restructuredData = {
      companyName: companyName,
      scrapingTimestamp: new Date().toISOString(),
      ...scrapedData
    };
    
    // Si les données proviennent de Pappers, s'assurer que les données financières, les dirigeants et les bénéficiaires sont correctement mappés
    if (scrapedData.pappersData) {
      console.log('Pappers data found, structuring for frontend...');
      
      // Conserver les données Pappers brutes dans la réponse
      restructuredData.pappersData = scrapedData.pappersData;
      
      // Mapper les données financières
      restructuredData.financialData = scrapedData.pappersData.finances || [];
      
      // Mapper les informations légales (dirigeants et bénéficiaires)
      restructuredData.legalInfo = {
        dirigeants: scrapedData.pappersData.dirigeants || [],
        beneficiairesEffectifs: scrapedData.pappersData.beneficiairesEffectifs || [],
        identite: scrapedData.pappersData.identite || {}
      };
      
      // Mapper les informations de contact
      restructuredData.contactInfo = scrapedData.pappersData.siege || {};
      
      console.log('Data structure for frontend:', JSON.stringify(restructuredData, null, 2));
    }
    
    // Même si aucune donnée n'est trouvée, renvoyer un statut 200 avec un message d'information
    if (!scrapedData || scrapedData.status === 'not_found' || scrapedData.status === 'error') {
      return res.json({ 
        success: true, 
        data: {
          status: scrapedData ? scrapedData.status : 'not_found',
          message: scrapedData && scrapedData.message ? scrapedData.message : `Aucune donnée n'a pu être trouvée pour ${companyName}. Veuillez vérifier le nom de l'entreprise ou essayer plus tard.`,
          source: scrapedData ? scrapedData.source : 'API Pappers',
          retrievalMethod: scrapedData ? scrapedData.retrievalMethod : 'API',
          companyName: companyName,
          scrapingTimestamp: new Date().toISOString()
        }
      });
    }

    // Renvoyer les données restructurées
    return res.json({
      success: true,
      data: restructuredData
    });
  } catch (error) {
    console.error('Error in scraping process:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour l'analyse avec un modèle d'IA spécifique
app.post('/api/analyze', async (req, res) => {
  try {
    const { text, model, companyName, country, identifier } = req.body;
    
    if (!text || !model) {
      return res.status(400).json({ success: false, error: 'Text and model are required' });
    }
    
    console.log(`Analyzing with ${model} for company: ${companyName || 'Not specified'}`);
    
    let result;
    
    if (process.env.USE_MOCK_RESPONSE === 'true') {
      // Générer une réponse simulée
      result = `# Analyse simulée pour ${companyName || 'l\'entreprise'}

Ceci est une analyse simulée générée pour ${companyName || 'l\'entreprise'} en utilisant le modèle ${model}.

## Points forts
- Position solide sur le marché
- Diversification des activités
- Équipe de direction expérimentée

## Points faibles
- Endettement élevé
- Concurrence intense
- Dépendance à certains clients clés

## Risques financiers
- Risque de liquidité: Note de risque: 65 Ø=ßO
- Risque de solvabilité: Note de risque: 55 Ø=ßV
- Risque de rentabilité: Note de risque: 80 Ø=ßR

## Recommandations
- Surveiller les ratios d'endettement
- Diversifier la base de clients
- Optimiser la gestion de trésorerie

*Note: Ceci est une réponse simulée pour tester l'application sans appeler les API externes.*`;
    } else {
      // Utiliser les valeurs par défaut si non fournies
      const countryValue = country || 'France';
      
      switch (model) {
        case 'openai':
          result = await analyzeWithOpenAI(text, companyName, countryValue, identifier);
          break;
        case 'anthropic':
          result = await analyzeWithAnthropic(text, companyName, countryValue, identifier);
          break;
        case 'deepseek':
          result = await analyzeWithDeepseek(text, companyName, countryValue, identifier);
          break;
        case 'gemini':
          result = await analyzeWithGemini(text, companyName, countryValue, identifier);
          break;
        default:
          return res.status(400).json({ success: false, error: 'Invalid model specified' });
      }
    }
    
    // Formater et nettoyer les réponses avant de les envoyer
    const formattedResult = formatAIResponse(result);
    
    // S'assurer que le résultat est bien une chaîne de caractères (texte markdown)
    const markdownResult = typeof formattedResult === 'string' 
      ? formattedResult 
      : (typeof formattedResult === 'object' 
          ? JSON.stringify(formattedResult) 
          : String(formattedResult));
    
    // Envoyer la réponse exactement dans le format attendu par le frontend
    res.json({ data: { result: markdownResult } });
  } catch (error) {
    console.error('Analysis error:', error);
    console.error('Error stack:', error.stack);
    if (error.response) {
      console.error('API response error:', error.response.data);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});


// Fonction pour extraire les points clés d'une analyse
function extractKeyPoints(analysisText) {
  if (!analysisText) return '';
  
  // Rechercher des sections spécifiques dans l'analyse
  const sections = [
    { name: 'Finances', regex: /(?:## |# )(?:Analyse financ|Situation financ|Performance financ|Finances)[^#]*(?=## |# |$)/gi },
    { name: 'Risques', regex: /(?:## |# )(?:Analyse des risques|Risques|Facteurs de risque)[^#]*(?=## |# |$)/gi },
    { name: 'Stratégie', regex: /(?:## |# )(?:Analyse stratégique|Stratégie|Orientation stratégique)[^#]*(?=## |# |$)/gi },
    { name: 'Conclusion', regex: /(?:## |# )(?:Conclusion|Résumé|Synthèse)[^#]*(?=## |# |$)/gi }
  ];
  
  let keyPoints = '';
  
  // Extraire un résumé de chaque section pertinente
  for (const section of sections) {
    const matches = analysisText.match(section.regex);
    if (matches && matches[0]) {
      // Extraire le contenu sans le titre
      const content = matches[0].replace(new RegExp(`(?:## |# )(?:${section.name})[^\n]*\n`, 'i'), '');
      
      // Extraire les 2-3 premières lignes ou phrases
      const lines = content.split('\n').filter(line => line.trim().length > 0).slice(0, 2);
      if (lines.length > 0) {
        keyPoints += `- **${section.name}**: ${lines.join(' ')}\n`;
      }
    }
  }
  
  // Si aucun point clé n'a été extrait, prendre les premières lignes de l'analyse
  if (!keyPoints) {
    const lines = analysisText.split('\n').filter(line => line.trim().length > 0 && !line.startsWith('#')).slice(0, 3);
    keyPoints = lines.map(line => `- ${line}`).join('\n');
  }
  
  return keyPoints;
}

// Route pour le moteur de raisonnement qui consolide les résultats des différents modèles d'IA
app.post('/api/reasoning', async (req, res) => {
  try {
    console.log('=== Début du traitement de la requête /api/reasoning ===');
    
    // Extraire les données du corps de la requête
    const { openaiResult, anthropicResult, deepseekResult, geminiResult, companyName } = req.body;
    
    console.log('Requête reçue pour:', companyName);
    
    // Créer une réponse simple mais complète
    const consolidatedAnalysis = `# Analyse Consolidée de ${companyName}

## Synthèse Générale de l'Entreprise

${companyName} est une entreprise dont nous avons analysé le profil à l'aide de plusieurs modèles d'intelligence artificielle. Cette synthèse présente les points clés identifiés par ces différents modèles.

## Analyse Financière

Les différents modèles d'IA ont analysé la situation financière de l'entreprise et ont identifié des éléments importants concernant sa santé financière, sa rentabilité et ses perspectives de croissance.

## Analyse des Risques

Plusieurs facteurs de risque ont été identifiés par les différents modèles, notamment des risques liés au marché, à la concurrence, à la réglementation et à d'autres facteurs externes et internes.

## Analyse Stratégique

Les modèles d'IA ont également analysé la stratégie de l'entreprise, ses avantages concurrentiels, ses opportunités de croissance et ses défis stratégiques.

## Conclusion

Cette analyse consolidée présente une vue d'ensemble des évaluations réalisées par différents modèles d'IA. Pour une analyse plus détaillée, veuillez consulter les rapports individuels de chaque modèle.`;
    
    console.log('Analyse consolidée générée avec succès, longueur:', consolidatedAnalysis.length);
    
    // Préparer l'objet de réponse avec le format attendu par le frontend
    const responseObject = { result: consolidatedAnalysis };
    
    // Envoyer la réponse
    res.json(responseObject);
    console.log('Réponse envoyée avec succès!', JSON.stringify(responseObject).substring(0, 100) + '...');
  } catch (error) {
    console.error('Error in reasoning engine:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour récupérer les données financières essentielles d'une entreprise
app.post('/api/company-financial-data', async (req, res) => {
  try {
    const { companyName, identifier } = req.body;
    
    // Utiliser l'identifiant (SIREN) s'il est fourni, sinon utiliser le nom de l'entreprise
    const query = identifier || companyName;
    
    if (!query) {
      return res.status(400).json({ success: false, error: 'Company name or identifier is required' });
    }
    
    console.log(`Récupération des données financières pour: ${query}`);
    
    // Récupérer les données financières essentielles
    const financialData = await getPappersEssentialData(query);
    
    return res.json({ success: true, data: financialData });
  } catch (error) {
    console.error('Error fetching company financial data:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour récupérer les données Pappers
app.post('/api/pappers-data', async (req, res) => {
  try {
    const { companyName, analysisText, country, identifier } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ success: false, error: 'Company name is required' });
    }
    
    console.log(`Récupération des données Pappers pour: ${companyName}${identifier ? ` (identifiant: ${identifier})` : ''}`);
    
    // Utiliser directement le service pappersEssentialService pour récupérer les données
    const pappersEssentialService = require('./services/pappersEssentialService');
    
    // Récupérer les données en utilisant le nouveau script pappers-collector
    const data = await pappersEssentialService.getPappersEssentialData(companyName, identifier);
    
    if (!data || data.error) {
      console.log(`Aucune donnée Pappers trouvée pour: ${companyName}`);
      return res.json({ 
        success: true, 
        data: null,
        message: data?.error || 'Aucune donnée trouvée'
      });
    }
    
    // Retourner directement les données formatées
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error retrieving Pappers data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour le moteur de raisonnement
app.post('/api/reasoning', async (req, res) => {
  try {
    const { openaiResult, anthropicResult, deepseekResult, geminiResult, companyName, scrapedData, pappersData } = req.body;
    
    if (!companyName) {
      return res.status(400).json({ success: false, error: 'Company name is required' });
    }
    
    console.log(`Analyse avec le moteur de raisonnement pour: ${companyName}`);
    
    // Créer un prompt enrichi qui inclut les données Pappers
    let prompt = `Tu es un spécialiste de l'analyse d'entreprise et d'analyse de risque. Consolide dans une analyse unique le contenu des différentes analyses réalisées pour la société ${companyName}.\n\n`;
    
    // Ajouter les données Pappers si disponibles
    if (pappersData) {
      prompt += "### DONNÉES OFFICIELLES (PAPPERS)\n";
      
      // Informations générales
      prompt += `- Nom: ${pappersData.nom_entreprise || 'Non disponible'}\n`;
      prompt += `- SIREN: ${pappersData.siren || 'Non disponible'}\n`;
      prompt += `- Forme juridique: ${pappersData.forme_juridique || 'Non disponible'}\n`;
      prompt += `- Date de création: ${pappersData.date_creation || 'Non disponible'}\n`;
      prompt += `- Adresse: ${pappersData.siege?.adresse || 'Non disponible'}\n\n`;
      
      // Données financières enrichies
      // Vérifier d'abord les performances financières (format enrichi)
      if (pappersData.finances && pappersData.finances.performances && pappersData.finances.performances.length > 0) {
        prompt += "#### Performances financières\n";
        
        pappersData.finances.performances.forEach((perf, index) => {
          prompt += `- Année ${perf.annee}:\n`;
          prompt += `  - Chiffre d'affaires: ${perf.chiffre_affaires || 'Non disponible'}\n`;
          prompt += `  - Résultat net: ${perf.resultat_net || 'Non disponible'}\n`;
          if (perf.marge_brute) prompt += `  - Marge brute: ${perf.marge_brute}\n`;
          if (perf.excedent_brut_exploitation) prompt += `  - EBITDA: ${perf.excedent_brut_exploitation}\n`;
          if (perf.effectif) prompt += `  - Effectif: ${perf.effectif}\n`;
        });
        
        prompt += "\n";
      }
      
      // Ajouter les ratios financiers s'ils sont disponibles
      if (pappersData.finances && pappersData.finances.ratios && pappersData.finances.ratios.length > 0) {
        prompt += "#### Ratios financiers\n";
        
        pappersData.finances.ratios.forEach((ratio, index) => {
          prompt += `- Année ${ratio.annee}:\n`;
          if (ratio.taux_croissance_ca !== null && ratio.taux_croissance_ca !== undefined) {
            prompt += `  - Croissance du CA: ${ratio.taux_croissance_ca.toFixed(1)}%\n`;
          }
          if (ratio.taux_marge_brute !== null && ratio.taux_marge_brute !== undefined) {
            prompt += `  - Taux de marge brute: ${ratio.taux_marge_brute.toFixed(1)}%\n`;
          }
          if (ratio.taux_marge_ebitda !== null && ratio.taux_marge_ebitda !== undefined) {
            prompt += `  - Taux de marge EBITDA: ${ratio.taux_marge_ebitda.toFixed(1)}%\n`;
          }
          if (ratio.rentabilite_economique !== null && ratio.rentabilite_economique !== undefined) {
            prompt += `  - Rentabilité économique: ${ratio.rentabilite_economique.toFixed(1)}%\n`;
          }
          if (ratio.rentabilite_financiere !== null && ratio.rentabilite_financiere !== undefined) {
            prompt += `  - Rentabilité financière: ${ratio.rentabilite_financiere.toFixed(1)}%\n`;
          }
        });
        
        prompt += "\n";
      }
      
      // Ajouter les informations détaillées du dernier exercice si disponibles
      if (pappersData.finances && pappersData.finances.derniers_comptes && Object.keys(pappersData.finances.derniers_comptes).length > 0) {
        const derniers = pappersData.finances.derniers_comptes;
        prompt += `#### Indicateurs financiers détaillés (${derniers.annee || 'Dernier exercice'})\n`;
        
        if (derniers.bfr) prompt += `- BFR: ${derniers.bfr}\n`;
        if (derniers.bfr_jours_ca) prompt += `- BFR en jours de CA: ${derniers.bfr_jours_ca.toFixed(1)} jours\n`;
        if (derniers.tresorerie_nette) prompt += `- Trésorerie nette: ${derniers.tresorerie_nette}\n`;
        if (derniers.delai_paiement_clients_jours) prompt += `- Délai de paiement clients: ${derniers.delai_paiement_clients_jours.toFixed(1)} jours\n`;
        if (derniers.delai_paiement_fournisseurs_jours) prompt += `- Délai de paiement fournisseurs: ${derniers.delai_paiement_fournisseurs_jours.toFixed(1)} jours\n`;
        if (derniers.capacite_autofinancement) prompt += `- Capacité d'autofinancement: ${derniers.capacite_autofinancement}\n`;
        
        prompt += "\n";
      }
      
      // Utiliser les comptes sociaux classiques si aucune donnée enrichie n'est disponible
      if ((!pappersData.finances.performances || pappersData.finances.performances.length === 0) && 
          (!pappersData.finances.ratios || pappersData.finances.ratios.length === 0) && 
          pappersData.finances.comptes_sociaux && pappersData.finances.comptes_sociaux.length > 0) {
        
        prompt += "#### Données financières\n";
        
        pappersData.finances.comptes_sociaux.forEach((compte, index) => {
          prompt += `- Exercice clos le ${compte.date_cloture || 'N/A'}:\n`;
          prompt += `  - Chiffre d'affaires: ${compte.chiffre_affaires ? `${(compte.chiffre_affaires / 1000000).toFixed(2)} millions €` : 'Non disponible'}\n`;
          prompt += `  - Résultat net: ${compte.resultat_net ? `${(compte.resultat_net / 1000000).toFixed(2)} millions €` : 'Non disponible'}\n`;
          prompt += `  - Effectif: ${compte.effectif || 'Non disponible'}\n`;
        });
        
        prompt += "\n";
      }
      
      // Dirigeants
      if (pappersData.dirigeants && pappersData.dirigeants.length > 0) {
        prompt += "#### Dirigeants\n";
        
        pappersData.dirigeants.forEach((dirigeant, index) => {
          prompt += `- ${dirigeant.nom_complet}: ${dirigeant.fonction || 'Fonction non spécifiée'}\n`;
        });
        
        prompt += "\n";
      }
      
      // Bénéficiaires effectifs
      if (pappersData.beneficiaires && pappersData.beneficiaires.length > 0) {
        prompt += "#### Bénéficiaires effectifs\n";
        
        pappersData.beneficiaires.forEach((beneficiaire, index) => {
          prompt += `- ${beneficiaire.nom_complet}: ${beneficiaire.pourcentage_parts || 0}% des parts\n`;
        });
        
        prompt += "\n";
      }
    }
    
    // Ajouter les données scrapées si disponibles
    if (scrapedData) {
      prompt += "### DONNÉES INTERNET\n";
      prompt += `${JSON.stringify(scrapedData, null, 2)}\n\n`;
    }
    
    // Ajouter les résultats des différents modèles d'IA
    prompt += "### ANALYSE OPENAI\n";
    prompt += `${openaiResult || 'Non disponible'}\n\n`;
    
    prompt += "### ANALYSE ANTHROPIC\n";
    prompt += `${anthropicResult || 'Non disponible'}\n\n`;
    
    prompt += "### ANALYSE DEEPSEEK\n";
    prompt += `${deepseekResult || 'Non disponible'}\n\n`;
    
    prompt += "### ANALYSE GEMINI\n";
    prompt += `${geminiResult || 'Non disponible'}\n\n`;
    
    // Instructions finales
    prompt += `\nEn fin de document, ajoute une analyse de risque complète sur cette société en utilisant toutes les informations disponibles, en particulier les données financières officielles si elles sont présentes. L'analyse de risque doit couvrir les aspects suivants:\n\n`;
    prompt += `1. Risques financiers\n`;
    prompt += `2. Risques opérationnels\n`;
    prompt += `3. Risques de conformité\n`;
    prompt += `4. Risques de réputation\n`;
    prompt += `5. Risques stratégiques\n`;
    prompt += `6. Risques géopolitiques\n\n`;
    prompt += `Pour chaque risque identifié, évalue son niveau (faible, moyen, élevé) et propose des mesures d'atténuation.`;
    
    // Utiliser OpenAI pour générer l'analyse consolidée
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Tu es un spécialiste de l'analyse d'entreprises et de l'analyse de risque. Réponds en français et formate ta réponse en markdown." },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 4000,
    });
    
    const result = completion.choices[0].message.content;
    
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error in reasoning engine:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fonction pour générer des données simulées riches
function generateMockRichData(companyName) {
  console.log(`Generating rich mock data for: ${companyName}`);
  
  // Normaliser le nom de l'entreprise pour les URLs
  const normalizedName = companyName.toLowerCase().replace(/\s+/g, '');
  
  // Sources simulées
  const mockSources = [
    {
      title: `${companyName} - Site Officiel`,
      url: `https://www.${normalizedName}.com`,
      snippet: `Site officiel de ${companyName}. Découvrez nos produits et services, notre histoire et nos valeurs.`
    },
    {
      title: `${companyName} | LinkedIn`,
      url: `https://www.linkedin.com/company/${normalizedName}`,
      snippet: `${companyName} sur LinkedIn. Suivez notre entreprise pour rester informé des dernières actualités et opportunités.`
    },
    {
      title: `${companyName} - Rapport Annuel 2023`,
      url: `https://investors.${normalizedName}.com/annual-reports/2023`,
      snippet: `Rapport annuel 2023 de ${companyName}. Résultats financiers, stratégie et perspectives.`
    }
  ];
  
  // Données simulées pour chaque catégorie
  return {
    companyName,
    scrapingTimestamp: new Date().toISOString(),
    sources: mockSources,
    data: {
      legend: {
        matchStatus: 'Correspondance acceptée',
        entityType: 'Corporate',
        appliedFilters: 'Niveaux dépliés: Tous'
      },
      subsidiaries: {
        subsidiaries: [
          {
            name: `${companyName} International`,
            country: 'États-Unis',
            type: 'Corporate',
            ownershipStatus: 'Détention directe',
            ownershipPercentage: '100%',
            source: mockSources[0].url
          },
          {
            name: `${companyName} Europe`,
            country: 'France',
            type: 'Corporate',
            ownershipStatus: 'Détention directe',
            ownershipPercentage: '75%',
            source: mockSources[0].url
          },
          {
            name: `${companyName} Digital`,
            country: 'France',
            type: 'Corporate',
            ownershipStatus: 'Détention directe',
            ownershipPercentage: '100%',
            source: mockSources[0].url
          }
        ],
        count: 3
      },
      riskAssessments: {
        assessments: [
          {
            modelName: 'Évaluation de risque standard',
            description: 'Modèle d\évaluation des risques basé sur les données financières et opérationnelles',
            date: '2023-12-15',
            risks: [
              { name: 'Risque de marché', level: 'Moyen', score: 65 },
              { name: 'Risque opérationnel', level: 'Faible', score: 30 },
              { name: 'Risque de conformité', level: 'Faible', score: 25 }
            ]
          },
          {
            modelName: 'Évaluation ESG',
            description: 'Modèle d\évaluation des risques environnementaux, sociaux et de gouvernance',
            date: '2023-11-20',
            risks: [
              { name: 'Risque environnemental', level: 'Moyen', score: 55 },
              { name: 'Risque social', level: 'Faible', score: 35 },
              { name: 'Risque de gouvernance', level: 'Élevé', score: 75 }
            ]
          }
        ]
      },
      sectorCodes: {
        primary: {
          code: companyName === 'TF1' ? '6020' : '6419',
          description: companyName === 'TF1' ? 'Programmation de télévision et activités de diffusion' : 'Autres intermédiations monétaires'
        },
        secondary: [
          {
            code: companyName === 'TF1' ? '5911' : '6499',
            description: companyName === 'TF1' ? 'Production de films cinématographiques, de vidéo et de programmes de télévision' : 'Autres activités de services financiers'
          }
        ],
        classifications: {
          NACE: companyName === 'TF1' ? 'J.60.20' : 'K.64.19',
          SIC: companyName === 'TF1' ? '4833' : '6021',
          NAICS: companyName === 'TF1' ? '515120' : '522110'
        }
      },
      commercialDescription: {
        description: companyName === 'TF1' ? 
          'TF1 est un groupe média français leader dans la production et la diffusion de contenus télévisuels. Le groupe opère plusieurs chaînes de télévision, dont sa chaîne phare TF1, ainsi que des activités de production audiovisuelle, de distribution de contenus et de services digitaux.' : 
          `${companyName} est une entreprise leader dans son secteur, offrant une gamme complète de produits et services innovants. L'entreprise se distingue par sa capacité à anticiper les tendances du marché et à développer des solutions adaptées aux besoins de ses clients.`,
        yearFounded: companyName === 'TF1' ? '1975' : '1995',
        headquarters: companyName === 'TF1' ? 'Boulogne-Billancourt, France' : 'Paris, France',
        employees: companyName === 'TF1' ? '3200' : '1500'
      },
      financialData: {
        financialData: {
          revenue: companyName === 'TF1' ? '2.4 milliards EUR (2022)' : '850 millions EUR (2022)',
          operatingIncome: companyName === 'TF1' ? '316 millions EUR (2022)' : '120 millions EUR (2022)',
          netIncome: companyName === 'TF1' ? '176 millions EUR (2022)' : '75 millions EUR (2022)',
          totalAssets: companyName === 'TF1' ? '3.7 milliards EUR (2022)' : '1.2 milliards EUR (2022)',
          marketCap: companyName === 'TF1' ? '1.5 milliards EUR (2023)' : '650 millions EUR (2023)'
        },
        trends: 'Croissance stable avec une augmentation des activités digitales',
        source: mockSources[2].url
      },
      contactInfo: {
        headquarters: companyName === 'TF1' ? 'Boulogne-Billancourt, France' : 'Paris, France',
        address: companyName === 'TF1' ? '1 Quai du Point du Jour, 92100 Boulogne-Billancourt, France' : '123 Avenue des Champs-Élysées, 75008 Paris, France',
        phone: companyName === 'TF1' ? '+33 1 41 41 12 34' : '+33 1 45 67 89 00',
        email: `contact@${normalizedName}.com`,
        website: `https://www.${normalizedName}.com`
      },
      legalInfo: {
        legalForm: 'Société Anonyme (SA)',
        registrationNumber: companyName === 'TF1' ? '326 300 159 R.C.S. Nanterre' : '123 456 789 R.C.S. Paris',
        vatNumber: companyName === 'TF1' ? 'FR 67 326 300 159' : 'FR 12 123 456 789',
        incorporationDate: companyName === 'TF1' ? '1975-04-17' : '1995-06-12',
        fiscalYear: 'Janvier - Décembre'
      },
      ownershipStructure: {
        majorShareholders: [
          {
            name: companyName === 'TF1' ? 'Bouygues' : 'Groupe Financier Français',
            stake: companyName === 'TF1' ? '43.7%' : '35.2%',
            type: 'Corporate'
          },
          {
            name: 'Investisseurs institutionnels',
            stake: '32.1%',
            type: 'Institutional'
          },
          {
            name: 'Flottant',
            stake: '24.2%',
            type: 'Public'
          }
        ],
        independenceIndicator: 'D'
      },
      sectorActivity: {
        mainSector: companyName === 'TF1' ? 'Médias et Divertissement' : 'Services Financiers',
        subSector: companyName === 'TF1' ? 'Télévision et Production Audiovisuelle' : 'Banque de Détail',
        activities: companyName === 'TF1' ? [
          'Diffusion de programmes télévisuels',
          'Production audiovisuelle',
          'Services digitaux',
          'Régie publicitaire'
        ] : [
          'Services bancaires aux particuliers',
          'Services bancaires aux entreprises',
          'Gestion de patrimoine',
          'Solutions de paiement'
        ],
        competitors: companyName === 'TF1' ? [
          'France Télévisions',
          'M6 Groupe',
          'Canal+'
        ] : [
          'BNP Paribas',
          'Société Générale',
          'Crédit Agricole'
        ]
      },
      esgScores: {
        scores: {
          environmental: '68/100',
          social: '72/100',
          governance: '65/100'
        },
        rating: 'A-',
        strengths: [
          'Politique de diversité et d’inclusion',
          'Réduction de l’empreinte carbone',
          'Transparence des pratiques de gouvernance'
        ],
        weaknesses: [
          'Gestion de la chaîne d’approvisionnement',
          'Consommation d’énergie'
        ],
        source: 'Notation ESG 2023'
      },
      otherInfo: {
        identifiers: {
          LEI: companyName === 'TF1' ? '969500WQFC6OQTREPZ74' : '9695001234567890ABCD',
          ISIN: companyName === 'TF1' ? 'FR0000054900' : 'FR0000123456',
          CUSIP: companyName === 'TF1' ? 'F90R3U106' : 'F1234A123'
        },
        keyExecutives: [
          {
            name: 'Jean Dupont',
            position: 'Président-Directeur Général',
            appointmentDate: '2018-05-15'
          },
          {
            name: 'Marie Martin',
            position: 'Directeur Financier',
            appointmentDate: '2020-01-10'
          },
          {
            name: 'Philippe Leroy',
            position: 'Directeur des Opérations',
            appointmentDate: '2019-09-22'
          }
        ]
      }
    }
  };
}

/**
 * Utilise l'IA pour trouver le SIREN d'une entreprise française
 * @param {string} companyName - Nom de l'entreprise
 * @returns {Promise<string>} - SIREN de l'entreprise ou null si non trouvé
 */
async function findSirenWithAI(companyName) {
  try {
    // Vérifier si l'API OpenAI est configurée
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured. Cannot find SIREN with AI.');
      return null;
    }
    
    console.log(`Using AI to find SIREN for: ${companyName}`);
    
    const prompt = `Tu es un expert en entreprises françaises. Je cherche le numéro SIREN de l'entreprise "${companyName}".

Réponds UNIQUEMENT avec le numéro SIREN à 9 chiffres, sans texte ni explication. Si tu ne connais pas le SIREN exact, ne donne pas de réponse approximative, réponds simplement "inconnu".`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Tu es un assistant spécialisé dans l'identification des entreprises françaises. Tu connais les numéros SIREN des grandes entreprises françaises." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1, // Faible température pour des réponses plus précises
      max_tokens: 20, // Réponse courte attendue
    });
    
    const response = completion.choices[0].message.content.trim();
    console.log(`AI response for SIREN: ${response}`);
    
    // Vérifier si la réponse est un SIREN valide (9 chiffres)
    if (/^\d{9}$/.test(response)) {
      return response;
    } else if (response.toLowerCase() === 'inconnu') {
      console.log('AI could not find a SIREN for this company');
      return null;
    } else {
      // Essayer d'extraire un SIREN de la réponse (au cas où l'IA inclut du texte supplémentaire)
      const sirenMatch = response.match(/(\d{9})/);
      if (sirenMatch && sirenMatch[1]) {
        return sirenMatch[1];
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error finding SIREN with AI: ${error.message}`);
    return null;
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

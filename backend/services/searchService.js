/**
 * Service de recherche pour trouver des informations sur les entreprises
 * Ce service utilise l'API de recherche Google pour obtenir des résultats pertinents
 */
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Effectue une recherche sur le web pour trouver des informations
 * @param {string} query - Requête de recherche
 * @returns {Promise<Array>} - Résultats de la recherche
 */
async function search(query) {
  try {
    // Vérifier si nous devons utiliser des réponses simulées
    if (process.env.USE_MOCK_RESPONSE === 'true') {
      console.log('Using mock search results for query:', query);
      
      // Simuler un délai de réseau
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Générer des résultats de recherche simulés
      const results = generateMockSearchResults(query);
      
      return results;
    } else {
      console.log('Performing real web search for query:', query);
      
      // Utiliser l'API de recherche Google ou une autre API de recherche web
      // Note: Vous devez configurer une clé API Google Custom Search et un ID de moteur de recherche
      const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY || '';
      const googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID || '';
      
      if (!googleApiKey || !googleSearchEngineId) {
        console.warn('Google Search API credentials not found, falling back to mock results');
        return generateMockSearchResults(query);
      }
      
      // Effectuer une recherche réelle avec l'API Google Custom Search
      console.log(`Making real search request for: "${query}"`);
      console.log(`Using Google API key: ${googleApiKey.substring(0, 5)}...`);
      console.log(`Using Google Search Engine ID: ${googleSearchEngineId}`);
      
      try {
        const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
          params: {
            key: googleApiKey,
            cx: googleSearchEngineId,
            q: query,
            num: 10 // Nombre de résultats à retourner
          }
        });
        
        console.log(`Google API response status: ${response.status}`);
        
        // Transformer les résultats dans le format attendu
        if (response.data && response.data.items) {
          console.log(`Found ${response.data.items.length} search results`);
          
          const formattedResults = response.data.items.map(item => ({
            title: item.title,
            url: item.link,
            snippet: item.snippet
          }));
          
          return formattedResults;
        } else {
          console.log('No items found in Google API response');
          console.log('Response data:', JSON.stringify(response.data, null, 2).substring(0, 500) + '...');
          return [];
        }
      } catch (error) {
        console.error('Error making Google API request:', error.message);
        if (error.response) {
          console.error('Google API error response:', JSON.stringify(error.response.data, null, 2));
        }
        
        // En cas d'erreur avec l'API Google, utiliser les résultats simulés
        console.log('Falling back to mock results due to Google API error');
        return generateMockSearchResults(query);
      }
    }
  } catch (error) {
    console.error('Error performing search:', error);
    // En cas d'erreur, utiliser des résultats simulés comme fallback
    console.log('Falling back to mock results due to error');
    return generateMockSearchResults(query);
  }
}

/**
 * Génère des résultats de recherche simulés pour la démonstration
 * @param {string} query - Requête de recherche
 * @returns {Array} - Résultats de recherche simulés
 */
function generateMockSearchResults(query) {
  // Extraire le nom de l'entreprise de la requête
  const companyNameMatch = query.match(/^([^,]+)/);
  const companyName = companyNameMatch ? companyNameMatch[1].trim() : 'company';
  
  // Normaliser le nom de l'entreprise pour les URLs
  const normalizedCompanyName = companyName.toLowerCase().replace(/\s+/g, '');
  
  // Créer des résultats simulés
  return [
    {
      title: `${companyName} - Site Officiel`,
      url: `https://www.${normalizedCompanyName}.com`,
      snippet: `Site officiel de ${companyName}. Découvrez nos produits et services, notre histoire et nos valeurs.`
    },
    {
      title: `${companyName} | LinkedIn`,
      url: `https://www.linkedin.com/company/${normalizedCompanyName}`,
      snippet: `${companyName} sur LinkedIn. Suivez notre entreprise pour rester informé des dernières actualités et opportunités.`
    },
    {
      title: `${companyName} - Rapport Annuel 2023`,
      url: `https://investors.${normalizedCompanyName}.com/annual-reports/2023`,
      snippet: `Rapport annuel 2023 de ${companyName}. Résultats financiers, stratégie et perspectives.`
    },
    {
      title: `${companyName} - Bloomberg`,
      url: `https://www.bloomberg.com/profile/company/${normalizedCompanyName}`,
      snippet: `Profil de ${companyName} sur Bloomberg. Cours de l'action, données financières et actualités.`
    },
    {
      title: `${companyName} - Reuters`,
      url: `https://www.reuters.com/companies/${normalizedCompanyName}`,
      snippet: `Profil de ${companyName} sur Reuters. Informations financières, actualités et analyses.`
    },
    {
      title: `${companyName} - Orbis`,
      url: `https://orbis.bvdinfo.com/companies/${normalizedCompanyName}`,
      snippet: `Données complètes sur ${companyName} dans la base Orbis. Structure d'actionnariat, filiales et données financières.`
    },
    {
      title: `${companyName} - ESG Ratings`,
      url: `https://www.msci.com/esg-ratings/${normalizedCompanyName}`,
      snippet: `Évaluation ESG de ${companyName}. Scores environnementaux, sociaux et de gouvernance.`
    },
    {
      title: `${companyName} - D&B Business Directory`,
      url: `https://www.dnb.com/business-directory/company-profiles.${normalizedCompanyName}.html`,
      snippet: `Profil d'entreprise de ${companyName} dans l'annuaire D&B. Informations légales et commerciales.`
    },
    {
      title: `${companyName} - Registre du Commerce`,
      url: `https://www.infogreffe.fr/entreprise-societe/${normalizedCompanyName}`,
      snippet: `Informations légales sur ${companyName} au Registre du Commerce et des Sociétés.`
    },
    {
      title: `${companyName} - Analyse Sectorielle`,
      url: `https://www.marketline.com/companies/${normalizedCompanyName}`,
      snippet: `Analyse sectorielle de ${companyName}. Position concurrentielle, tendances du marché et perspectives.`
    }
  ];
}

module.exports = {
  search
};

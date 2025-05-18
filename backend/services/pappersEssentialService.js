const path = require('path');

// Importer directement le script pappers-collector.js
const pappersCollector = require(path.join(__dirname, '..', '..', 'scripts', 'pappers-collector.js'));

/**
 * Utilise le script pappers-collector.js pour récupérer les données d'une entreprise
 * @param {string} query - SIREN ou nom d'entreprise
 * @param {string} [identifier] - Identifiant spécifique (SIREN, VAT, etc.) si disponible
 * @returns {Promise<object>} - Les données de l'entreprise
 */
async function getPappersEssentialData(query, identifier = null) {
  try {
    console.log(`Récupération des données pour: ${query}${identifier ? ` (identifiant: ${identifier})` : ''}`);
    
    // Utiliser directement la fonction du module pappers-collector
    const data = await pappersCollector.collectCompanyData(query, identifier);
    
    if (!data) {
      console.log(`Aucune donnée trouvée pour: ${query}`);
      return { error: 'Aucune donnée trouvée' };
    }
    
    console.log(`Données récupérées avec succès pour: ${data.nom_entreprise || query}`);
    return data;
  } catch (error) {
    console.error('Erreur lors de la récupération des données Pappers:', error);
    return { error: error.message };
  }
}

module.exports = {
  getPappersEssentialData
};
/**
 * Script de test pour vérifier l'API Pappers avec un SIREN connu
 */
require('dotenv').config();
const axios = require('axios');

// Clé API Pappers
const PAPPERS_API_KEY = process.env.PAPPERS_API_KEY;

// SIREN connu pour le test (EDF)
const TEST_SIREN = '552081317';

// Fonction pour tester l'API Pappers avec un SIREN
async function testPappersAPIWithSiren() {
  try {
    console.log('=== TEST API PAPPERS AVEC SIREN ===');
    console.log(`Clé API: ${PAPPERS_API_KEY ? PAPPERS_API_KEY.substring(0, 5) + '...' : 'Non configurée'}`);
    console.log(`SIREN de test: ${TEST_SIREN}`);
    
    // Test de récupération des détails d'une entreprise
    console.log('\n1. Test de récupération des détails d\'une entreprise');
    const detailsUrl = `https://api.pappers.fr/v2/entreprise?api_token=${PAPPERS_API_KEY}&siren=${TEST_SIREN}`;
    console.log(`URL: ${detailsUrl.replace(PAPPERS_API_KEY, 'API_KEY')}`);
    
    const detailsResponse = await axios.get(detailsUrl);
    console.log(`Statut: ${detailsResponse.status}`);
    console.log(`Nom de l'entreprise: ${detailsResponse.data.nom_entreprise}`);
    
    // Test de récupération des données financières
    console.log('\n2. Test de récupération des données financières');
    const financialUrl = `https://api.pappers.fr/v2/entreprise?api_token=${PAPPERS_API_KEY}&siren=${TEST_SIREN}&bilans=true`;
    console.log(`URL: ${financialUrl.replace(PAPPERS_API_KEY, 'API_KEY')}`);
    
    const financialResponse = await axios.get(financialUrl);
    console.log(`Statut: ${financialResponse.status}`);
    console.log(`Nombre de bilans: ${financialResponse.data.bilans ? financialResponse.data.bilans.length : 0}`);
    
    // Test de recherche par nom d'entreprise
    console.log('\n3. Test de recherche par nom d\'entreprise');
    const searchUrl = `https://api.pappers.fr/v2/recherche?api_token=${PAPPERS_API_KEY}&q=EDF&precision=high`;
    console.log(`URL: ${searchUrl.replace(PAPPERS_API_KEY, 'API_KEY')}`);
    
    const searchResponse = await axios.get(searchUrl);
    console.log(`Statut: ${searchResponse.status}`);
    console.log(`Nombre de résultats: ${searchResponse.data.resultats ? searchResponse.data.resultats.length : 0}`);
    
    console.log('\n=== TESTS RÉUSSIS ===');
    return true;
  } catch (error) {
    console.error('\n=== ERREUR LORS DES TESTS ===');
    console.error(`Message: ${error.message}`);
    
    if (error.response) {
      console.error(`Statut: ${error.response.status}`);
      console.error('Données:', error.response.data);
    }
    
    return false;
  }
}

// Exécuter le test
testPappersAPIWithSiren().catch(error => {
  console.error('Erreur non gérée:', error);
});

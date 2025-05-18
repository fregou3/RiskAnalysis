/**
 * Script de test direct pour l'API Pappers
 */
require('dotenv').config();
const axios = require('axios');

// Clé API Pappers
const PAPPERS_API_KEY = process.env.PAPPERS_API_KEY;

// Fonction pour tester directement l'API Pappers
async function testPappersAPI() {
  try {
    console.log('=== TEST DIRECT API PAPPERS ===');
    console.log(`Clé API: ${PAPPERS_API_KEY ? PAPPERS_API_KEY.substring(0, 5) + '...' : 'Non configurée'}`);
    
    // Test avec l'URL complète et les paramètres directement dans l'URL
    const url = `https://api.pappers.fr/v2/entreprise?api_token=${PAPPERS_API_KEY}&siren=552081317`;
    console.log(`URL de test: ${url.replace(PAPPERS_API_KEY, 'API_KEY')}`);
    
    const response = await axios.get(url);
    
    console.log('Statut de la réponse:', response.status);
    console.log('Données reçues:', JSON.stringify(response.data, null, 2).substring(0, 500) + '...');
    
    console.log('\n=== TEST RÉUSSI ===');
    return true;
  } catch (error) {
    console.error('Erreur lors du test direct de l\'API Pappers:');
    console.error(`Message: ${error.message}`);
    
    if (error.response) {
      console.error(`Statut: ${error.response.status}`);
      console.error('Données:', error.response.data);
    }
    
    console.log('\n=== SUGGESTIONS DE CORRECTION ===');
    console.log('1. Vérifiez que votre clé API est valide et active');
    console.log('2. Assurez-vous que votre plan API permet d\'accéder à cette ressource');
    console.log('3. Vérifiez que l\'URL de base est correcte (https://api.pappers.fr/v2)');
    console.log('4. Essayez d\'utiliser un autre endpoint comme /entreprise au lieu de /recherche-entreprises');
    
    return false;
  }
}

// Exécuter le test
testPappersAPI().catch(error => {
  console.error('Erreur non gérée:', error);
});

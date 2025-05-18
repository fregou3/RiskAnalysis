/**
 * Script de test et de débogage pour l'API Pappers
 * Ce script permet de tester directement les appels à l'API Pappers pour comprendre sa structure
 */

const axios = require('axios');
require('dotenv').config();

// Récupérer la clé API Pappers
const PAPPERS_API_KEY = process.env.PAPPERS_API_KEY;
console.log('Clé API Pappers:', PAPPERS_API_KEY ? `${PAPPERS_API_KEY.substring(0, 5)}...${PAPPERS_API_KEY.substring(PAPPERS_API_KEY.length - 5)}` : 'Non définie');

// Fonction pour tester un appel API et afficher la structure de la réponse
async function testApiCall(url, params, description) {
  console.log(`\n=== Test: ${description} ===`);
  console.log(`URL: ${url}`);
  console.log('Paramètres:', JSON.stringify(params, null, 2));
  
  try {
    const response = await axios.get(url, { params });
    console.log('Statut:', response.status);
    
    // Afficher les clés de premier niveau de la réponse
    console.log('\nStructure de la réponse:');
    if (Array.isArray(response.data)) {
      console.log('Type: Array avec', response.data.length, 'éléments');
      if (response.data.length > 0) {
        console.log('Premier élément - clés:', Object.keys(response.data[0]));
        // Afficher un échantillon du premier élément
        console.log('Échantillon du premier élément:', JSON.stringify(response.data[0], null, 2).substring(0, 500) + '...');
      }
    } else {
      console.log('Type: Object');
      console.log('Clés:', Object.keys(response.data));
      
      // Si la réponse contient des données financières, les afficher
      if (response.data.chiffre_affaires) {
        console.log('\nDonnées financières trouvées:');
        console.log('Chiffre d\'affaires:', response.data.chiffre_affaires);
        console.log('Résultat net:', response.data.resultat_net);
      }
      
      // Si la réponse contient des dirigeants, les afficher
      if (response.data.dirigeants && response.data.dirigeants.length > 0) {
        console.log('\nDirigeants trouvés:', response.data.dirigeants.length);
        console.log('Premier dirigeant:', JSON.stringify(response.data.dirigeants[0], null, 2));
      }
      
      // Si la réponse contient des bilans, les afficher
      if (response.data.bilans && response.data.bilans.length > 0) {
        console.log('\nBilans trouvés:', response.data.bilans.length);
        console.log('Premier bilan:', JSON.stringify(response.data.bilans[0], null, 2));
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Erreur:', error.message);
    if (error.response) {
      console.error('Statut:', error.response.status);
      console.error('Détails:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// Fonction principale pour exécuter les tests
async function runTests() {
  console.log('=== TESTS DE DÉBOGAGE DE L\'API PAPPERS ===\n');
  
  // Test 1: Recherche d'entreprise par nom
  await testApiCall(
    'https://api.pappers.fr/v2/recherche-entreprises',
    {
      api_token: PAPPERS_API_KEY,
      q: 'TF1',
      par_page: 5
    },
    'Recherche d\'entreprise par nom (TF1)'
  );
  
  // Test 2: Recherche d'entreprise par SIREN
  await testApiCall(
    'https://api.pappers.fr/v2/entreprise',
    {
      api_token: PAPPERS_API_KEY,
      siren: '552081317' // SIREN de TF1
    },
    'Recherche d\'entreprise par SIREN (TF1)'
  );
  
  // Test 3: Récupération des bilans
  await testApiCall(
    'https://api.pappers.fr/v2/entreprise',
    {
      api_token: PAPPERS_API_KEY,
      siren: '552081317', // SIREN de TF1
      bilans: true
    },
    'Récupération des bilans (TF1)'
  );
  
  // Test 4: Récupération des dirigeants
  await testApiCall(
    'https://api.pappers.fr/v2/entreprise',
    {
      api_token: PAPPERS_API_KEY,
      siren: '552081317', // SIREN de TF1
      dirigeants: true
    },
    'Récupération des dirigeants (TF1)'
  );
  
  // Test 5: Récupération des bénéficiaires effectifs
  await testApiCall(
    'https://api.pappers.fr/v2/entreprise',
    {
      api_token: PAPPERS_API_KEY,
      siren: '552081317', // SIREN de TF1
      beneficiaires_effectifs: true
    },
    'Récupération des bénéficiaires effectifs (TF1)'
  );
  
  // Test 6: Récupération de toutes les informations en une seule requête
  await testApiCall(
    'https://api.pappers.fr/v2/entreprise',
    {
      api_token: PAPPERS_API_KEY,
      siren: '552081317', // SIREN de TF1
      dirigeants: true,
      beneficiaires_effectifs: true,
      bilans: true
    },
    'Récupération de toutes les informations (TF1)'
  );
  
  // Test 7: Essai avec une autre entreprise (Clarins)
  await testApiCall(
    'https://api.pappers.fr/v2/entreprise',
    {
      api_token: PAPPERS_API_KEY,
      siren: '330589955', // SIREN de Clarins
      dirigeants: true,
      beneficiaires_effectifs: true,
      bilans: true
    },
    'Récupération de toutes les informations (Clarins)'
  );
  
  console.log('\n=== TESTS TERMINÉS ===');
}

// Exécuter les tests
runTests().catch(error => {
  console.error('Erreur globale:', error.message);
});

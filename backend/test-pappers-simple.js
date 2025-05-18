/**
 * Script de test simple pour valider la clé API Pappers
 */

const axios = require('axios');
require('dotenv').config();

// Récupérer la clé API Pappers
const PAPPERS_API_KEY = process.env.PAPPERS_API_KEY;
console.log('Clé API Pappers:', PAPPERS_API_KEY ? `${PAPPERS_API_KEY.substring(0, 5)}...${PAPPERS_API_KEY.substring(PAPPERS_API_KEY.length - 5)}` : 'Non définie');

// Fonction de test simple
async function testPappersAPI() {
  try {
    console.log('Test de l\'API Pappers avec différentes méthodes d\'authentification...');
    
    // Méthode 1: Paramètre api_token dans l'URL
    console.log('\nMéthode 1: Paramètre api_token dans l\'URL');
    try {
      const response1 = await axios.get(`https://api.pappers.fr/v2/entreprise?api_token=${PAPPERS_API_KEY}&denomination=TF1`);
      console.log('Succès! Statut:', response1.status);
      console.log('Données reçues:', JSON.stringify(response1.data).substring(0, 100) + '...');
    } catch (error) {
      console.error('Erreur:', error.message);
      if (error.response) {
        console.error('Statut:', error.response.status);
        console.error('Détails:', JSON.stringify(error.response.data));
      }
    }
    
    // Méthode 2: Paramètre api_token dans les params
    console.log('\nMéthode 2: Paramètre api_token dans les params');
    try {
      const response2 = await axios.get('https://api.pappers.fr/v2/entreprise', {
        params: {
          api_token: PAPPERS_API_KEY,
          denomination: 'TF1'
        }
      });
      console.log('Succès! Statut:', response2.status);
      console.log('Données reçues:', JSON.stringify(response2.data).substring(0, 100) + '...');
    } catch (error) {
      console.error('Erreur:', error.message);
      if (error.response) {
        console.error('Statut:', error.response.status);
        console.error('Détails:', JSON.stringify(error.response.data));
      }
    }
    
    // Méthode 3: Header Authorization
    console.log('\nMéthode 3: Header Authorization');
    try {
      const response3 = await axios.get('https://api.pappers.fr/v2/entreprise', {
        params: {
          denomination: 'TF1'
        },
        headers: {
          'Authorization': `Bearer ${PAPPERS_API_KEY}`
        }
      });
      console.log('Succès! Statut:', response3.status);
      console.log('Données reçues:', JSON.stringify(response3.data).substring(0, 100) + '...');
    } catch (error) {
      console.error('Erreur:', error.message);
      if (error.response) {
        console.error('Statut:', error.response.status);
        console.error('Détails:', JSON.stringify(error.response.data));
      }
    }
    
    // Méthode 4: Recherche par SIREN (qui est plus précis)
    console.log('\nMéthode 4: Recherche par SIREN');
    try {
      const response4 = await axios.get(`https://api.pappers.fr/v2/entreprise/552081317?api_token=${PAPPERS_API_KEY}`);
      console.log('Succès! Statut:', response4.status);
      console.log('Données reçues:', JSON.stringify(response4.data).substring(0, 100) + '...');
    } catch (error) {
      console.error('Erreur:', error.message);
      if (error.response) {
        console.error('Statut:', error.response.status);
        console.error('Détails:', JSON.stringify(error.response.data));
      }
    }
    
  } catch (error) {
    console.error('Erreur globale:', error.message);
  }
}

// Exécuter le test
testPappersAPI().then(() => {
  console.log('\nTests terminés');
});

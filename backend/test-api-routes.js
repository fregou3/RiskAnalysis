/**
 * Script de test pour vérifier les routes API
 */
const axios = require('axios');

// URL de base de l'API
const API_URL = 'http://localhost:5040';

// Fonction pour tester la route /api/scrape
async function testScrapeRoute() {
  try {
    console.log('Testing /api/scrape route...');
    
    const response = await axios.post(`${API_URL}/api/scrape`, {
      companyName: 'EDF'
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    return true;
  } catch (error) {
    console.error('Error testing /api/scrape route:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Fonction pour tester la route /api/pappers-data
async function testPappersDataRoute() {
  try {
    console.log('Testing /api/pappers-data route...');
    
    const response = await axios.post(`${API_URL}/api/pappers-data`, {
      companyName: 'EDF'
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    return true;
  } catch (error) {
    console.error('Error testing /api/pappers-data route:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Fonction principale pour exécuter les tests
async function runTests() {
  console.log('=== TESTING API ROUTES ===');
  
  // Tester la route /api/scrape
  const scrapeResult = await testScrapeRoute();
  console.log(`/api/scrape route test ${scrapeResult ? 'PASSED' : 'FAILED'}`);
  
  console.log('\n');
  
  // Tester la route /api/pappers-data
  const pappersDataResult = await testPappersDataRoute();
  console.log(`/api/pappers-data route test ${pappersDataResult ? 'PASSED' : 'FAILED'}`);
  
  console.log('\n=== TESTS COMPLETED ===');
}

// Exécuter les tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});

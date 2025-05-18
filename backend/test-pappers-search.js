/**
 * Script de test pour vérifier la recherche d'entreprise via l'API Pappers
 */
require('dotenv').config();
const pappersService = require('./services/pappersService');

// Noms d'entreprises françaises connues pour les tests
const COMPANY_NAMES = [
  'EDF',
  'Total',
  'Carrefour',
  'BNP Paribas',
  'Société Générale',
  'Air France',
  'Renault',
  'Peugeot',
  'Michelin',
  'L\'Oréal'
];

// Fonction pour tester la recherche d'entreprise
async function testSearchCompany(companyName) {
  try {
    console.log(`\n[TEST] Recherche d'entreprise avec le nom: ${companyName}`);
    
    const results = await pappersService.searchCompany(companyName);
    
    console.log(`Résultats pour "${companyName}":`);
    console.log(JSON.stringify(results, null, 2));
    
    if (results && results.results && results.results.length > 0) {
      console.log(`✓ ${results.results.length} entreprises trouvées pour "${companyName}"`);
      
      // Tester la récupération des détails pour la première entreprise trouvée
      const firstCompany = results.results[0];
      console.log(`\n[TEST] Détails de l'entreprise avec SIREN: ${firstCompany.siren}`);
      
      const details = await pappersService.getCompanyDetails(firstCompany.siren);
      console.log(`Détails récupérés pour ${details.nom_entreprise || firstCompany.nom_entreprise}`);
      
      // Tester la récupération des données financières
      console.log(`\n[TEST] Données financières pour SIREN: ${firstCompany.siren}`);
      const financialData = await pappersService.getFinancialData(firstCompany.siren);
      
      if (financialData && financialData.comptes_sociaux && financialData.comptes_sociaux.length > 0) {
        console.log(`✓ ${financialData.comptes_sociaux.length} bilans financiers trouvés`);
        console.log(`Dernier chiffre d'affaires: ${financialData.comptes_sociaux[0].chiffre_affaires ? (financialData.comptes_sociaux[0].chiffre_affaires / 1000000).toFixed(2) + ' millions EUR' : 'Non disponible'}`);
      } else {
        console.log(`✗ Aucune donnée financière trouvée pour ${firstCompany.nom_entreprise}`);
      }
      
      return true;
    } else {
      console.log(`✗ Aucune entreprise trouvée pour "${companyName}"`);
      return false;
    }
  } catch (error) {
    console.error(`Erreur lors du test pour "${companyName}":`, error.message);
    return false;
  }
}

// Fonction principale pour exécuter les tests
async function runTests() {
  console.log('=== TEST DE RECHERCHE D\'ENTREPRISE VIA PAPPERS ===');
  console.log(`Clé API Pappers: ${process.env.PAPPERS_API_KEY ? process.env.PAPPERS_API_KEY.substring(0, 5) + '...' : 'Non configurée'}`);
  
  let successCount = 0;
  
  for (const companyName of COMPANY_NAMES) {
    const success = await testSearchCompany(companyName);
    if (success) {
      successCount++;
      // Arrêter après le premier succès pour ne pas surcharger l'API
      break;
    }
  }
  
  console.log('\n=== RÉSUMÉ DES TESTS ===');
  console.log(`Tests réussis: ${successCount}/${COMPANY_NAMES.length}`);
  
  if (successCount === 0) {
    console.log('\n⚠️ AUCUN TEST N\'A RÉUSSI. Vérifiez les points suivants:');
    console.log('1. La clé API Pappers est-elle valide?');
    console.log('2. Avez-vous atteint la limite de requêtes de votre plan API?');
    console.log('3. L\'API Pappers est-elle accessible depuis votre réseau?');
    console.log('4. Le format des requêtes est-il conforme à la documentation de l\'API?');
  }
}

// Exécuter les tests
runTests().catch(error => {
  console.error('Erreur lors de l\'exécution des tests:', error);
});

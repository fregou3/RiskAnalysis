/**
 * Script de test pour l'API Pappers
 * Ce script permet de tester la récupération des données d'entreprises françaises via l'API Pappers
 */

const pappersService = require('./services/pappersService');
const scraper = require('./services/scraper');
require('dotenv').config();

// Vérifier si la clé API Pappers est configurée
const PAPPERS_API_KEY = process.env.PAPPERS_API_KEY;
if (!PAPPERS_API_KEY) {
  console.warn('\x1b[33m%s\x1b[0m', 'Attention: La clé API Pappers n\'est pas configurée dans le fichier .env');
  console.warn('\x1b[33m%s\x1b[0m', 'Le script utilisera des données simulées.');
  console.log('\x1b[36m%s\x1b[0m', 'Pour obtenir une clé API, inscrivez-vous sur https://www.pappers.fr/api');
  console.log('');
} else {
  console.log('\x1b[32m%s\x1b[0m', 'Clé API Pappers détectée.');
  console.log('');
}

// Fonction pour tester la recherche d'entreprise
async function testSearchCompany(companyName) {
  console.log(`\x1b[1m\x1b[36m[TEST]\x1b[0m Recherche de l'entreprise: ${companyName}`);
  try {
    const results = await pappersService.searchCompany(companyName);
    console.log('\x1b[32m%s\x1b[0m', `✓ ${results.resultats.length} résultats trouvés`);
    
    if (results.resultats.length > 0) {
      const topResult = results.resultats[0];
      console.log('\x1b[36m%s\x1b[0m', 'Premier résultat:');
      console.log(`  Nom: ${topResult.nom_entreprise}`);
      console.log(`  SIREN: ${topResult.siren}`);
      console.log(`  Localisation: ${topResult.siege?.ville || 'N/A'} (${topResult.siege?.code_postal || 'N/A'})`);
      console.log(`  Activité: ${topResult.libelle_code_naf || 'N/A'}`);
    }
    console.log('');
    return results;
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `✗ Erreur lors de la recherche: ${error.message}`);
    console.log('');
    return null;
  }
}

// Fonction pour tester la récupération des détails d'une entreprise
async function testCompanyDetails(siren) {
  console.log(`\x1b[1m\x1b[36m[TEST]\x1b[0m Détails de l'entreprise avec SIREN: ${siren}`);
  try {
    const details = await pappersService.getCompanyDetails(siren);
    console.log('\x1b[32m%s\x1b[0m', `✓ Détails récupérés pour ${details.nom_entreprise}`);
    console.log('\x1b[36m%s\x1b[0m', 'Informations principales:');
    console.log(`  Forme juridique: ${details.forme_juridique || 'N/A'}`);
    console.log(`  Date de création: ${details.date_creation || 'N/A'}`);
    console.log(`  Capital: ${details.capital ? `${(details.capital / 1000).toFixed(0)} 000 EUR` : 'N/A'}`);
    console.log(`  Effectif: ${details.tranche_effectif || 'N/A'}`);
    console.log('');
    return details;
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `✗ Erreur lors de la récupération des détails: ${error.message}`);
    console.log('');
    return null;
  }
}

// Fonction pour tester la récupération des données financières
async function testFinancialData(siren) {
  console.log(`\x1b[1m\x1b[36m[TEST]\x1b[0m Données financières de l'entreprise avec SIREN: ${siren}`);
  try {
    const financialData = await pappersService.getFinancialData(siren);
    if (financialData.comptes_sociaux && financialData.comptes_sociaux.length > 0) {
      console.log('\x1b[32m%s\x1b[0m', `✓ ${financialData.comptes_sociaux.length} exercices financiers récupérés`);
      console.log('\x1b[36m%s\x1b[0m', 'Dernier exercice:');
      const lastYear = financialData.comptes_sociaux[0];
      console.log(`  Date de clôture: ${lastYear.date_cloture || 'N/A'}`);
      console.log(`  Chiffre d'affaires: ${lastYear.chiffre_affaires ? `${(lastYear.chiffre_affaires / 1000000).toFixed(2)} millions EUR` : 'N/A'}`);
      console.log(`  Résultat net: ${lastYear.resultat_net ? `${(lastYear.resultat_net / 1000000).toFixed(2)} millions EUR` : 'N/A'}`);
      console.log(`  Effectif: ${lastYear.effectif || 'N/A'}`);
    } else {
      console.log('\x1b[33m%s\x1b[0m', '⚠ Aucune donnée financière disponible');
    }
    console.log('');
    return financialData;
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `✗ Erreur lors de la récupération des données financières: ${error.message}`);
    console.log('');
    return null;
  }
}

// Fonction pour tester la récupération des dirigeants
async function testCompanyManagement(siren) {
  console.log(`\x1b[1m\x1b[36m[TEST]\x1b[0m Dirigeants de l'entreprise avec SIREN: ${siren}`);
  try {
    const management = await pappersService.getCompanyManagement(siren);
    if (management.dirigeants && management.dirigeants.length > 0) {
      console.log('\x1b[32m%s\x1b[0m', `✓ ${management.dirigeants.length} dirigeants récupérés`);
      console.log('\x1b[36m%s\x1b[0m', 'Dirigeants principaux:');
      management.dirigeants.forEach((dirigeant, index) => {
        if (index < 3) { // Afficher seulement les 3 premiers dirigeants
          console.log(`  ${dirigeant.prenom || ''} ${dirigeant.nom || ''} - ${dirigeant.fonction || 'N/A'}`);
        }
      });
      if (management.dirigeants.length > 3) {
        console.log(`  ... et ${management.dirigeants.length - 3} autres`);
      }
    } else {
      console.log('\x1b[33m%s\x1b[0m', '⚠ Aucun dirigeant disponible');
    }
    console.log('');
    return management;
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `✗ Erreur lors de la récupération des dirigeants: ${error.message}`);
    console.log('');
    return null;
  }
}

// Fonction pour tester la récupération complète via le scraper
async function testScraperPappersData(companyName) {
  console.log(`\x1b[1m\x1b[36m[TEST]\x1b[0m Récupération complète via scraper pour: ${companyName}`);
  try {
    const data = await scraper.scrapePappersData(companyName);
    if (data.status === 'error') {
      console.error('\x1b[31m%s\x1b[0m', `✗ Erreur: ${data.message}`);
    } else if (data.status === 'not_found') {
      console.log('\x1b[33m%s\x1b[0m', `⚠ ${data.message}`);
    } else {
      console.log('\x1b[32m%s\x1b[0m', '✓ Données complètes récupérées avec succès');
      console.log('\x1b[36m%s\x1b[0m', 'Résumé des données:');
      const pappersData = data.pappersData;
      console.log(`  Entreprise: ${pappersData.identite.nom} (${pappersData.identite.siren})`);
      console.log(`  Forme juridique: ${pappersData.identite.formeJuridique}`);
      console.log(`  Adresse: ${pappersData.siege.adresse}, ${pappersData.siege.codePostal} ${pappersData.siege.ville}`);
      console.log(`  Dirigeants: ${pappersData.dirigeants.length}`);
      console.log(`  Exercices financiers: ${pappersData.finances.length}`);
      
      if (pappersData.finances.length > 0) {
        const lastFinance = pappersData.finances[0];
        console.log(`  Dernier CA: ${lastFinance.chiffreAffaires}`);
        console.log(`  Dernier résultat: ${lastFinance.resultatNet}`);
      }
    }
    console.log('');
    return data;
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `✗ Erreur lors de la récupération complète: ${error.message}`);
    console.log('');
    return null;
  }
}

// Exécution des tests
async function runTests() {
  console.log('\x1b[1m\x1b[35m%s\x1b[0m', '=== TEST DE L\'API PAPPERS ===');
  console.log('');
  
  // Test avec TF1
  const companyName = 'TF1';
  const searchResults = await testSearchCompany(companyName);
  
  if (searchResults && searchResults.resultats && searchResults.resultats.length > 0) {
    const siren = searchResults.resultats[0].siren;
    await testCompanyDetails(siren);
    await testFinancialData(siren);
    await testCompanyManagement(siren);
  }
  
  // Test du scraper complet
  await testScraperPappersData(companyName);
  
  // Test avec une autre entreprise (Clarins)
  console.log('\x1b[1m\x1b[35m%s\x1b[0m', '=== TEST AVEC UNE AUTRE ENTREPRISE ===');
  console.log('');
  await testScraperPappersData('Clarins');
  
  console.log('\x1b[1m\x1b[35m%s\x1b[0m', '=== TESTS TERMINÉS ===');
}

// Exécuter les tests
runTests().catch(error => {
  console.error('\x1b[31m%s\x1b[0m', `Erreur globale: ${error.message}`);
});

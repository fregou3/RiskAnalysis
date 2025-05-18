/**
 * Script pour rechercher des informations détaillées sur une entreprise via l'API Pappers
 * Usage: node pappers-search.js [nom d'entreprise ou SIREN]
 */

const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

// Vérifier que la clé API est disponible
const PAPPERS_API_KEY = process.env.PAPPERS_API_KEY;
if (!PAPPERS_API_KEY) {
  console.error('Erreur: Clé API Pappers non trouvée. Veuillez définir PAPPERS_API_KEY dans le fichier .env');
  process.exit(1);
}

// Récupérer le terme de recherche depuis les arguments de ligne de commande
const searchTerm = process.argv[2];
if (!searchTerm) {
  console.error('Erreur: Veuillez fournir un nom d\'entreprise ou un SIREN');
  console.log('Usage: node pappers-search.js [nom d\'entreprise ou SIREN]');
  process.exit(1);
}

/**
 * Fonction pour formater les données financières
 * @param {Object} finance - Données financières
 * @returns {Object} - Données financières formatées
 */
function formatFinancialData(finance) {
  return {
    date_cloture: finance.date_cloture,
    chiffre_affaires: formatNumber(finance.chiffre_affaires),
    resultat_net: formatNumber(finance.resultat_net),
    effectif: finance.effectif,
    marge_brute: formatNumber(finance.marge_brute),
    ebitda: formatNumber(finance.ebitda),
    rentabilite: finance.rentabilite ? `${finance.rentabilite}%` : 'N/A',
    taux_endettement: finance.taux_endettement ? `${finance.taux_endettement}%` : 'N/A',
    total_bilan: formatNumber(finance.total_bilan)
  };
}

/**
 * Fonction pour formater les nombres en euros
 * @param {Number} value - Valeur à formater
 * @returns {String} - Valeur formatée
 */
function formatNumber(value) {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

/**
 * Fonction pour rechercher une entreprise par son nom
 * @param {String} companyName - Nom de l'entreprise
 * @returns {Promise<Object>} - Résultats de la recherche
 */
async function searchCompanyByName(companyName) {
  try {
    console.log(`Recherche de l'entreprise "${companyName}"...`);
    
    // Vérifier si la clé API est disponible
    console.log(`Utilisation de la clé API: ${PAPPERS_API_KEY ? 'Disponible' : 'Non disponible'}`);
    
    const response = await axios.get('https://api.pappers.fr/v2/recherche', {
      params: {
        api_token: PAPPERS_API_KEY,
        q: companyName,
        par_page: 5
      }
    });
    
    if (response.data.resultats && response.data.resultats.length > 0) {
      console.log(`${response.data.total} résultats trouvés. Affichage des 5 premiers :`);
      
      response.data.resultats.forEach((result, index) => {
        console.log(`\n[${index + 1}] ${result.nom_entreprise}`);
        console.log(`    SIREN: ${result.siren}`);
        console.log(`    Forme juridique: ${result.forme_juridique}`);
        console.log(`    Adresse: ${result.siege?.adresse_complete || 'Non disponible'}`);
      });
      
      // Retourner le SIREN du premier résultat pour obtenir des détails
      return response.data.resultats[0].siren;
    } else {
      console.log('Aucun résultat trouvé.');
      return null;
    }
  } catch (error) {
    console.error('Erreur lors de la recherche par nom:', error.message);
    if (error.response) {
      console.error('Détails de l\'erreur:', error.response.data);
    }
    return null;
  }
}

/**
 * Fonction pour obtenir les détails complets d'une entreprise par son SIREN
 * @param {String} siren - Numéro SIREN de l'entreprise
 * @returns {Promise<void>}
 */
async function getCompanyDetails(siren) {
  try {
    console.log(`\nRécupération des détails pour le SIREN ${siren}...`);
    
    // Récupérer les informations générales
    const detailsResponse = await axios.get(`https://api.pappers.fr/v2/entreprise`, {
      params: {
        api_token: PAPPERS_API_KEY,
        siren: siren
      }
    });
    
    // Récupérer les données financières
    const financialResponse = await axios.get(`https://api.pappers.fr/v2/entreprise`, {
      params: {
        api_token: PAPPERS_API_KEY,
        siren: siren,
        extrait_financier: true
      }
    });
    
    // Récupérer les dirigeants
    const managementResponse = await axios.get(`https://api.pappers.fr/v2/entreprise`, {
      params: {
        api_token: PAPPERS_API_KEY,
        siren: siren,
        dirigeants: true
      }
    });
    
    // Récupérer les bénéficiaires effectifs
    const beneficiariesResponse = await axios.get(`https://api.pappers.fr/v2/entreprise`, {
      params: {
        api_token: PAPPERS_API_KEY,
        siren: siren,
        beneficiaires_effectifs: true
      }
    });
    
    // Récupérer les documents
    const documentsResponse = await axios.get(`https://api.pappers.fr/v2/entreprise`, {
      params: {
        api_token: PAPPERS_API_KEY,
        siren: siren,
        publications: true
      }
    });
    
    // Compiler toutes les données
    const companyData = {
      identite: {
        siren: detailsResponse.data.siren,
        nom: detailsResponse.data.nom_entreprise,
        nomCommercial: detailsResponse.data.nom_commercial,
        formeJuridique: detailsResponse.data.forme_juridique,
        dateCreation: detailsResponse.data.date_creation,
        capitalBrut: detailsResponse.data.capital,
        trancheEffectif: detailsResponse.data.tranche_effectif,
        codeNaf: detailsResponse.data.code_naf,
        libelleNaf: detailsResponse.data.libelle_code_naf,
        greffe: detailsResponse.data.greffe,
        dateImmatriculation: detailsResponse.data.date_immatriculation_rcs,
        procedureCollective: detailsResponse.data.procedure_collective,
        dateCessationActivite: detailsResponse.data.date_cessation_activite
      },
      siege: {
        adresse: detailsResponse.data.siege?.adresse_ligne_1,
        codePostal: detailsResponse.data.siege?.code_postal,
        ville: detailsResponse.data.siege?.ville,
        departement: detailsResponse.data.siege?.departement,
        region: detailsResponse.data.siege?.region,
        pays: detailsResponse.data.siege?.pays,
        telephone: detailsResponse.data.siege?.telephone,
        email: detailsResponse.data.siege?.email,
        siteWeb: detailsResponse.data.siege?.site_web
      },
      finances: financialResponse.data.extrait_financier?.exercices?.map(formatFinancialData) || [],
      dirigeants: managementResponse.data.dirigeants?.map(d => ({
        nom: d.nom,
        prenom: d.prenom,
        fonction: d.fonction,
        dateNomination: d.date_nomination,
        nationalite: d.nationalite
      })) || [],
      beneficiairesEffectifs: beneficiariesResponse.data.beneficiaires?.map(b => ({
        nom: b.nom,
        prenom: b.prenom,
        nationalite: b.nationalite,
        pourcentageParts: b.pourcentage_parts,
        pourcentageVotes: b.pourcentage_votes,
        dateDeNaissance: b.date_de_naissance_formate,
        typeControle: b.type_controle
      })) || [],
      documents: documentsResponse.data.publications?.map(doc => ({
        type: doc.type,
        date: doc.date,
        url: doc.url
      })) || []
    };
    
    // Afficher les résultats
    displayCompanyData(companyData);
    
    // Sauvegarder les résultats dans un fichier JSON
    const outputFile = path.resolve(__dirname, `${siren}_pappers_data.json`);
    fs.writeFileSync(outputFile, JSON.stringify(companyData, null, 2));
    console.log(`\nLes données ont été sauvegardées dans le fichier: ${outputFile}`);
    
  } catch (error) {
    console.error('Erreur lors de la récupération des détails:', error.message);
    if (error.response) {
      console.error('Détails de l\'erreur:', error.response.data);
    }
  }
}

/**
 * Fonction pour afficher les données de l'entreprise dans la console
 * @param {Object} data - Données de l'entreprise
 */
function displayCompanyData(data) {
  console.log('\n=== INFORMATIONS GÉNÉRALES ===');
  console.log(`Nom: ${data.identite.nom}`);
  console.log(`SIREN: ${data.identite.siren}`);
  console.log(`Forme juridique: ${data.identite.formeJuridique}`);
  console.log(`Date de création: ${data.identite.dateCreation}`);
  console.log(`Capital: ${formatNumber(data.identite.capitalBrut)}`);
  console.log(`Tranche d'effectif: ${data.identite.trancheEffectif}`);
  console.log(`Code NAF: ${data.identite.codeNaf} - ${data.identite.libelleNaf}`);
  
  console.log('\n=== ADRESSE ET CONTACT ===');
  console.log(`Adresse: ${data.siege.adresse}, ${data.siege.codePostal} ${data.siege.ville}`);
  console.log(`Département: ${data.siege.departement}`);
  console.log(`Région: ${data.siege.region}`);
  console.log(`Téléphone: ${data.siege.telephone || 'Non disponible'}`);
  console.log(`Email: ${data.siege.email || 'Non disponible'}`);
  console.log(`Site web: ${data.siege.siteWeb || 'Non disponible'}`);
  
  if (data.finances.length > 0) {
    console.log('\n=== DONNÉES FINANCIÈRES ===');
    data.finances.slice(0, 3).forEach((finance, index) => {
      console.log(`\nExercice ${index + 1} (${finance.date_cloture}):`);
      console.log(`  Chiffre d'affaires: ${finance.chiffre_affaires}`);
      console.log(`  Résultat net: ${finance.resultat_net}`);
      console.log(`  Effectif: ${finance.effectif || 'Non disponible'}`);
      console.log(`  EBITDA: ${finance.ebitda}`);
      console.log(`  Rentabilité: ${finance.rentabilite}`);
      console.log(`  Taux d'endettement: ${finance.taux_endettement}`);
      console.log(`  Total bilan: ${finance.total_bilan}`);
    });
  }
  
  if (data.dirigeants.length > 0) {
    console.log('\n=== DIRIGEANTS ===');
    data.dirigeants.forEach((dirigeant, index) => {
      console.log(`\nDirigeant ${index + 1}:`);
      console.log(`  Nom: ${dirigeant.prenom} ${dirigeant.nom}`);
      console.log(`  Fonction: ${dirigeant.fonction}`);
      console.log(`  Date de nomination: ${dirigeant.dateNomination || 'Non disponible'}`);
      console.log(`  Nationalité: ${dirigeant.nationalite || 'Non disponible'}`);
    });
  }
  
  if (data.beneficiairesEffectifs.length > 0) {
    console.log('\n=== BÉNÉFICIAIRES EFFECTIFS ===');
    data.beneficiairesEffectifs.forEach((beneficiaire, index) => {
      console.log(`\nBénéficiaire ${index + 1}:`);
      console.log(`  Nom: ${beneficiaire.prenom} ${beneficiaire.nom}`);
      console.log(`  Nationalité: ${beneficiaire.nationalite || 'Non disponible'}`);
      console.log(`  Pourcentage parts: ${beneficiaire.pourcentageParts ? `${beneficiaire.pourcentageParts}%` : 'Non disponible'}`);
      console.log(`  Pourcentage votes: ${beneficiaire.pourcentageVotes ? `${beneficiaire.pourcentageVotes}%` : 'Non disponible'}`);
      console.log(`  Type de contrôle: ${beneficiaire.typeControle || 'Non disponible'}`);
    });
  }
  
  if (data.documents.length > 0) {
    console.log('\n=== DOCUMENTS DISPONIBLES ===');
    data.documents.slice(0, 5).forEach((doc, index) => {
      console.log(`\nDocument ${index + 1}:`);
      console.log(`  Type: ${doc.type}`);
      console.log(`  Date: ${doc.date}`);
      console.log(`  URL: ${doc.url}`);
    });
    
    if (data.documents.length > 5) {
      console.log(`\n... et ${data.documents.length - 5} autres documents disponibles.`);
    }
  }
}

/**
 * Fonction principale
 */
async function main() {
  let siren = searchTerm;
  
  // Vérifier si le terme de recherche est un SIREN (9 chiffres)
  if (!/^\d{9}$/.test(searchTerm)) {
    // Si ce n'est pas un SIREN, rechercher par nom
    siren = await searchCompanyByName(searchTerm);
  }
  
  if (siren) {
    await getCompanyDetails(siren);
  } else {
    console.log('Impossible de continuer sans SIREN valide.');
  }
}

// Exécuter la fonction principale
main().catch(error => {
  console.error('Erreur dans l\'exécution du script:', error);
});

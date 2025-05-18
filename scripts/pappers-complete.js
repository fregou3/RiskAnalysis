/**
 * Script complet pour rechercher et analyser des informations détaillées sur une entreprise via l'API Pappers
 * Ce script peut être utilisé à la fois en ligne de commande (Node.js) et dans un navigateur
 * 
 * Usage en ligne de commande: node pappers-complete.js [nom d'entreprise ou SIREN]
 * Usage dans le navigateur: Copiez et collez ce script dans la console du navigateur, puis appelez searchCompany('nom ou SIREN')
 */

// Détection de l'environnement (Node.js ou navigateur)
const isNode = typeof window === 'undefined' && typeof process !== 'undefined';

// Configuration et imports
let axios, fs, path, dotenv;
let PAPPERS_API_KEY;

// Configuration pour Node.js
if (isNode) {
  axios = require('axios');
  fs = require('fs');
  path = require('path');
  dotenv = require('dotenv');
  
  // Charger les variables d'environnement
  dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
  
  // Récupérer la clé API
  PAPPERS_API_KEY = process.env.PAPPERS_API_KEY;
  
  if (!PAPPERS_API_KEY) {
    console.error('Erreur: Clé API Pappers non trouvée. Veuillez définir PAPPERS_API_KEY dans le fichier .env');
    process.exit(1);
  }
  
  // Récupérer le terme de recherche depuis les arguments de ligne de commande
  const searchTerm = process.argv[2];
  if (!searchTerm) {
    console.error('Erreur: Veuillez fournir un nom d\'entreprise ou un SIREN');
    console.log('Usage: node pappers-complete.js [nom d\'entreprise ou SIREN]');
    process.exit(1);
  }
  
  // Exécuter la recherche
  main(searchTerm).catch(error => {
    console.error('Erreur dans l\'exécution du script:', error);
  });
} else {
  // Configuration pour le navigateur
  PAPPERS_API_KEY = 'VOTRE_CLE_API_PAPPERS'; // À remplacer par la clé API
  
  // Fonction pour faciliter l'utilisation dans le navigateur
  window.searchCompany = searchTerm => main(searchTerm);
  
  console.log('%cScript de recherche Pappers chargé !', 'color: green; font-weight: bold; font-size: 14px');
  console.log('Utilisez la fonction searchCompany("nom d\'entreprise ou SIREN") pour rechercher une entreprise');
  console.log('Exemple: searchCompany("LVMH") ou searchCompany("552075580")');
}

/**
 * Fonction principale
 * @param {String} searchTerm - Nom de l'entreprise ou SIREN
 */
async function main(searchTerm) {
  let siren = searchTerm;
  
  // Vérifier si le terme de recherche est un SIREN (9 chiffres)
  if (!/^\d{9}$/.test(searchTerm.replace(/\s/g, ''))) {
    // Si ce n'est pas un SIREN, rechercher par nom
    siren = await searchCompanyByName(searchTerm);
  } else {
    siren = searchTerm.replace(/\s/g, '');
  }
  
  if (siren) {
    const companyData = await getCompanyDetails(siren);
    
    if (companyData) {
      // Analyser les données financières
      const financialAnalysis = analyzeFinancialData(companyData);
      
      // Afficher l'analyse financière
      displayFinancialAnalysis(financialAnalysis);
      
      // Sauvegarder les résultats dans un fichier JSON (uniquement en Node.js)
      if (isNode) {
        const outputFile = path.resolve(__dirname, `${siren}_pappers_data.json`);
        fs.writeFileSync(outputFile, JSON.stringify({
          ...companyData,
          financialAnalysis
        }, null, 2));
        console.log(`\nLes données ont été sauvegardées dans le fichier: ${outputFile}`);
      } else {
        // Dans le navigateur, stocker les données dans une variable globale
        window.lastCompanyData = {
          ...companyData,
          financialAnalysis
        };
      }
    }
  } else {
    console.log('Impossible de continuer sans SIREN valide.');
  }
  
  return siren;
}

/**
 * Fonction pour rechercher une entreprise par son nom
 * @param {String} companyName - Nom de l'entreprise
 * @returns {Promise<String>} - SIREN de l'entreprise
 */
async function searchCompanyByName(companyName) {
  try {
    log(`Recherche de l'entreprise "${companyName}"...`, 'info');
    
    // Faire la requête API
    const response = await makeApiRequest('recherche', {
      q: companyName,
      par_page: 5
    });
    
    if (response.resultats && response.resultats.length > 0) {
      log(`${response.total} résultats trouvés. Affichage des 5 premiers :`, 'success');
      
      response.resultats.forEach((result, index) => {
        log(`\n[${index + 1}] ${result.nom_entreprise}`, 'highlight');
        log(`    SIREN: ${result.siren}`);
        log(`    Forme juridique: ${result.forme_juridique}`);
        log(`    Adresse: ${result.siege?.adresse_complete || 'Non disponible'}`);
      });
      
      // Retourner le SIREN du premier résultat pour obtenir des détails
      return response.resultats[0].siren;
    } else {
      log('Aucun résultat trouvé.', 'error');
      return null;
    }
  } catch (error) {
    logError('Erreur lors de la recherche par nom:', error);
    return null;
  }
}

/**
 * Fonction pour obtenir les détails complets d'une entreprise par son SIREN
 * @param {String} siren - Numéro SIREN de l'entreprise
 * @returns {Promise<Object>} - Données complètes de l'entreprise
 */
async function getCompanyDetails(siren) {
  try {
    log(`\nRécupération des détails pour le SIREN ${siren}...`, 'info');
    
    // Récupérer les informations générales
    const detailsData = await makeApiRequest('entreprise', { siren });
    
    // Récupérer les données financières
    const financialData = await makeApiRequest('entreprise', { 
      siren,
      extrait_financier: true
    });
    
    // Récupérer les dirigeants
    const managementData = await makeApiRequest('entreprise', {
      siren,
      dirigeants: true
    });
    
    // Récupérer les bénéficiaires effectifs
    const beneficiariesData = await makeApiRequest('entreprise', {
      siren,
      beneficiaires_effectifs: true
    });
    
    // Récupérer les documents
    const documentsData = await makeApiRequest('entreprise', {
      siren,
      publications: true
    });
    
    // Compiler toutes les données
    const companyData = {
      identite: {
        siren: detailsData.siren,
        nom: detailsData.nom_entreprise,
        nomCommercial: detailsData.nom_commercial,
        formeJuridique: detailsData.forme_juridique,
        dateCreation: detailsData.date_creation,
        capitalBrut: detailsData.capital,
        trancheEffectif: detailsData.tranche_effectif,
        codeNaf: detailsData.code_naf,
        libelleNaf: detailsData.libelle_code_naf,
        greffe: detailsData.greffe,
        dateImmatriculation: detailsData.date_immatriculation_rcs,
        procedureCollective: detailsData.procedure_collective,
        dateCessationActivite: detailsData.date_cessation_activite
      },
      siege: {
        adresse: detailsData.siege?.adresse_ligne_1,
        codePostal: detailsData.siege?.code_postal,
        ville: detailsData.siege?.ville,
        departement: detailsData.siege?.departement,
        region: detailsData.siege?.region,
        pays: detailsData.siege?.pays,
        telephone: detailsData.siege?.telephone,
        email: detailsData.siege?.email,
        siteWeb: detailsData.siege?.site_web
      },
      finances: financialData.extrait_financier?.exercices?.map(formatFinancialData) || [],
      dirigeants: managementData.dirigeants?.map(d => ({
        nom: d.nom,
        prenom: d.prenom,
        fonction: d.fonction,
        dateNomination: d.date_nomination,
        nationalite: d.nationalite
      })) || [],
      beneficiairesEffectifs: beneficiariesData.beneficiaires?.map(b => ({
        nom: b.nom,
        prenom: b.prenom,
        nationalite: b.nationalite,
        pourcentageParts: b.pourcentage_parts,
        pourcentageVotes: b.pourcentage_votes,
        dateDeNaissance: b.date_de_naissance_formate,
        typeControle: b.type_controle
      })) || [],
      documents: documentsData.publications?.map(doc => ({
        type: doc.type,
        date: doc.date,
        url: doc.url
      })) || []
    };
    
    // Afficher les résultats
    displayCompanyData(companyData);
    
    return companyData;
    
  } catch (error) {
    logError('Erreur lors de la récupération des détails:', error);
    return null;
  }
}

/**
 * Fonction pour formater les données financières
 * @param {Object} finance - Données financières
 * @returns {Object} - Données financières formatées
 */
function formatFinancialData(finance) {
  return {
    date_cloture: finance.date_cloture,
    chiffre_affaires: finance.chiffre_affaires,
    chiffre_affaires_formatted: formatNumber(finance.chiffre_affaires),
    resultat_net: finance.resultat_net,
    resultat_net_formatted: formatNumber(finance.resultat_net),
    effectif: finance.effectif,
    marge_brute: finance.marge_brute,
    marge_brute_formatted: formatNumber(finance.marge_brute),
    ebitda: finance.ebitda,
    ebitda_formatted: formatNumber(finance.ebitda),
    rentabilite: finance.rentabilite,
    taux_endettement: finance.taux_endettement,
    total_bilan: finance.total_bilan,
    total_bilan_formatted: formatNumber(finance.total_bilan)
  };
}

/**
 * Fonction pour afficher les données de l'entreprise dans la console
 * @param {Object} data - Données de l'entreprise
 */
function displayCompanyData(data) {
  log('\n=== INFORMATIONS GÉNÉRALES ===', 'section');
  log(`Nom: ${data.identite.nom}`);
  log(`SIREN: ${data.identite.siren}`);
  log(`Forme juridique: ${data.identite.formeJuridique}`);
  log(`Date de création: ${data.identite.dateCreation}`);
  log(`Capital: ${formatNumber(data.identite.capitalBrut)}`);
  log(`Tranche d'effectif: ${data.identite.trancheEffectif}`);
  log(`Code NAF: ${data.identite.codeNaf} - ${data.identite.libelleNaf}`);
  
  log('\n=== ADRESSE ET CONTACT ===', 'section');
  log(`Adresse: ${data.siege.adresse}, ${data.siege.codePostal} ${data.siege.ville}`);
  log(`Département: ${data.siege.departement}`);
  log(`Région: ${data.siege.region}`);
  log(`Téléphone: ${data.siege.telephone || 'Non disponible'}`);
  log(`Email: ${data.siege.email || 'Non disponible'}`);
  log(`Site web: ${data.siege.siteWeb || 'Non disponible'}`);
  
  if (data.finances.length > 0) {
    log('\n=== DONNÉES FINANCIÈRES ===', 'section');
    data.finances.slice(0, 3).forEach((finance, index) => {
      log(`\nExercice ${index + 1} (${finance.date_cloture}):`, 'subsection');
      log(`  Chiffre d'affaires: ${finance.chiffre_affaires_formatted}`);
      log(`  Résultat net: ${finance.resultat_net_formatted}`);
      log(`  Effectif: ${finance.effectif || 'Non disponible'}`);
      log(`  EBITDA: ${finance.ebitda_formatted}`);
      log(`  Rentabilité: ${finance.rentabilite ? `${finance.rentabilite}%` : 'N/A'}`);
      log(`  Taux d'endettement: ${finance.taux_endettement ? `${finance.taux_endettement}%` : 'N/A'}`);
      log(`  Total bilan: ${finance.total_bilan_formatted}`);
    });
  }
  
  if (data.dirigeants.length > 0) {
    log('\n=== DIRIGEANTS ===', 'section');
    data.dirigeants.forEach((dirigeant, index) => {
      log(`\nDirigeant ${index + 1}:`, 'subsection');
      log(`  Nom: ${dirigeant.prenom} ${dirigeant.nom}`);
      log(`  Fonction: ${dirigeant.fonction}`);
      log(`  Date de nomination: ${dirigeant.dateNomination || 'Non disponible'}`);
      log(`  Nationalité: ${dirigeant.nationalite || 'Non disponible'}`);
    });
  }
  
  if (data.beneficiairesEffectifs.length > 0) {
    log('\n=== BÉNÉFICIAIRES EFFECTIFS ===', 'section');
    data.beneficiairesEffectifs.forEach((beneficiaire, index) => {
      log(`\nBénéficiaire ${index + 1}:`, 'subsection');
      log(`  Nom: ${beneficiaire.prenom} ${beneficiaire.nom}`);
      log(`  Nationalité: ${beneficiaire.nationalite || 'Non disponible'}`);
      log(`  Pourcentage parts: ${beneficiaire.pourcentageParts ? `${beneficiaire.pourcentageParts}%` : 'Non disponible'}`);
      log(`  Pourcentage votes: ${beneficiaire.pourcentageVotes ? `${beneficiaire.pourcentageVotes}%` : 'Non disponible'}`);
      log(`  Type de contrôle: ${beneficiaire.typeControle || 'Non disponible'}`);
    });
  }
  
  if (data.documents.length > 0) {
    log('\n=== DOCUMENTS DISPONIBLES ===', 'section');
    data.documents.slice(0, 5).forEach((doc, index) => {
      log(`\nDocument ${index + 1}:`, 'subsection');
      log(`  Type: ${doc.type}`);
      log(`  Date: ${doc.date}`);
      log(`  URL: ${doc.url}`);
    });
    
    if (data.documents.length > 5) {
      log(`\n... et ${data.documents.length - 5} autres documents disponibles.`);
    }
  }
}

/**
 * Fonction pour analyser les données financières
 * @param {Object} data - Données de l'entreprise
 * @returns {Object} - Analyse financière
 */
function analyzeFinancialData(data) {
  if (!data.finances || data.finances.length === 0) {
    return {
      status: 'no_data',
      message: 'Aucune donnée financière disponible pour cette entreprise.'
    };
  }
  
  // Trier les données financières par date (du plus récent au plus ancien)
  const sortedFinances = [...data.finances].sort((a, b) => {
    return new Date(b.date_cloture) - new Date(a.date_cloture);
  });
  
  // Calculer les variations année par année
  const variations = [];
  for (let i = 0; i < sortedFinances.length - 1; i++) {
    const currentYear = sortedFinances[i];
    const previousYear = sortedFinances[i + 1];
    
    const caVariation = calculateVariation(currentYear.chiffre_affaires, previousYear.chiffre_affaires);
    const rnVariation = calculateVariation(currentYear.resultat_net, previousYear.resultat_net);
    const ebitdaVariation = calculateVariation(currentYear.ebitda, previousYear.ebitda);
    
    variations.push({
      period: `${previousYear.date_cloture} à ${currentYear.date_cloture}`,
      chiffre_affaires: caVariation,
      resultat_net: rnVariation,
      ebitda: ebitdaVariation
    });
  }
  
  // Calculer les tendances sur 3 ans (si disponible)
  const trends = {
    chiffre_affaires: calculateTrend(sortedFinances.slice(0, 3).map(f => f.chiffre_affaires)),
    resultat_net: calculateTrend(sortedFinances.slice(0, 3).map(f => f.resultat_net)),
    ebitda: calculateTrend(sortedFinances.slice(0, 3).map(f => f.ebitda))
  };
  
  // Calculer les ratios financiers pour l'année la plus récente
  const latestYear = sortedFinances[0];
  const ratios = {
    marge_nette: latestYear.resultat_net && latestYear.chiffre_affaires ? 
      (latestYear.resultat_net / latestYear.chiffre_affaires * 100).toFixed(2) + '%' : 'N/A',
    rentabilite: latestYear.rentabilite ? latestYear.rentabilite + '%' : 'N/A',
    endettement: latestYear.taux_endettement ? latestYear.taux_endettement + '%' : 'N/A'
  };
  
  return {
    status: 'success',
    latest_year: latestYear,
    variations,
    trends,
    ratios
  };
}

/**
 * Fonction pour afficher l'analyse financière
 * @param {Object} analysis - Analyse financière
 */
function displayFinancialAnalysis(analysis) {
  if (analysis.status === 'no_data') {
    log('\n=== ANALYSE FINANCIÈRE ===', 'section');
    log(analysis.message, 'warning');
    return;
  }
  
  log('\n=== ANALYSE FINANCIÈRE ===', 'section');
  
  // Afficher les tendances
  log('\nTendances sur les derniers exercices:', 'subsection');
  log(`  Chiffre d'affaires: ${getTrendDescription(analysis.trends.chiffre_affaires)}`);
  log(`  Résultat net: ${getTrendDescription(analysis.trends.resultat_net)}`);
  log(`  EBITDA: ${getTrendDescription(analysis.trends.ebitda)}`);
  
  // Afficher les variations année par année
  if (analysis.variations.length > 0) {
    log('\nVariations année par année:', 'subsection');
    analysis.variations.forEach(variation => {
      log(`  Période: ${variation.period}`);
      log(`    Chiffre d'affaires: ${formatVariation(variation.chiffre_affaires)}`);
      log(`    Résultat net: ${formatVariation(variation.resultat_net)}`);
      log(`    EBITDA: ${formatVariation(variation.ebitda)}`);
    });
  }
  
  // Afficher les ratios financiers
  log('\nRatios financiers (dernier exercice):', 'subsection');
  log(`  Marge nette: ${analysis.ratios.marge_nette}`);
  log(`  Rentabilité: ${analysis.ratios.rentabilite}`);
  log(`  Taux d'endettement: ${analysis.ratios.endettement}`);
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
 * Fonction pour calculer la variation entre deux valeurs
 * @param {Number} current - Valeur actuelle
 * @param {Number} previous - Valeur précédente
 * @returns {Number} - Variation en pourcentage
 */
function calculateVariation(current, previous) {
  if (!current || !previous || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Fonction pour formater une variation
 * @param {Number} variation - Variation en pourcentage
 * @returns {String} - Variation formatée
 */
function formatVariation(variation) {
  if (variation === null) return 'Non calculable';
  const sign = variation >= 0 ? '+' : '';
  return `${sign}${variation.toFixed(2)}%`;
}

/**
 * Fonction pour calculer la tendance d'une série de valeurs
 * @param {Array<Number>} values - Série de valeurs
 * @returns {String} - Tendance (up, down, stable, mixed)
 */
function calculateTrend(values) {
  // Filtrer les valeurs non définies
  const filteredValues = values.filter(v => v !== undefined && v !== null);
  
  if (filteredValues.length < 2) return 'unknown';
  
  let increasing = 0;
  let decreasing = 0;
  
  for (let i = 0; i < filteredValues.length - 1; i++) {
    if (filteredValues[i] > filteredValues[i + 1]) {
      increasing++;
    } else if (filteredValues[i] < filteredValues[i + 1]) {
      decreasing++;
    }
  }
  
  if (increasing > 0 && decreasing === 0) return 'up';
  if (decreasing > 0 && increasing === 0) return 'down';
  if (increasing === 0 && decreasing === 0) return 'stable';
  return 'mixed';
}

/**
 * Fonction pour obtenir une description textuelle d'une tendance
 * @param {String} trend - Tendance (up, down, stable, mixed, unknown)
 * @returns {String} - Description de la tendance
 */
function getTrendDescription(trend) {
  switch (trend) {
    case 'up': return 'En hausse ↑';
    case 'down': return 'En baisse ↓';
    case 'stable': return 'Stable →';
    case 'mixed': return 'Variable ⇄';
    default: return 'Données insuffisantes';
  }
}

/**
 * Fonction pour effectuer une requête à l'API Pappers
 * @param {String} endpoint - Point de terminaison de l'API
 * @param {Object} params - Paramètres de la requête
 * @returns {Promise<Object>} - Réponse de l'API
 */
async function makeApiRequest(endpoint, params = {}) {
  try {
    // Ajouter la clé API aux paramètres
    const requestParams = {
      ...params,
      api_token: PAPPERS_API_KEY
    };
    
    let response;
    
    // Utiliser axios en Node.js ou fetch dans le navigateur
    if (isNode) {
      response = await axios.get(`https://api.pappers.fr/v2/${endpoint}`, {
        params: requestParams
      });
      return response.data;
    } else {
      // Construire l'URL avec les paramètres
      const url = new URL(`https://api.pappers.fr/v2/${endpoint}`);
      Object.keys(requestParams).forEach(key => {
        url.searchParams.append(key, requestParams[key]);
      });
      
      response = await fetch(url.toString());
      return await response.json();
    }
  } catch (error) {
    logError(`Erreur lors de la requête à l'API (${endpoint}):`, error);
    throw error;
  }
}

/**
 * Fonction pour afficher un message dans la console
 * @param {String} message - Message à afficher
 * @param {String} type - Type de message (info, success, error, warning, section, subsection, highlight)
 */
function log(message, type = 'default') {
  if (isNode) {
    // Affichage simple dans Node.js
    console.log(message);
  } else {
    // Affichage coloré dans le navigateur
    let style = '';
    
    switch (type) {
      case 'info': style = 'color: blue'; break;
      case 'success': style = 'color: green; font-weight: bold'; break;
      case 'error': style = 'color: red; font-weight: bold'; break;
      case 'warning': style = 'color: orange'; break;
      case 'section': style = 'color: green; font-weight: bold; font-size: 14px'; break;
      case 'subsection': style = 'color: blue; font-weight: bold'; break;
      case 'highlight': style = 'color: purple; font-weight: bold'; break;
      default: style = '';
    }
    
    if (style) {
      console.log(`%c${message}`, style);
    } else {
      console.log(message);
    }
  }
}

/**
 * Fonction pour afficher une erreur dans la console
 * @param {String} message - Message d'erreur
 * @param {Error} error - Objet d'erreur
 */
function logError(message, error) {
  if (isNode) {
    console.error(message, error.message);
    if (error.response) {
      console.error('Détails de l\'erreur:', error.response.data);
    }
  } else {
    console.error(`%c${message} ${error.message}`, 'color: red; font-weight: bold');
    console.error(error);
  }
}

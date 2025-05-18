/**
 * Service pour l'intégration de l'API Pappers.fr
 * Permet de récupérer des informations légales et financières sur les entreprises françaises
 * Documentation: https://api.pappers.fr/documentation
 */

const axios = require('axios');
require('dotenv').config();
const cacheService = require('./cacheService');

// Configuration de l'API Pappers
const API_BASE_URL = 'https://api.pappers.fr/v2';
const PAPPERS_API_KEY = process.env.PAPPERS_API_KEY || '';

/**
 * Recherche une entreprise par son nom ou SIREN/SIRET
 * @param {string} query - Nom de l'entreprise ou SIREN/SIRET
 * @returns {Promise<object>} - Résultats de la recherche
 */
async function searchCompany(query) {
  try {
    if (!PAPPERS_API_KEY) {
      console.warn('Pappers API key not configured. Using mock data.');
      return getMockSearchResults(query);
    }

    // Vérifier si les résultats sont en cache
    const cacheKey = query.toLowerCase().trim();
    const cachedResults = cacheService.get('companies', cacheKey);
    if (cachedResults) {
      console.log(`Cache hit for companies:${cacheKey}`);
      return cachedResults;
    }

    console.log(`Searching for company with query: ${query}`);

    // Déterminer si la requête est un SIREN/SIRET ou un nom d'entreprise
    const isSirenSiret = /^\d+$/.test(query.replace(/\s/g, ''));

    let response;
    let results;

    if (isSirenSiret) {
      // Recherche par SIREN/SIRET
      const params = {
        api_token: PAPPERS_API_KEY,
        siren: query.replace(/\s/g, '')
      };
      
      response = await axios.get(`${API_BASE_URL}/entreprise`, { params });
      
      // Format de réponse pour un SIREN/SIRET
      results = {
        results: [{
          siren: response.data.siren,
          nom_entreprise: response.data.nom_entreprise || response.data.denomination,
          forme_juridique: response.data.forme_juridique,
          date_creation: response.data.date_creation,
          siege: response.data.siege
        }]
      };
    } else {
      // Recherche par nom d'entreprise
      const params = {
        api_token: PAPPERS_API_KEY,
        q: query,
        precision: 'high',
        per_page: 10
      };
      
      response = await axios.get(`${API_BASE_URL}/recherche`, { params });
      
      // Format de réponse pour une recherche par nom
      if (response.data && response.data.resultats && response.data.resultats.length > 0) {
        results = {
          results: response.data.resultats.map(result => ({
            siren: result.siren,
            nom_entreprise: result.nom_entreprise,
            forme_juridique: result.forme_juridique,
            date_creation: result.date_creation,
            siege: result.siege
          }))
        };
      } else {
        results = { results: [] };
      }
    }

    // Mettre en cache les résultats
    cacheService.set('companies', cacheKey, results);

    return results;
  } catch (error) {
    console.error(`Error searching for company: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}, Data:`, error.response.data);
    }
    return getMockSearchResults(query);
  }
}

/**
 * Récupère les informations détaillées d'une entreprise par son SIREN
 * @param {string} siren - Numéro SIREN de l'entreprise
 * @returns {Promise<object>} - Informations détaillées de l'entreprise
 */
async function getCompanyDetails(siren) {
  try {
    if (!PAPPERS_API_KEY) {
      console.warn('Pappers API key not configured. Using mock data.');
      return getMockCompanyDetails(siren);
    }

    // Vérifier si les détails sont en cache
    const cachedDetails = cacheService.get('details', siren);
    if (cachedDetails) {
      return cachedDetails;
    }

    console.log(`Getting details for company with SIREN: ${siren}`);

    const params = {
      api_token: PAPPERS_API_KEY,
      siren: siren
    };

    const response = await axios.get(`${API_BASE_URL}/entreprise`, { params });

    // Mettre en cache les détails
    cacheService.set('details', siren, response.data);

    return response.data;
  } catch (error) {
    console.error(`Error getting company details: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}, Data:`, error.response.data);
    }
    return getMockCompanyDetails(siren);
  }
}

/**
 * Récupère les documents officiels d'une entreprise (statuts, comptes annuels, etc.)
 * @param {string} siren - Numéro SIREN de l'entreprise
 * @returns {Promise<object>} - Liste des documents disponibles
 */
async function getCompanyDocuments(siren) {
  try {
    if (!PAPPERS_API_KEY) {
      console.warn('Pappers API key not configured. Using mock data.');
      return getMockCompanyDocuments(siren);
    }

    // Vérifier si les documents sont en cache
    const cachedDocuments = cacheService.get('documents', siren);
    if (cachedDocuments) {
      return cachedDocuments;
    }

    console.log(`Getting documents for company with SIREN: ${siren}`);

    const params = {
      api_token: PAPPERS_API_KEY,
      siren: siren,
      extrait_kbis: true,
      statuts: true
    };

    const response = await axios.get(`${API_BASE_URL}/entreprise`, { params });

    // Extraire les documents de la réponse
    const documents = {
      documents: []
    };

    if (response.data.extrait_kbis_url) {
      documents.documents.push({
        type: 'extrait_kbis',
        url: response.data.extrait_kbis_url,
        date: new Date().toISOString().split('T')[0]
      });
    }

    if (response.data.statuts_url) {
      documents.documents.push({
        type: 'statuts',
        url: response.data.statuts_url,
        date: response.data.statuts_date_depot
      });
    }

    // Mettre en cache les documents
    cacheService.set('documents', siren, documents);

    return documents;
  } catch (error) {
    console.error(`Error getting company documents: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}, Data:`, error.response.data);
    }
    return getMockCompanyDocuments(siren);
  }
}

/**
 * Récupère les données financières d'une entreprise
 * @param {string} siren - Numéro SIREN de l'entreprise
 * @returns {Promise<object>} - Données financières de l'entreprise
 */
async function getFinancialData(siren) {
  try {
    if (!PAPPERS_API_KEY) {
      console.warn('Pappers API key not configured. Using mock data.');
      return getMockFinancialData(siren);
    }

    // Vérifier si les données financières sont en cache
    const cachedFinancialData = cacheService.get('finances', siren);
    if (cachedFinancialData) {
      return cachedFinancialData;
    }

    // Récupérer les données financières via l'API Pappers payante
    console.log(`Récupération des données financières via l'API pour ${siren}`);

    const params = {
      api_token: PAPPERS_API_KEY,
      siren: siren,
      bilans: true,  // Récupérer les bilans financiers
      format_publications: true  // Obtenir les publications au format structuré
    };

    const response = await axios.get(`${API_BASE_URL}/entreprise`, { params });

    // Vérifier si des bilans sont disponibles
    if (response.data && response.data.bilans && response.data.bilans.length > 0) {
      console.log(`${response.data.bilans.length} bilans trouvés pour ${siren}`);

      // Formater les données financières
      const financialData = {
        comptes_sociaux: response.data.bilans.map(bilan => ({
          date_cloture: bilan.date_cloture,
          duree_exercice: bilan.duree_exercice || 12,
          chiffre_affaires: bilan.chiffre_affaires,
          resultat_net: bilan.resultat_net,
          effectif: bilan.effectif
        }))
      };

      // Mettre en cache les données financières
      cacheService.set('finances', siren, financialData);

      return financialData;
    } else {
      console.log(`Aucun bilan trouvé pour ${siren}`);
      return getMockFinancialData(siren);
    }
  } catch (error) {
    console.error(`Error getting financial data from Pappers: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}, Data:`, error.response.data);
    }
    return getMockFinancialData(siren);
  }
}

/**
 * Récupère les informations sur les dirigeants d'une entreprise
 * @param {string} siren - Numéro SIREN de l'entreprise
 * @returns {Promise<object>} - Informations sur les dirigeants
 */
async function getCompanyManagement(siren) {
  try {
    if (!PAPPERS_API_KEY) {
      console.warn('Pappers API key not configured. Using mock data.');
      return getMockCompanyManagement(siren);
    }

    // Vérifier si les informations sur les dirigeants sont en cache
    const cachedManagement = cacheService.get('management', siren);
    if (cachedManagement) {
      return cachedManagement;
    }

    console.log(`Getting management information for company with SIREN: ${siren}`);

    const params = {
      api_token: PAPPERS_API_KEY,
      siren: siren,
      dirigeants: true
    };

    const response = await axios.get(`${API_BASE_URL}/entreprise`, { params });

    // Vérifier si des informations sur les dirigeants sont disponibles
    if (response.data && response.data.dirigeants && response.data.dirigeants.length > 0) {
      const management = {
        dirigeants: response.data.dirigeants.map(dirigeant => ({
          nom: dirigeant.nom,
          prenom: dirigeant.prenom,
          fonction: dirigeant.fonction,
          date_nomination: dirigeant.date_nomination
        }))
      };

      // Mettre en cache les informations sur les dirigeants
      cacheService.set('management', siren, management);

      return management;
    } else {
      console.log(`Aucune information réelle sur les dirigeants disponible pour ${siren}, utilisation des données simulées`);
      return getMockCompanyManagement(siren);
    }
  } catch (error) {
    console.error(`Error getting management information: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}, Data:`, error.response.data);
    }
    return getMockCompanyManagement(siren);
  }
}

/**
 * Récupère les informations sur les bénéficiaires effectifs d'une entreprise
 * @param {string} siren - Numéro SIREN de l'entreprise
 * @returns {Promise<object>} - Informations sur les bénéficiaires effectifs
 */
async function getBeneficialOwners(siren) {
  try {
    if (!PAPPERS_API_KEY) {
      console.warn('Pappers API key not configured. Using mock data.');
      return getMockBeneficialOwners(siren);
    }

    // Vérifier si les informations sur les bénéficiaires effectifs sont en cache
    const cachedOwners = cacheService.get('owners', siren);
    if (cachedOwners) {
      return cachedOwners;
    }

    console.log(`Getting beneficial owners information for company with SIREN: ${siren}`);

    const params = {
      api_token: PAPPERS_API_KEY,
      siren: siren,
      beneficiaires: true
    };

    const response = await axios.get(`${API_BASE_URL}/entreprise`, { params });

    // Vérifier si des informations sur les bénéficiaires effectifs sont disponibles
    if (response.data && response.data.beneficiaires && response.data.beneficiaires.length > 0) {
      const owners = {
        beneficiaires: response.data.beneficiaires.map(beneficiaire => ({
          nom: beneficiaire.nom,
          prenom: beneficiaire.prenom,
          nationalite: beneficiaire.nationalite,
          date_de_naissance: beneficiaire.date_de_naissance,
          pourcentage_parts: beneficiaire.pourcentage_parts,
          pourcentage_votes: beneficiaire.pourcentage_votes
        }))
      };

      // Mettre en cache les informations sur les bénéficiaires effectifs
      cacheService.set('owners', siren, owners);

      return owners;
    } else {
      console.log(`Aucune information réelle sur les bénéficiaires effectifs disponible pour ${siren}, utilisation des données simulées`);
      return getMockBeneficialOwners(siren);
    }
  } catch (error) {
    console.error(`Error getting beneficial owners information: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}, Data:`, error.response.data);
    }
    return getMockBeneficialOwners(siren);
  }
}

// Fonctions pour générer des données simulées

function getMockSearchResults(query) {
  if (query.toLowerCase().includes('clarins') || query === '330589658') {
    return {
      results: [
        {
          siren: '330589658',
          nom_entreprise: 'CLARINS',
          forme_juridique: 'SAS, société par actions simplifiée',
          date_creation: '1984-07-12',
          siege: {
            code_postal: '92200',
            ville: 'NEUILLY SUR SEINE'
          }
        }
      ]
    };
  } else if (query.toLowerCase().includes('edf') || query === '552081317') {
    return {
      results: [
        {
          siren: '552081317',
          nom_entreprise: 'EDF',
          forme_juridique: 'SA à conseil d\'administration',
          date_creation: '1955-06-08',
          siege: {
            code_postal: '75007',
            ville: 'PARIS'
          }
        }
      ]
    };
  } else {
    return {
      results: [
        {
          siren: '514620707',
          nom_entreprise: 'GROUPE CLARINS',
          forme_juridique: 'SAS, société par actions simplifiée',
          date_creation: '2009-08-26',
          siege: {
            code_postal: '75008',
            ville: 'PARIS'
          }
        }
      ]
    };
  }
}

function getMockCompanyDetails(siren) {
  if (siren === '552081317') {
    return {
      siren: '552081317',
      nom_entreprise: 'EDF',
      forme_juridique: 'SA à conseil d\'administration',
      date_creation: '1955-06-08',
      capital: 1551810543,
      effectif: '100 000 à 199 999 salariés',
      siege: {
        siret: '55208131766522',
        adresse: '22 Avenue de Wagram',
        code_postal: '75008',
        ville: 'PARIS'
      },
      code_naf: '3514Z',
      libelle_code_naf: 'Commerce d\'électricité'
    };
  } else {
    return {
      siren: '514620707',
      nom_entreprise: 'GROUPE CLARINS',
      forme_juridique: 'SAS, société par actions simplifiée',
      date_creation: '2009-08-26',
      capital: 156250000,
      effectif: '1 000 à 1 999 salariés',
      siege: {
        siret: '51462070700025',
        adresse: '9 Rue du Commandant Pilot',
        code_postal: '92200',
        ville: 'NEUILLY SUR SEINE'
      },
      code_naf: '7010Z',
      libelle_code_naf: 'Activités des sièges sociaux'
    };
  }
}

function getMockCompanyDocuments(siren) {
  return {
    documents: [
      {
        type: 'extrait_kbis',
        url: 'https://example.com/kbis.pdf',
        date: '2023-01-15'
      },
      {
        type: 'statuts',
        url: 'https://example.com/statuts.pdf',
        date: '2021-06-30'
      }
    ]
  };
}

function getMockFinancialData(siren) {
  if (siren === '552081317') {
    return {
      comptes_sociaux: [
        {
          date_cloture: '2022-12-31',
          duree_exercice: 12,
          chiffre_affaires: 1250000000,
          resultat_net: 150000000,
          effectif: 1500
        },
        {
          date_cloture: '2021-12-31',
          duree_exercice: 12,
          chiffre_affaires: 1150000000,
          resultat_net: 130000000,
          effectif: 1450
        }
      ]
    };
  } else {
    return {
      comptes_sociaux: [
        {
          date_cloture: '2022-12-31',
          duree_exercice: 12,
          chiffre_affaires: 980000000,
          resultat_net: 125000000,
          effectif: 1450
        },
        {
          date_cloture: '2021-12-31',
          duree_exercice: 12,
          chiffre_affaires: 920000000,
          resultat_net: 112000000,
          effectif: 1400
        }
      ]
    };
  }
}

function getMockCompanyManagement(siren) {
  if (siren === '552081317') {
    return {
      dirigeants: [
        {
          nom: 'BELMER',
          prenom: 'Rodolphe',
          fonction: 'Directeur Général',
          date_nomination: '2022-02-27'
        },
        {
          nom: 'CASAS',
          prenom: 'Didier',
          fonction: 'Secrétaire Général',
          date_nomination: '2020-05-15'
        }
      ]
    };
  } else {
    return {
      dirigeants: [
        {
          nom: 'COURTIN-CLARINS',
          prenom: 'Olivier',
          fonction: 'Président',
          date_nomination: '2018-01-10'
        },
        {
          nom: 'COURTIN-CLARINS',
          prenom: 'Christian',
          fonction: 'Directeur Général',
          date_nomination: '2018-01-10'
        }
      ]
    };
  }
}

function getMockBeneficialOwners(siren) {
  if (siren === '552081317') {
    return {
      beneficiaires: [
        {
          nom: 'ÉTAT FRANÇAIS',
          prenom: '',
          nationalite: 'Française',
          date_de_naissance: '',
          pourcentage_parts: 83.7,
          pourcentage_votes: 83.7
        }
      ]
    };
  } else {
    return {
      beneficiaires: [
        {
          nom: 'COURTIN-CLARINS',
          prenom: 'Olivier',
          nationalite: 'Française',
          date_de_naissance: '1970-10-15',
          pourcentage_parts: 40,
          pourcentage_votes: 40
        },
        {
          nom: 'COURTIN-CLARINS',
          prenom: 'Christian',
          nationalite: 'Française',
          date_de_naissance: '1972-05-22',
          pourcentage_parts: 40,
          pourcentage_votes: 40
        }
      ]
    };
  }
}

// Exporter les fonctions
module.exports = {
  searchCompany,
  getCompanyDetails,
  getCompanyDocuments,
  getFinancialData,
  getCompanyManagement,
  getBeneficialOwners
};

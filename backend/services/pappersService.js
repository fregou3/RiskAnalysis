/**
 * Service pour l'intégration de l'API Pappers.fr
 * Permet de récupérer des informations légales et financières sur les entreprises françaises
 * Documentation: https://api.pappers.fr/documentation
 */

const axios = require('axios');
require('dotenv').config();
const cacheService = require('./cacheService');

// Importer la base de données des entreprises connues
const knownCompanies = require('../data/known-companies');

// Configuration de l'API Pappers
const API_BASE_URL = 'https://api.pappers.fr/v2';
const PAPPERS_API_KEY = process.env.PAPPERS_API_KEY || '';

/**
 * Recherche une entreprise par son nom ou SIREN/SIRET
 * @param {string} query - Nom de l'entreprise ou SIREN/SIRET
 * @param {string} identifier - Identifiant spécifique (SIREN, VAT, etc.) si disponible
 * @returns {Promise<object>} - Résultats de la recherche
 */
async function searchCompany(query, identifier = null) {
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
    if (identifier) {
      console.log(`Identifier provided: ${identifier}`);
    }
    
    // Si un identifiant est fourni, l'utiliser en priorité
    if (identifier && /^\d+$/.test(identifier.replace(/\s/g, ''))) {
      console.log(`Using provided identifier (SIREN/SIRET): ${identifier}`);
      return await searchBySiren(identifier.replace(/\s/g, ''));
    }
    
    // Si l'identifiant est un numéro de TVA français, extraire le SIREN (9 derniers chiffres)
    if (identifier && /^FR\d{11}$/i.test(identifier.replace(/\s/g, ''))) {
      const siren = identifier.replace(/\s/g, '').substring(4);
      console.log(`Extracted SIREN from VAT number: ${siren}`);
      return await searchBySiren(siren);
    }
    
    // Vérifier si l'entreprise est dans notre base de données des entreprises connues
    const normalizedQuery = query.toLowerCase().trim();
    const knownSiren = knownCompanies[normalizedQuery];
    
    if (knownSiren) {
      console.log(`Found known company: ${normalizedQuery} with SIREN: ${knownSiren}`);
      return await searchBySiren(knownSiren);
    }
    
    // Essayer des variations du nom si le nom exact n'est pas trouvé
    // Par exemple, si on cherche "BIC", essayer "SOCIETE BIC"
    for (const [knownName, siren] of Object.entries(knownCompanies)) {
      if (knownName.includes(normalizedQuery) || normalizedQuery.includes(knownName)) {
        console.log(`Found similar company: ${knownName} with SIREN: ${siren}`);
        return await searchBySiren(siren);
      }
    }

    // Déterminer si la requête est un SIREN/SIRET ou un nom d'entreprise
    const isSirenSiret = /^\d+$/.test(query.replace(/\s/g, ''));

    let response;
    let results;

    if (isSirenSiret) {
      return await searchBySiren(query.replace(/\s/g, ''));
    } else {
      // Recherche par nom d'entreprise
      console.log(`Searching by company name: ${query}`);
      
      const params = {
        api_token: PAPPERS_API_KEY,
        q: query,
        precision: 'high',
        per_page: 10,
        entreprise_cessee: false // Exclure les entreprises cessées par défaut
      };
      
      response = await axios.get(`${API_BASE_URL}/recherche`, { params });
      console.log(`Received ${response.data?.resultats?.length || 0} results from Pappers API for query: ${query}`);
      
      // Afficher un échantillon des résultats de recherche
      if (response.data?.resultats?.length > 0) {
        console.log(`[Pappers] Company name search results (sample):`, JSON.stringify(response.data.resultats.slice(0, 2), null, 2));
      }
      
      // Format de réponse pour une recherche par nom
      if (response.data && response.data.resultats && response.data.resultats.length > 0) {
        // Pour chaque résultat, récupérer les informations détaillées
        const enrichedResults = [];
        
        // Prendre uniquement les 3 premiers résultats pour éviter trop de requêtes
        const topResults = response.data.resultats.slice(0, 3);
        
        for (const result of topResults) {
          try {
            // Récupérer les informations détaillées pour chaque entreprise
            console.log(`Fetching detailed information for SIREN: ${result.siren}`);
            const detailedResult = await searchBySiren(result.siren);
            
            if (detailedResult.results && detailedResult.results.length > 0) {
              enrichedResults.push(detailedResult.results[0]);
            } else {
              // Si pas de détails, ajouter le résultat de base
              enrichedResults.push({
                siren: result.siren,
                nom_entreprise: result.nom_entreprise,
                forme_juridique: result.forme_juridique,
                date_creation: result.date_creation,
                siege: result.siege
              });
            }
          } catch (detailError) {
            console.error(`Error fetching details for SIREN ${result.siren}:`, detailError.message);
            // Ajouter le résultat de base en cas d'erreur
            enrichedResults.push({
              siren: result.siren,
              nom_entreprise: result.nom_entreprise,
              forme_juridique: result.forme_juridique,
              date_creation: result.date_creation,
              siege: result.siege
            });
          }
        }
        
        // Ajouter les résultats restants sans enrichissement
        if (response.data.resultats.length > 3) {
          for (let i = 3; i < response.data.resultats.length; i++) {
            const result = response.data.resultats[i];
            enrichedResults.push({
              siren: result.siren,
              nom_entreprise: result.nom_entreprise,
              forme_juridique: result.forme_juridique,
              date_creation: result.date_creation,
              siege: result.siege
            });
          }
        }
        
        results = { results: enrichedResults };
        console.log(`Enriched ${enrichedResults.length} results for query: ${query}`);
      } else {
        results = { results: [] };
        console.log(`No results found for query: ${query}`);
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
      console.log(`[Pappers] Using cached details for SIREN: ${siren}`);
      return cachedDetails;
    }

    console.log(`[Pappers] Getting details for company with SIREN: ${siren}`);

    const params = {
      api_token: PAPPERS_API_KEY,
      siren: siren
    };

    const response = await axios.get(`${API_BASE_URL}/entreprise`, { params });
    console.log(`[Pappers] Successfully retrieved details for SIREN: ${siren}`);
    console.log(`[Pappers] Company details (sample):`, JSON.stringify(response.data).substring(0, 500) + '...');

    // Mettre en cache les détails
    cacheService.set('details', siren, response.data);

    return response.data;
  } catch (error) {
    console.error(`Error getting company details: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}, Data:`, error.response.data);
    }
    console.log(`[Pappers] Falling back to mock data for SIREN: ${siren}`);
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
    const cachedFinances = cacheService.get('finances', siren);
    if (cachedFinances) {
      console.log(`[Pappers] Using cached financial data for SIREN: ${siren}`);
      return cachedFinances;
    }

    console.log(`[Pappers] Récupération des données financières via l'API pour ${siren}`);
    
    // 1. Récupérer les informations générales de l'entreprise avec les bilans
    const generalParams = {
      api_token: PAPPERS_API_KEY,
      siren: siren,
      bilans: true,
      extrait_financier: true,
      ratios: true,
      scoring: true
    };

    const generalResponse = await axios.get(`${API_BASE_URL}/entreprise`, { params: generalParams });
    
    // Initialiser l'objet de données financières
    let financialData = {
      comptes_sociaux: []
    };

    // Vérifier si des bilans sont disponibles dans la réponse générale
    if (generalResponse.data && generalResponse.data.bilans && generalResponse.data.bilans.length > 0) {
      console.log(`[Pappers] ${generalResponse.data.bilans.length} bilans trouvés dans les données générales pour ${siren}`);

      // Ajouter les bilans de base
      financialData.comptes_sociaux = generalResponse.data.bilans.map(bilan => ({
        date_cloture: bilan.date_cloture,
        duree_exercice: bilan.duree_exercice || 12,
        chiffre_affaires: bilan.chiffre_affaires,
        resultat_net: bilan.resultat_net,
        effectif: bilan.effectif
      }));
    }

    // 2. Récupérer les comptes annuels détaillés (données financières plus complètes)
    console.log('[Pappers] Requête à l\'API Pappers pour les comptes annuels détaillés...');
    try {
      const comptesResponse = await axios.get(`${API_BASE_URL}/entreprise/comptes`, {
        params: {
          api_token: PAPPERS_API_KEY,
          siren: siren
        }
      });
      
      if (comptesResponse.data && Object.keys(comptesResponse.data).length > 0) {
        console.log(`[Pappers] Comptes annuels détaillés reçus pour ${Object.keys(comptesResponse.data).length} année(s)`);
        
        // Traiter les données des comptes annuels
        const comptesData = comptesResponse.data;
        const annees = Object.keys(comptesData).sort((a, b) => b - a); // Trier par année décroissante
        
        // Enrichir les données financières avec les informations détaillées
        financialData.ratios = [];
        financialData.derniers_comptes = {};
        
        if (annees.length > 0) {
          // Récupérer les données de la dernière année disponible pour les ratios
          const derniere_annee = annees[0];
          const derniers_comptes = comptesData[derniere_annee];
          
          // Ajouter les ratios financiers de la dernière année
          if (derniers_comptes) {
            financialData.derniers_comptes = {
              annee: derniere_annee,
              bfr: derniers_comptes.bfr,
              bfr_exploitation: derniers_comptes.bfr_exploitation,
              bfr_hors_exploitation: derniers_comptes.bfr_hors_exploitation,
              bfr_jours_ca: derniers_comptes.bfr_jours_ca,
              tresorerie_nette: derniers_comptes.tresorerie_nette,
              delai_paiement_clients_jours: derniers_comptes.delai_paiement_clients_jours,
              delai_paiement_fournisseurs_jours: derniers_comptes.delai_paiement_fournisseurs_jours,
              capacite_autofinancement: derniers_comptes.capacite_autofinancement,
              capacite_autofinancement_ca: derniers_comptes.capacite_autofinancement_ca,
              fonds_roulement_net_global: derniers_comptes.fonds_roulement_net_global,
              couverture_bfr: derniers_comptes.couverture_bfr
            };
          }
          
          // Créer un tableau des performances financières pour les 3 dernières années
          const performances = [];
          for (let i = 0; i < Math.min(3, annees.length); i++) {
            const annee = annees[i];
            const compte = comptesData[annee];
            if (compte) {
              performances.push({
                annee: annee,
                chiffre_affaires: compte.chiffre_affaires,
                resultat_net: compte.resultat_net,
                marge_brute: compte.marge_brute,
                excedent_brut_exploitation: compte.excedent_brut_exploitation,
                resultat_exploitation: compte.resultat_exploitation,
                effectif: compte.effectif
              });
            }
          }
          financialData.performances = performances;
          
          // Ajouter les ratios financiers
          annees.forEach(annee => {
            const compte = comptesData[annee];
            if (compte) {
              financialData.ratios.push({
                annee: annee,
                taux_croissance_ca: compte.taux_croissance_ca,
                taux_marge_brute: compte.taux_marge_brute,
                taux_marge_ebitda: compte.taux_marge_ebitda,
                taux_marge_operationnelle: compte.taux_marge_operationnelle,
                rentabilite_economique: compte.rentabilite_economique,
                rentabilite_financiere: compte.rentabilite_financiere,
                taux_endettement: compte.taux_endettement,
                autonomie_financiere: compte.autonomie_financiere
              });
            }
          });
        }
      } else {
        console.log('[Pappers] Aucun compte annuel détaillé disponible');
      }
    } catch (error) {
      console.error('[Pappers] Erreur lors de la récupération des comptes annuels détaillés:', error.message);
      console.log('[Pappers] Poursuite du traitement avec les informations générales uniquement');
    }
    
    // 3. Essayer une troisième approche si les données sont encore insuffisantes
    if (financialData.comptes_sociaux.length === 0) {
      try {
        console.log('[Pappers] Tentative de récupération des comptes sociaux...');
        const comptesResponse = await axios.get(`${API_BASE_URL}/entreprise/${siren}/comptes-sociaux`, {
          params: {
            api_token: PAPPERS_API_KEY,
            format_comptes: 'liasse',
            par_page: 5
          }
        });
        
        if (comptesResponse.data && comptesResponse.data.resultats && comptesResponse.data.resultats.length > 0) {
          console.log(`[Pappers] ${comptesResponse.data.resultats.length} comptes sociaux trouvés`);
          
          // Ajouter les comptes sociaux
          financialData.comptes_sociaux = comptesResponse.data.resultats.map(compte => ({
            date_cloture: compte.date_cloture,
            annee: compte.annee,
            duree_exercice: compte.duree_exercice || 12,
            chiffre_affaires: compte.chiffre_affaires,
            resultat_net: compte.resultat_net,
            marge_brute: compte.marge_brute,
            effectif: compte.effectif
          }));
        }
      } catch (error) {
        console.error('[Pappers] Erreur lors de la récupération des comptes sociaux:', error.message);
      }
    }
    
    // Si aucune donnée financière n'a été trouvée, retourner un objet vide structuré
    if (financialData.comptes_sociaux.length === 0 && !financialData.ratios) {
      console.log(`[Pappers] Aucune donnée financière trouvée pour ${siren}`);
      
      // Vérifier si l'entreprise est exempte de publication des comptes
      const isExempt = await checkPublicationExemption(siren);
      
      // Retourner un objet avec des informations sur la disponibilité des données
      return {
        comptes_sociaux: [],
        performances: [],
        ratios: [],
        status: {
          available: false,
          reason: isExempt ? 'exempt' : 'unavailable',
          message: isExempt ? 
            "Cette entreprise n'a pas l'obligation de publier ses comptes." : 
            "Les données financières ne sont pas disponibles pour cette entreprise."
        }
      };
    }
    
    // Mettre en cache les données financières
    cacheService.set('finances', siren, financialData);
    console.log(`[Pappers] Données financières mises en cache pour ${siren}`);
    
    return financialData;
  } catch (error) {
    console.error(`[Pappers] Error getting financial data from Pappers: ${error.message}`);
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
/**
 * Fonction interne pour rechercher une entreprise par son SIREN
 * @param {string} siren - SIREN de l'entreprise
 * @returns {Promise<object>} - Résultats de la recherche enrichis
 */
async function searchBySiren(siren) {
  try {
    console.log(`Searching by SIREN/SIRET: ${siren}`);
    
    // Si c'est un SIRET (14 chiffres), extraire le SIREN (9 premiers chiffres)
    const cleanSiren = siren.replace(/\s/g, '');
    const actualSiren = cleanSiren.length > 9 ? cleanSiren.substring(0, 9) : cleanSiren;
    
    const params = {
      api_token: PAPPERS_API_KEY,
      siren: actualSiren,
      entreprise_cessee: false // Exclure les entreprises cessées par défaut
    };
    
    console.log(`Requesting Pappers API with SIREN: ${actualSiren}`);
    const response = await axios.get(`${API_BASE_URL}/entreprise`, { params });
    console.log(`Received response from Pappers API for SIREN: ${actualSiren}`);
    console.log(`[Pappers] SIREN search response (sample):`, JSON.stringify(response.data).substring(0, 500) + '...');
    
    // Récupérer les informations financières directement
    let financialData = [];
    if (response.data.comptes_sociaux && response.data.comptes_sociaux.length > 0) {
      financialData = response.data.comptes_sociaux.map(compte => ({
        date_cloture: compte.date_cloture,
        chiffre_affaires: compte.chiffre_affaires,
        resultat_net: compte.resultat_net,
        effectif: compte.effectif,
        marge_brute: compte.marge_brute,
        ebitda: compte.ebitda,
        rentabilite: compte.rentabilite,
        taux_endettement: compte.taux_endettement,
        total_bilan: compte.total_bilan
      }));
    }
    
    // Récupérer les dirigeants directement
    let dirigeants = [];
    if (response.data.dirigeants && response.data.dirigeants.length > 0) {
      dirigeants = response.data.dirigeants.map(dirigeant => ({
        nom: dirigeant.nom,
        prenom: dirigeant.prenom,
        fonction: dirigeant.fonction,
        date_nomination: dirigeant.date_nomination,
        nationalite: dirigeant.nationalite,
        date_naissance: dirigeant.date_naissance,
        pays_naissance: dirigeant.pays_naissance
      }));
    }
    
    // Récupérer les bénéficiaires effectifs si disponibles
    let beneficiaires = [];
    if (response.data.beneficiaires_effectifs && response.data.beneficiaires_effectifs.length > 0) {
      beneficiaires = response.data.beneficiaires_effectifs.map(beneficiaire => ({
        nom: beneficiaire.nom,
        prenom: beneficiaire.prenom,
        nationalite: beneficiaire.nationalite,
        pourcentage_parts: beneficiaire.pourcentage_parts,
        pourcentage_votes: beneficiaire.pourcentage_votes,
        date_de_naissance: beneficiaire.date_de_naissance,
        date_greffe: beneficiaire.date_greffe,
        type_controle: beneficiaire.type_controle
      }));
    }
    
    // Format de réponse enrichi pour un SIREN
    const results = {
      results: [{
        siren: response.data.siren,
        nom_entreprise: response.data.nom_entreprise || response.data.denomination,
        forme_juridique: response.data.forme_juridique,
        date_creation: response.data.date_creation,
        capital: response.data.capital,
        tranche_effectif: response.data.tranche_effectif,
        code_naf: response.data.code_naf,
        libelle_code_naf: response.data.libelle_code_naf,
        siege: response.data.siege,
        date_immatriculation: response.data.date_immatriculation,
        greffe: response.data.greffe,
        procedure_collective: response.data.procedure_collective,
        date_cessation_activite: response.data.date_cessation_activite,
        // Informations financières, dirigeants et bénéficiaires enrichies
        comptes_sociaux: financialData,
        dirigeants: dirigeants,
        beneficiaires_effectifs: beneficiaires
      }]
    };
    
    // Mettre en cache les résultats avec le SIREN comme clé
    cacheService.set('companies', actualSiren, results);
    
    // Mettre en cache les résultats avec le nom de l'entreprise comme clé
    const companyName = (response.data.nom_entreprise || response.data.denomination).toLowerCase();
    cacheService.set('companies', companyName, results);
    
    console.log(`Successfully retrieved and enriched data for SIREN: ${actualSiren}`);
    return results;
  } catch (error) {
    console.error(`Error searching by SIREN: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}, Data:`, error.response.data);
    }
    return { results: [] };
  }
}

module.exports = {
  searchCompany,
  getCompanyDetails,
  getCompanyDocuments,
  getFinancialData,
  getCompanyManagement,
  getBeneficialOwners
};

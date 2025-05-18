/**
 * Script pour collecter les données Pappers et les intégrer dans la section recherche internet
 * Basé sur le modèle du script Claude
 */

const axios = require('axios');
require('dotenv').config({ path: require('path').resolve(__dirname, '../backend/.env') });
const fs = require('fs');
const path = require('path');

// Configuration
const PAPPERS_API_KEY = process.env.PAPPERS_API_KEY;
const BASE_URL = "https://api.pappers.fr/v2";

// En-têtes avec l'authentification
const headers = {
  "api-key": PAPPERS_API_KEY
};

// Fonctions utilitaires pour le formatage
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined) return 'N/A';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatPercentage(value) {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2
  }).format(value / 100);
}

function formatNumber(value) {
  if (value === null || value === undefined) return 'N/A';
  return new Intl.NumberFormat('fr-FR').format(value);
}

/**
 * Fonction principale pour collecter les données d'une entreprise
 * @param {string} query - Le SIREN ou nom de l'entreprise
 * @param {string} [identifier] - Identifiant spécifique (SIREN, VAT, etc.) si disponible
 * @returns {Promise<object>} - Les données collectées
 */
async function collectCompanyData(query, identifier = null) {
  console.log(`🔍 Collecte des données pour: ${query}${identifier ? ` (identifiant: ${identifier})` : ''}`);
  
  try {
    // Déterminer le SIREN à utiliser
    let siren = null;
    
    // Si l'identifiant est fourni et est un SIREN/SIRET (numérique), l'utiliser directement
    if (identifier && /^\d+$/.test(identifier.replace(/\s/g, ''))) {
      siren = identifier.replace(/\s/g, '');
      console.log(`Utilisation de l'identifiant numérique fourni: ${siren}`);
    }
    // Si l'identifiant est un numéro de TVA français, extraire le SIREN
    else if (identifier && /^FR\d{11}$/i.test(identifier.replace(/\s/g, ''))) {
      siren = identifier.replace(/\s/g, '').substring(4, 13);
      console.log(`SIREN extrait du numéro de TVA: ${siren}`);
    }
    // Si la requête elle-même est un SIREN (9 chiffres), l'utiliser directement
    else if (/^\d{9}$/.test(query.replace(/\s/g, ''))) {
      siren = query.replace(/\s/g, '');
      console.log(`La requête est un SIREN valide: ${siren}`);
    }
    // Si la requête est un SIRET (14 chiffres), extraire le SIREN (9 premiers chiffres)
    else if (/^\d{14}$/.test(query.replace(/\s/g, ''))) {
      siren = query.replace(/\s/g, '').substring(0, 9);
      console.log(`SIREN extrait du SIRET fourni: ${siren}`);
    }
    
    // Si un SIREN a été identifié, l'utiliser directement
    if (siren) {
      return await getCompanyData(siren);
    }
    
    // Sinon, rechercher l'entreprise par son nom
    console.log(`Recherche de l'entreprise par nom: ${query}`);
    const searchResult = await searchCompany(query);
    
    if (!searchResult || !searchResult.resultats || searchResult.resultats.length === 0) {
      console.log(`Aucun résultat trouvé pour la recherche: ${query}`);
      return null;
    }
    
    // Utiliser le premier résultat de recherche
    const firstResult = searchResult.resultats[0];
    console.log(`Entreprise trouvée: ${firstResult.nom_entreprise} (SIREN: ${firstResult.siren})`);
    
    // Récupérer les données complètes avec le SIREN
    return await getCompanyData(firstResult.siren);
    
  } catch (error) {
    console.error("❌ Erreur lors de la collecte des données:", error.message);
    if (error.response) {
      console.error("Détails de l'erreur HTTP:", {
        status: error.response.status,
        statusText: error.response.statusText
      });
    }
    return null;
  }
}

/**
 * Recherche une entreprise par son nom
 * @param {string} name - Nom de l'entreprise
 * @returns {Promise<object>} - Résultats de la recherche
 */
async function searchCompany(name) {
  try {
    console.log(`Recherche de l'entreprise: ${name}`);
    const response = await axios.get(`${BASE_URL}/recherche-entreprises`, {
      headers: headers,
      params: {
        q: name,
        par_page: 5,
        precision: 'high'
      }
    });
    
    console.log(`${response.data.resultats?.length || 0} résultats trouvés pour la recherche: ${name}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Erreur lors de la recherche de l'entreprise: ${error.message}`);
    return null;
  }
}

/**
 * Récupère les données complètes d'une entreprise selon le modèle du script Claude
 * @param {string} siren - Le numéro SIREN de l'entreprise
 * @returns {Promise<object>} - Données collectées
 */
async function getCompanyData(siren) {
  try {
    console.log(`Récupération des informations générales pour le SIREN: ${siren}`);
    
    // Faire un seul appel API pour récupérer les données de base avec les informations financières
    const response = await axios.get(`${BASE_URL}/entreprise`, {
      headers: headers,
      params: { 
        siren: siren,
        extrait_financier: true,  // Inclure l'extrait financier
        bilans: true,             // Inclure les bilans
        dirigeants: true,         // Inclure les dirigeants
        beneficiaires_effectifs: true  // Inclure les bénéficiaires effectifs
      }
    });
    
    console.log("✅ Informations récupérées avec succès");
    
    // Créer un rapport structuré comme dans le script de Claude
    const companyData = response.data;
    
    // Créer un rapport formaté pour l'affichage
    const formattedData = {
      // Informations générales
      nom_entreprise: companyData.nom_entreprise,
      siren: companyData.siren,
      siren_formate: companyData.siren_formate,
      forme_juridique: companyData.forme_juridique,
      date_creation: companyData.date_creation,
      date_creation_formate: companyData.date_creation_formate,
      entreprise_cessee: companyData.entreprise_cessee,
      date_cessation: companyData.date_cessation,
      capital: companyData.capital,
      
      // Activité
      code_naf: companyData.code_naf,
      libelle_code_naf: companyData.libelle_code_naf,
      domaine_activite: companyData.domaine_activite,
      
      // Effectif
      effectif: companyData.effectif,
      effectif_min: companyData.effectif_min,
      effectif_max: companyData.effectif_max,
      tranche_effectif: companyData.tranche_effectif,
      annee_effectif: companyData.annee_effectif,
      
      // Siège social
      siege: companyData.siege ? {
        siret: companyData.siege.siret,
        adresse_ligne_1: companyData.siege.adresse_ligne_1,
        adresse_ligne_2: companyData.siege.adresse_ligne_2,
        code_postal: companyData.siege.code_postal,
        ville: companyData.siege.ville,
        pays: companyData.siege.pays
      } : {},
      
      // Finances
      finances: []
    };
    
    // Ajouter les informations financières si disponibles
    // Vérifier d'abord si la propriété finances existe directement (comme dans le script Claude)
    if (companyData.finances) {
      formattedData.finances = companyData.finances.map(finance => ({
        annee: finance.annee,
        chiffre_affaires: finance.chiffre_affaires,
        resultat: finance.resultat,
        effectif: finance.effectif,
        marge_brute: finance.marge_brute,
        excedent_brut_exploitation: finance.excedent_brut_exploitation,
        resultat_exploitation: finance.resultat_exploitation,
        taux_marge_brute: finance.taux_marge_brute,
        taux_marge_EBITDA: finance.taux_marge_EBITDA,
        taux_marge_operationnelle: finance.taux_marge_operationnelle,
        BFR: finance.BFR,
        capacite_autofinancement: finance.capacite_autofinancement,
        fonds_roulement_net_global: finance.fonds_roulement_net_global,
        ratio_endettement: finance.ratio_endettement,
        autonomie_financiere: finance.autonomie_financiere,
        taux_levier: finance.taux_levier
      }));
    }
    // Sinon, essayer avec extrait_financier.bilans
    else if (companyData.extrait_financier && companyData.extrait_financier.bilans) {
      formattedData.finances = companyData.extrait_financier.bilans.map(bilan => ({
        annee: bilan.date_cloture_exercice ? bilan.date_cloture_exercice.substring(0, 4) : null,
        chiffre_affaires: bilan.chiffre_affaires,
        resultat: bilan.resultat_net,
        effectif: bilan.effectif,
        marge_brute: bilan.marge_brute,
        excedent_brut_exploitation: bilan.excedent_brut_exploitation,
        resultat_exploitation: bilan.resultat_exploitation,
        taux_marge_brute: bilan.taux_marge_brute,
        taux_marge_EBITDA: bilan.taux_marge_ebitda,
        taux_marge_operationnelle: bilan.taux_marge_operationnelle,
        BFR: bilan.bfr,
        capacite_autofinancement: bilan.capacite_autofinancement,
        fonds_roulement_net_global: bilan.fonds_roulement_net_global,
        ratio_endettement: bilan.taux_endettement,
        autonomie_financiere: bilan.autonomie_financiere,
        taux_levier: bilan.taux_levier
      }));
    }
    
    // Ajouter les dirigeants si disponibles
    if (companyData.dirigeants && companyData.dirigeants.length > 0) {
      formattedData.dirigeants = companyData.dirigeants.map(dirigeant => ({
        nom: dirigeant.nom,
        prenom: dirigeant.prenom,
        fonction: dirigeant.fonction,
        date_naissance: dirigeant.date_naissance,
        date_naissance_formate: dirigeant.date_naissance ? formatDate(dirigeant.date_naissance) : null
      }));
    } else {
      formattedData.dirigeants = [];
    }
    
    // Ajouter les bénéficiaires effectifs si disponibles
    if (companyData.beneficiaires_effectifs && companyData.beneficiaires_effectifs.length > 0) {
      formattedData.beneficiaires = companyData.beneficiaires_effectifs.map(beneficiaire => ({
        nom: beneficiaire.nom,
        prenom: beneficiaire.prenom,
        date_naissance_formate: beneficiaire.date_naissance_complete_formate,
        pourcentage_parts: beneficiaire.pourcentage_parts,
        pourcentage_votes: beneficiaire.pourcentage_votes
      }));
    } else {
      formattedData.beneficiaires = [];
    }
    
    // Créer un rapport textuel pour l'affichage dans la console
    console.log("\n=== RAPPORT D'ENTREPRISE ===");
    console.log(`Nom: ${formattedData.nom_entreprise}\tSIREN: ${formattedData.siren_formate}`);
    console.log(`Forme juridique: ${formattedData.forme_juridique}\tCréation: ${formatDate(formattedData.date_creation)}`);
    console.log(`Activité: ${formattedData.libelle_code_naf} (${formattedData.code_naf})`);
    console.log(`Effectif: ${formattedData.effectif || 'Non disponible'}`);
    
    if (formattedData.siege && formattedData.siege.adresse_ligne_1) {
      console.log("\n=== ADRESSE DU SIÈGE ===");
      console.log(`${formattedData.siege.adresse_ligne_1}${formattedData.siege.adresse_ligne_2 ? ', ' + formattedData.siege.adresse_ligne_2 : ''}`);
      console.log(`${formattedData.siege.code_postal} ${formattedData.siege.ville}, ${formattedData.siege.pays}`);
    }
    
    if (formattedData.finances && formattedData.finances.length > 0) {
      console.log("\n=== INFORMATIONS FINANCIÈRES ===");
      console.log("Année\tChiffre d'affaires\tRésultat net\tEffectif");
      formattedData.finances.forEach(finance => {
        console.log(`${finance.annee}\t${formatCurrency(finance.chiffre_affaires)}\t${formatCurrency(finance.resultat)}\t${finance.effectif || 'N/A'}`);
      });
    }
    
    if (formattedData.dirigeants && formattedData.dirigeants.length > 0) {
      console.log("\n=== DIRIGEANTS ===");
      formattedData.dirigeants.forEach(dirigeant => {
        console.log(`${dirigeant.prenom} ${dirigeant.nom} - ${dirigeant.fonction}`);
      });
    }
    
    return formattedData;
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération des données de l'entreprise: ${error.message}`);
    if (error.response) {
      console.error("Détails de l'erreur HTTP:", {
        status: error.response.status,
        statusText: error.response.statusText
      });
    }
    return null;
  }
}

/**
 * Formate les données de l'entreprise pour l'affichage
 * @param {object} data - Données de l'entreprise déjà formatées
 * @returns {object} - Données formatées pour l'API
 */
function formatCompanyData(data) {
  // Si les données sont déjà formatées, les retourner directement
  return data;
}

// Exporter les fonctions pour utilisation externe
module.exports = {
  collectCompanyData
};

// Si le script est exécuté directement
if (require.main === module) {
  // Récupérer les arguments de la ligne de commande
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error("❌ Veuillez fournir un SIREN ou un nom d'entreprise en argument.");
    process.exit(1);
  }
  
  const query = args[0];
  const identifier = args.length > 1 ? args[1] : null;
  
  // Collecter les données
  collectCompanyData(query, identifier)
    .then(data => {
      if (data) {
        console.log("✅ Données collectées avec succès:");
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.error("❌ Aucune donnée n'a pu être collectée.");
      }
    })
    .catch(error => {
      console.error("❌ Erreur lors de l'exécution du script:", error.message);
    });
}

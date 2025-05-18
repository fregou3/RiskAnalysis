const axios = require('axios');
const fs = require('fs');

// Configuration
const API_KEY = "98240d16d5910db24c0a19c8e9a9153e35a1257451aa50f3"; // Remplacez par votre clé API réelle
const BASE_URL = "https://api.pappers.fr/v2";

// En-têtes avec l'authentification
const headers = {
  "api-key": API_KEY
};

/**
 * Fonction principale pour extraire les informations minimales d'une entreprise
 * @param {string} siren - Le numéro SIREN de l'entreprise (9 chiffres)
 */
async function extractMinimalCompanyInfo(siren) {
  // Validation du SIREN
  if (!siren || !/^\d{9}$/.test(siren)) {
    console.error("❌ SIREN invalide. Veuillez fournir un SIREN à 9 chiffres.");
    return;
  }

  console.log(`🔍 Extraction des informations minimales pour le SIREN: ${siren}`);
  
  try {
    // Récupération des informations de base et financières de l'entreprise (1 seul appel API)
    const companyData = await getCompanyBaseAndFinancialInfo(siren);
    if (!companyData) return;
    
    // Création du rapport optimisé
    const report = createMinimalReport(companyData);
    
    // Sauvegarde des données
    saveReportToFiles(siren, report, companyData);
    
    console.log(`\n✅ Extraction terminée pour ${companyData.nom_entreprise || siren}`);
    
  } catch (error) {
    console.error("❌ Erreur lors de l'extraction des données:", error.message);
    if (error.response) {
      console.error("Détails de l'erreur HTTP:", {
        status: error.response.status,
        statusText: error.response.statusText
      });
    }
  }
}

/**
 * Récupère les informations de base et financières de l'entreprise en un seul appel API
 * @param {string} siren - Le numéro SIREN de l'entreprise
 */
async function getCompanyBaseAndFinancialInfo(siren) {
  try {
    console.log("Récupération des informations générales et financières...");
    const response = await axios.get(`${BASE_URL}/entreprise`, {
      headers: headers,
      params: { 
        siren: siren
        // Pas de champs supplémentaires pour économiser les crédits
      }
    });
    
    console.log("✅ Informations récupérées avec succès");
    return response.data;
  } catch (error) {
    console.error("❌ Échec de la récupération des informations:");
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      
      if (error.response.status === 404) {
        console.error(`   Le SIREN ${siren} n'existe pas ou n'est pas disponible.`);
      } else if (error.response.status === 401) {
        console.error("   Clé API invalide. Veuillez vérifier votre clé API.");
      }
    } else {
      console.error(`   Erreur: ${error.message}`);
    }
    
    return null;
  }
}

/**
 * Crée un rapport minimal sur l'entreprise avec uniquement les informations essentielles
 * @param {Object} companyData - Données de base et financières de l'entreprise
 */
function createMinimalReport(companyData) {
  if (!companyData) return null;
  
  const report = {
    informations_generales: {
      nom_entreprise: companyData.nom_entreprise,
      siren: companyData.siren,
      siren_formate: companyData.siren_formate,
      forme_juridique: companyData.forme_juridique,
      date_creation: companyData.date_creation,
      date_creation_formate: companyData.date_creation_formate,
      entreprise_cessee: companyData.entreprise_cessee,
      date_cessation: companyData.date_cessation,
      capital: companyData.capital,
      activite: {
        code_naf: companyData.code_naf,
        libelle_code_naf: companyData.libelle_code_naf,
        domaine_activite: companyData.domaine_activite
      },
      effectif: companyData.effectif,
      effectif_min: companyData.effectif_min,
      effectif_max: companyData.effectif_max,
      tranche_effectif: companyData.tranche_effectif,
      annee_effectif: companyData.annee_effectif
    },
    siege_social: companyData.siege ? {
      siret: companyData.siege.siret,
      adresse_ligne_1: companyData.siege.adresse_ligne_1,
      adresse_ligne_2: companyData.siege.adresse_ligne_2,
      code_postal: companyData.siege.code_postal,
      ville: companyData.siege.ville,
      pays: companyData.siege.pays
    } : {},
    informations_financieres: companyData.finances ? companyData.finances.map(finance => ({
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
    })) : []
  };
  
  return report;
}

/**
 * Sauvegarde les données dans des fichiers
 * @param {string} siren - Le numéro SIREN de l'entreprise
 * @param {Object} report - Rapport consolidé
 * @param {Object} companyData - Données brutes de l'entreprise
 */
function saveReportToFiles(siren, report, companyData) {
  if (!report) return;
  
  // Création du dossier pour les données
  const directory = `./data_${siren}`;
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
  
  const companyName = companyData.nom_entreprise || siren;
  console.log(`\nSauvegarde des données pour ${companyName}...`);
  
  // Sauvegarde du rapport au format JSON
  fs.writeFileSync(
    `${directory}/rapport_${siren}.json`, 
    JSON.stringify(report, null, 2)
  );
  
  // Sauvegarde des données brutes (optionnel, vous pouvez commenter cette partie)
  fs.writeFileSync(
    `${directory}/donnees_brutes_${siren}.json`, 
    JSON.stringify(companyData, null, 2)
  );
  
  // Création d'un rapport textuel pour une lecture facile
  const textReport = createTextReport(report, companyName);
  fs.writeFileSync(
    `${directory}/rapport_${siren}.txt`, 
    textReport
  );
  
  console.log(`✅ Données sauvegardées dans le dossier: ${directory}`);
}

/**
 * Crée un rapport textuel à partir des données consolidées
 * @param {Object} report - Rapport consolidé
 * @param {string} companyName - Nom de l'entreprise
 */
function createTextReport(report, companyName) {
  let text = `RAPPORT MINIMAL : ${companyName}\n`;
  text += `=======================================================================\n\n`;
  
  // Informations générales
  text += `INFORMATIONS GÉNÉRALES\n`;
  text += `-----------------------------------------------------------------------\n`;
  const info = report.informations_generales;
  text += `Nom de l'entreprise: ${info.nom_entreprise}\n`;
  text += `SIREN: ${info.siren_formate || info.siren}\n`;
  text += `Forme juridique: ${info.forme_juridique}\n`;
  text += `Date de création: ${info.date_creation_formate || formatDate(info.date_creation)}\n`;
  text += `Activité: ${info.activite.libelle_code_naf} (${info.activite.code_naf})\n`;
  text += `Domaine d'activité: ${info.activite.domaine_activite || 'Non disponible'}\n`;
  text += `Capital: ${formatCurrency(info.capital)}\n`;
  text += `Effectif: ${info.effectif || (info.effectif_min && info.effectif_max ? `Entre ${info.effectif_min} et ${info.effectif_max}` : 'Non disponible')}\n`;
  text += `Statut: ${info.entreprise_cessee ? 'Entreprise cessée' : 'En activité'}\n`;
  
  if (info.entreprise_cessee && info.date_cessation) {
    text += `Date de cessation: ${formatDate(info.date_cessation)}\n`;
  }
  
  // Siège social
  if (report.siege_social && report.siege_social.adresse_ligne_1) {
    text += `\nSIÈGE SOCIAL\n`;
    text += `-----------------------------------------------------------------------\n`;
    const siege = report.siege_social;
    text += `SIRET: ${siege.siret}\n`;
    text += `Adresse: ${siege.adresse_ligne_1}\n`;
    if (siege.adresse_ligne_2) text += `        ${siege.adresse_ligne_2}\n`;
    text += `        ${siege.code_postal} ${siege.ville}\n`;
    text += `        ${siege.pays}\n`;
  }
  
  // Informations financières
  text += `\nINFORMATIONS FINANCIÈRES\n`;
  text += `-----------------------------------------------------------------------\n`;
  
  if (report.informations_financieres && report.informations_financieres.length > 0) {
    // Trier les données financières par année (du plus récent au plus ancien)
    const sortedFinances = [...report.informations_financieres].sort((a, b) => b.annee - a.annee);
    
    sortedFinances.forEach(finance => {
      text += `Année: ${finance.annee}\n`;
      
      // Données financières principales
      const mainFinancials = [
        { label: "Chiffre d'affaires", value: formatCurrency(finance.chiffre_affaires) },
        { label: "Résultat", value: formatCurrency(finance.resultat) },
        { label: "Effectif", value: finance.effectif || "Non disponible" }
      ];
      
      mainFinancials.forEach(item => {
        if (item.value !== "Non disponible") {
          text += `${item.label}: ${item.value}\n`;
        }
      });
      
      // Ratios financiers (uniquement s'ils sont disponibles)
      text += `\nRatios financiers:\n`;
      
      const financialRatios = [
        { label: "Marge brute", value: formatCurrency(finance.marge_brute) },
        { label: "Excédent brut d'exploitation", value: formatCurrency(finance.excedent_brut_exploitation) },
        { label: "Résultat d'exploitation", value: formatCurrency(finance.resultat_exploitation) },
        { label: "Taux de marge brute", value: formatPercentage(finance.taux_marge_brute) },
        { label: "Taux de marge EBITDA", value: formatPercentage(finance.taux_marge_EBITDA) },
        { label: "Taux de marge opérationnelle", value: formatPercentage(finance.taux_marge_operationnelle) },
        { label: "BFR", value: formatCurrency(finance.BFR) },
        { label: "Capacité d'autofinancement", value: formatCurrency(finance.capacite_autofinancement) },
        { label: "Fonds de roulement", value: formatCurrency(finance.fonds_roulement_net_global) },
        { label: "Ratio d'endettement", value: formatNumber(finance.ratio_endettement) },
        { label: "Autonomie financière", value: formatPercentage(finance.autonomie_financiere) },
        { label: "Taux de levier", value: formatNumber(finance.taux_levier) }
      ];
      
      // Ne montrer que les ratios disponibles
      let ratiosShown = false;
      financialRatios.forEach(ratio => {
        if (ratio.value !== "Non disponible") {
          text += `- ${ratio.label}: ${ratio.value}\n`;
          ratiosShown = true;
        }
      });
      
      if (!ratiosShown) {
        text += "- Aucun ratio financier disponible\n";
      }
      
      text += `\n`;
    });
  } else {
    text += `Aucune information financière disponible.\n\n`;
  }
  
  text += `=======================================================================\n`;
  text += `Rapport généré le ${new Date().toLocaleString()}\n`;
  text += `Ce rapport utilise uniquement les données disponibles gratuitement via l'API Pappers.\n`;
  
  return text;
}

/**
 * Formatte une date en format français
 * @param {string} dateStr - Chaîne de date ISO
 */
function formatDate(dateStr) {
  if (!dateStr) return "Non disponible";
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
  } catch (e) {
    return dateStr;
  }
}

/**
 * Formatte un montant en euros
 * @param {number} amount - Montant à formatter
 */
function formatCurrency(amount) {
  if (amount === null || amount === undefined) return "Non disponible";
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Formatte un pourcentage
 * @param {number} value - Valeur à formatter
 */
function formatPercentage(value) {
  if (value === null || value === undefined) return "Non disponible";
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value / 100); // Diviser par 100 car les valeurs sont déjà en pourcentage
}

/**
 * Formatte un nombre simple
 * @param {number} value - Valeur à formatter
 */
function formatNumber(value) {
  if (value === null || value === undefined) return "Non disponible";
  
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

// Fonction pour demander le SIREN à l'utilisateur et lancer l'extraction
function promptForSiren() {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('Entrez le numéro SIREN de l\'entreprise (9 chiffres) : ', (siren) => {
    readline.close();
    extractMinimalCompanyInfo(siren);
  });
}

// Point d'entrée du script
// Si un SIREN est fourni en argument de ligne de commande, l'utiliser
// Sinon, demander à l'utilisateur
if (process.argv.length > 2) {
  const siren = process.argv[2];
  extractMinimalCompanyInfo(siren);
} else {
  promptForSiren();
}
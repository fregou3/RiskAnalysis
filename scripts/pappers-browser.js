/**
 * Script pour rechercher des informations détaillées sur une entreprise via l'API Pappers
 * Ce script peut être exécuté dans la console du navigateur
 * 
 * Utilisation:
 * 1. Remplacez 'VOTRE_CLE_API_PAPPERS' par votre clé API Pappers
 * 2. Copiez et collez ce script dans la console du navigateur
 * 3. Appelez la fonction searchCompany('nom d'entreprise ou SIREN')
 */

// Configuration
const PAPPERS_API_KEY = 'VOTRE_CLE_API_PAPPERS'; // Remplacez par votre clé API Pappers

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
 * Fonction pour rechercher une entreprise par son nom ou SIREN
 * @param {String} searchTerm - Nom de l'entreprise ou SIREN
 */
async function searchCompany(searchTerm) {
  if (!searchTerm) {
    console.error('Erreur: Veuillez fournir un nom d\'entreprise ou un SIREN');
    return;
  }
  
  console.log(`Recherche pour: "${searchTerm}"...`);
  
  // Vérifier si le terme de recherche est un SIREN (9 chiffres)
  const isSiren = /^\d{9}$/.test(searchTerm.replace(/\s/g, ''));
  
  if (isSiren) {
    // Si c'est un SIREN, obtenir directement les détails
    await getCompanyDetails(searchTerm.replace(/\s/g, ''));
  } else {
    // Sinon, rechercher par nom
    await searchCompanyByName(searchTerm);
  }
}

/**
 * Fonction pour rechercher une entreprise par son nom
 * @param {String} companyName - Nom de l'entreprise
 */
async function searchCompanyByName(companyName) {
  try {
    console.log(`Recherche de l'entreprise "${companyName}"...`);
    
    // Vérifier si la clé API est disponible
    console.log(`Utilisation de la clé API: ${PAPPERS_API_KEY ? 'Disponible' : 'Non disponible'}`);
    
    const response = await fetch(`https://api.pappers.fr/v2/recherche?api_token=${PAPPERS_API_KEY}&q=${encodeURIComponent(companyName)}&par_page=5`);
    const data = await response.json();
    
    if (data.resultats && data.resultats.length > 0) {
      console.log(`%c${data.total} résultats trouvés. Affichage des 5 premiers :`, 'color: green; font-weight: bold');
      
      data.resultats.forEach((result, index) => {
        console.log(`%c\n[${index + 1}] ${result.nom_entreprise}`, 'color: blue; font-weight: bold');
        console.log(`    SIREN: ${result.siren}`);
        console.log(`    Forme juridique: ${result.forme_juridique}`);
        console.log(`    Adresse: ${result.siege?.adresse_complete || 'Non disponible'}`);
      });
      
      // Obtenir les détails du premier résultat
      console.log('%c\nRécupération des détails pour le premier résultat...', 'color: purple; font-weight: bold');
      await getCompanyDetails(data.resultats[0].siren);
    } else {
      console.log('%cAucun résultat trouvé.', 'color: red');
    }
  } catch (error) {
    console.error('Erreur lors de la recherche par nom:', error);
  }
}

/**
 * Fonction pour obtenir les détails complets d'une entreprise par son SIREN
 * @param {String} siren - Numéro SIREN de l'entreprise
 */
async function getCompanyDetails(siren) {
  try {
    console.log(`%cRécupération des détails pour le SIREN ${siren}...`, 'color: purple; font-weight: bold');
    
    // Récupérer les informations générales
    const detailsResponse = await fetch(`https://api.pappers.fr/v2/entreprise?api_token=${PAPPERS_API_KEY}&siren=${siren}`);
    const detailsData = await detailsResponse.json();
    
    // Récupérer les données financières
    const financialResponse = await fetch(`https://api.pappers.fr/v2/entreprise?api_token=${PAPPERS_API_KEY}&siren=${siren}&extrait_financier=true`);
    const financialData = await financialResponse.json();
    
    // Récupérer les dirigeants
    const managementResponse = await fetch(`https://api.pappers.fr/v2/entreprise?api_token=${PAPPERS_API_KEY}&siren=${siren}&dirigeants=true`);
    const managementData = await managementResponse.json();
    
    // Récupérer les bénéficiaires effectifs
    const beneficiariesResponse = await fetch(`https://api.pappers.fr/v2/entreprise?api_token=${PAPPERS_API_KEY}&siren=${siren}&beneficiaires_effectifs=true`);
    const beneficiariesData = await beneficiariesResponse.json();
    
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
      finances: financialData.extrait_financier?.exercices || [],
      dirigeants: managementData.dirigeants || [],
      beneficiairesEffectifs: beneficiariesData.beneficiaires || []
    };
    
    // Afficher les résultats
    displayCompanyData(companyData);
    
    // Retourner les données pour une utilisation ultérieure
    return companyData;
    
  } catch (error) {
    console.error('Erreur lors de la récupération des détails:', error);
  }
}

/**
 * Fonction pour afficher les données de l'entreprise dans la console
 * @param {Object} data - Données de l'entreprise
 */
function displayCompanyData(data) {
  console.log('%c\n=== INFORMATIONS GÉNÉRALES ===', 'color: green; font-weight: bold');
  console.log(`Nom: ${data.identite.nom}`);
  console.log(`SIREN: ${data.identite.siren}`);
  console.log(`Forme juridique: ${data.identite.formeJuridique}`);
  console.log(`Date de création: ${data.identite.dateCreation}`);
  console.log(`Capital: ${formatNumber(data.identite.capitalBrut)}`);
  console.log(`Tranche d'effectif: ${data.identite.trancheEffectif}`);
  console.log(`Code NAF: ${data.identite.codeNaf} - ${data.identite.libelleNaf}`);
  
  console.log('%c\n=== ADRESSE ET CONTACT ===', 'color: green; font-weight: bold');
  console.log(`Adresse: ${data.siege.adresse}, ${data.siege.codePostal} ${data.siege.ville}`);
  console.log(`Département: ${data.siege.departement}`);
  console.log(`Région: ${data.siege.region}`);
  console.log(`Téléphone: ${data.siege.telephone || 'Non disponible'}`);
  console.log(`Email: ${data.siege.email || 'Non disponible'}`);
  console.log(`Site web: ${data.siege.siteWeb || 'Non disponible'}`);
  
  if (data.finances.length > 0) {
    console.log('%c\n=== DONNÉES FINANCIÈRES ===', 'color: green; font-weight: bold');
    data.finances.slice(0, 3).forEach((finance, index) => {
      console.log(`%c\nExercice ${index + 1} (${finance.date_cloture}):`, 'color: blue');
      console.log(`  Chiffre d'affaires: ${formatNumber(finance.chiffre_affaires)}`);
      console.log(`  Résultat net: ${formatNumber(finance.resultat_net)}`);
      console.log(`  Effectif: ${finance.effectif || 'Non disponible'}`);
      console.log(`  EBITDA: ${formatNumber(finance.ebitda)}`);
      console.log(`  Rentabilité: ${finance.rentabilite ? `${finance.rentabilite}%` : 'N/A'}`);
      console.log(`  Taux d'endettement: ${finance.taux_endettement ? `${finance.taux_endettement}%` : 'N/A'}`);
      console.log(`  Total bilan: ${formatNumber(finance.total_bilan)}`);
    });
  }
  
  if (data.dirigeants.length > 0) {
    console.log('%c\n=== DIRIGEANTS ===', 'color: green; font-weight: bold');
    data.dirigeants.forEach((dirigeant, index) => {
      console.log(`%c\nDirigeant ${index + 1}:`, 'color: blue');
      console.log(`  Nom: ${dirigeant.prenom} ${dirigeant.nom}`);
      console.log(`  Fonction: ${dirigeant.fonction}`);
      console.log(`  Date de nomination: ${dirigeant.date_nomination || 'Non disponible'}`);
      console.log(`  Nationalité: ${dirigeant.nationalite || 'Non disponible'}`);
    });
  }
  
  if (data.beneficiairesEffectifs.length > 0) {
    console.log('%c\n=== BÉNÉFICIAIRES EFFECTIFS ===', 'color: green; font-weight: bold');
    data.beneficiairesEffectifs.forEach((beneficiaire, index) => {
      console.log(`%c\nBénéficiaire ${index + 1}:`, 'color: blue');
      console.log(`  Nom: ${beneficiaire.prenom} ${beneficiaire.nom}`);
      console.log(`  Nationalité: ${beneficiaire.nationalite || 'Non disponible'}`);
      console.log(`  Pourcentage parts: ${beneficiaire.pourcentage_parts ? `${beneficiaire.pourcentage_parts}%` : 'Non disponible'}`);
      console.log(`  Pourcentage votes: ${beneficiaire.pourcentage_votes ? `${beneficiaire.pourcentage_votes}%` : 'Non disponible'}`);
      console.log(`  Type de contrôle: ${beneficiaire.type_controle || 'Non disponible'}`);
    });
  }
  
  // Afficher les données brutes pour une utilisation avancée
  console.log('%c\n=== DONNÉES BRUTES (pour utilisation avancée) ===', 'color: gray');
  console.log('Vous pouvez accéder aux données brutes via la variable "lastCompanyData"');
  window.lastCompanyData = data;
}

// Fonction pour faciliter l'utilisation
window.searchCompany = searchCompany;

console.log('%cScript de recherche Pappers chargé !', 'color: green; font-weight: bold; font-size: 14px');
console.log('Utilisez la fonction searchCompany("nom d\'entreprise ou SIREN") pour rechercher une entreprise');
console.log('Exemple: searchCompany("LVMH") ou searchCompany("552075580")');

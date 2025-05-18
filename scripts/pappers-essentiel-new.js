/**
 * Script pour récupérer uniquement les informations essentielles d'une entreprise
 * et ses données financières via l'API Pappers payante
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

// Récupérer les arguments de ligne de commande
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node pappers-essentiel.js <SIREN/SIRET/Nom>');
  process.exit(1);
}

const searchTerm = args[0];
const outputFormat = args[1] === '--json' ? 'json' : 'console';

/**
 * Fonction principale
 */
async function main() {
  try {
    let siren = searchTerm;
    
    // Vérifier si le terme de recherche est un SIREN/SIRET (9 à 14 chiffres)
    if (!/^\d{9,14}$/.test(searchTerm.replace(/\s/g, ''))) {
      // Si ce n'est pas un SIREN/SIRET, rechercher par nom
      console.log(`Recherche de l'entreprise "${searchTerm}"...`);
      siren = await searchCompanyByName(searchTerm);
      
      if (!siren) {
        console.error('Impossible de continuer sans SIREN valide.');
        process.exit(1);
      }
    } else {
      siren = searchTerm.replace(/\s/g, '').substring(0, 9); // Prendre les 9 premiers chiffres (SIREN)
    }
    
    // Récupérer les informations essentielles
    const companyData = await getEssentialInfo(siren);
    
    // Afficher ou sauvegarder les résultats
    if (outputFormat === 'json') {
      // Sortie au format JSON
      console.log(JSON.stringify(companyData, null, 2));
    } else {
      // Effacer la console avant d'afficher les informations
      console.clear();
      // Afficher dans la console
      displayCompanyInfo(companyData);
    }
    
  } catch (error) {
    console.error('Erreur lors de l\'exécution du script:', error.message);
    if (error.response) {
      console.error('Détails de l\'erreur:', error.response.data);
    }
  }
} else {
      siren = searchTerm.replace(/\s/g, '').substring(0, 9); // Prendre les 9 premiers chiffres (SIREN)
    }
    
    // Récupérer les informations essentielles
    const companyData = await getEssentialInfo(siren);
    
    // Afficher ou sauvegarder les résultats
    if (outputFormat === 'json') {
      // Sortie au format JSON
      console.log(JSON.stringify(companyData, null, 2));
    } else {
      // Effacer la console avant d'afficher les informations
      console.clear();
      // Afficher dans la console
      displayCompanyInfo(companyData);
    }
    
  } catch (error) {
    console.error('Erreur lors de l\'exécution du script:', error.message);
    if (error.response) {
      console.error('Détails de l\'erreur:', error.response.data);
    }
  }
} else {
      siren = searchTerm.replace(/\s/g, '').substring(0, 9); // Prendre les 9 premiers chiffres (SIREN)
    }
    
    // Récupérer les informations essentielles
    const companyData = await getEssentialInfo(siren);
    
    // Afficher ou sauvegarder les résultats
    if (outputFormat === 'json') {
      // Sortie au format JSON
      console.log(JSON.stringify(companyData, null, 2));
    } else {
      // Afficher dans la console
      displayCompanyInfo(companyData);
    }
    
  } catch (error) {
    console.error('Erreur lors de l\'exécution du script:', error.message);
    if (error.response) {
      console.error('Détails de l\'erreur:', error.response.data);
    }
  }
}

/**
 * Rechercher une entreprise par son nom
 * @param {string} companyName - Nom de l'entreprise
 * @returns {Promise<string>} - SIREN de l'entreprise
 */
async function searchCompanyByName(companyName) {
  try {
    const response = await axios.get('https://api.pappers.fr/v2/recherche', {
      params: {
        _nocache: Date.now(), // Paramètre pour éviter la mise en cache
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
      
      // Demander à l'utilisateur de choisir une entreprise
      console.log('\nEntrez le numéro de l\'entreprise à utiliser (1-5), ou appuyez sur Entrée pour utiliser la première:');
      
      // Comme nous ne pouvons pas attendre une entrée utilisateur dans ce contexte,
      // nous utilisons automatiquement le premier résultat
      console.log('Utilisation automatique du premier résultat.');
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
 * Récupérer les informations essentielles d'une entreprise
 * @param {string} siren - SIREN de l'entreprise
 * @returns {Promise<object>} - Informations essentielles
 */
async function getEssentialInfo(siren) {
  try {
    console.log(`Récupération des informations essentielles pour le SIREN ${siren}...`);
    
    // Récupérer les informations générales de l'entreprise
    const response = await axios.get('https://api.pappers.fr/v2/entreprise', {
      params: {
        _nocache: Date.now(), // Paramètre pour éviter la mise en cache
        api_token: PAPPERS_API_KEY,
        siren: siren,
        // Informations générales
        extrait_kbis: true,
        fiche_identite: true,
        
        // Informations financières complètes
        extrait_financier: true,
        bilans: true,
        comptes_sociaux: true,
        ratios: true,
        scoring: true
      }
    });
    
    // Extraire les informations essentielles
    const data = response.data;
    
    // Récupérer les données financières sociales
    let finances = [];
    try {
      // Tentative de récupération des données financières sociales
      const comptesResponse = await axios.get(`https://api.pappers.fr/v2/entreprise/${siren}/comptes-sociaux`, {
        params: {
          _nocache: Date.now(), // Paramètre pour éviter la mise en cache
          api_token: PAPPERS_API_KEY
        }
      });
      
      if (comptesResponse.data && comptesResponse.data.resultats && comptesResponse.data.resultats.length > 0) {
        console.log("Données financières sociales récupérées avec succès.");
        
        comptesResponse.data.resultats.forEach(compte => {
          finances.push({
            annee: compte.annee,
            date_de_cloture_exercice: compte.date_cloture,
            duree_exercice: compte.duree_exercice || 12,
            chiffre_affaires: compte.chiffre_affaires,
            resultat: compte.resultat_net,
            effectif: compte.effectif,
            marge_brute: compte.marge_brute,
            excedent_brut_exploitation: compte.excedent_brut_exploitation,
            resultat_exploitation: compte.resultat_exploitation,
            taux_croissance_chiffre_affaires: compte.taux_croissance_ca,
            taux_marge_brute: compte.taux_marge_brute,
            taux_marge_EBITDA: compte.taux_marge_ebitda,
            taux_marge_operationnelle: compte.taux_marge_operationnelle,
            BFR: compte.bfr,
            BFR_exploitation: compte.bfr_exploitation,
            BFR_hors_exploitation: compte.bfr_hors_exploitation,
            BFR_jours_CA: compte.bfr_jours_ca,
            delai_paiement_clients_jours: compte.delai_paiement_clients_jours,
            delai_paiement_fournisseurs_jours: compte.delai_paiement_fournisseurs_jours,
            capacite_autofinancement: compte.capacite_autofinancement,
            capacite_autofinancement_CA: compte.capacite_autofinancement_ca
          });
        });
      }
    } catch (error) {
      console.log("Information: Impossible d'accéder aux données financières sociales détaillées.");
    }
    
    // Calculer les taux de croissance pour chaque année si non disponibles
    for (let i = 0; i < finances.length - 1; i++) {
      const current = finances[i];
      const previous = finances[i + 1];
      
      if (current && previous) {
        // Calculer le taux de croissance du chiffre d'affaires si non disponible
        if (current.taux_croissance_chiffre_affaires === undefined && 
            current.chiffre_affaires && previous.chiffre_affaires && 
            previous.chiffre_affaires !== 0) {
          current.taux_croissance_chiffre_affaires = ((current.chiffre_affaires - previous.chiffre_affaires) / previous.chiffre_affaires) * 100;
        }
      }
    }
    
    // Récupérer les données financières consolidées
    let consolidatedFinances = [];
    try {
      // Tentative de récupération des données financières consolidées
      const consolidatedResponse = await axios.get(`https://api.pappers.fr/v2/entreprise/${siren}/comptes-consolides`, {
        params: {
          _nocache: Date.now(), // Paramètre pour éviter la mise en cache
          api_token: PAPPERS_API_KEY
        }
      });
      
      if (consolidatedResponse.data && consolidatedResponse.data.resultats && consolidatedResponse.data.resultats.length > 0) {
        console.log("Données financières consolidées récupérées avec succès.");
        
        consolidatedResponse.data.resultats.forEach(compte => {
          consolidatedFinances.push({
            annee: compte.annee,
            date_de_cloture_exercice: compte.date_cloture,
            duree_exercice: compte.duree_exercice || 12,
            chiffre_affaires: compte.chiffre_affaires,
            resultat: compte.resultat_net,
            effectif: compte.effectif,
            marge_brute: compte.marge_brute,
            excedent_brut_exploitation: compte.excedent_brut_exploitation,
            resultat_exploitation: compte.resultat_exploitation,
            taux_croissance_chiffre_affaires: compte.taux_croissance_ca,
            taux_marge_brute: compte.taux_marge_brute,
            taux_marge_EBITDA: compte.taux_marge_ebitda,
            taux_marge_operationnelle: compte.taux_marge_operationnelle,
            BFR: compte.bfr,
            BFR_exploitation: compte.bfr_exploitation,
            BFR_hors_exploitation: compte.bfr_hors_exploitation,
            BFR_jours_CA: compte.bfr_jours_ca,
            delai_paiement_clients_jours: compte.delai_paiement_clients_jours,
            delai_paiement_fournisseurs_jours: compte.delai_paiement_fournisseurs_jours,
            capacite_autofinancement: compte.capacite_autofinancement,
            capacite_autofinancement_CA: compte.capacite_autofinancement_ca,
            consolide: true
          });
        });
      }
    } catch (error) {
      console.log("Information: Impossible d'accéder aux données financières consolidées.");
    }
    
    // Essayer une autre méthode pour récupérer les données financières si aucune n'a été trouvée
    if (finances.length === 0) {
      try {
        // Tentative de récupération des données financières via la fiche financière
        const financialPageResponse = await axios.get(`https://api.pappers.fr/v2/entreprise/${siren}/fiche`, {
          params: {
            _nocache: Date.now(), // Paramètre pour éviter la mise en cache
            api_token: PAPPERS_API_KEY,
            type_fiche: "financiere"
          }
        });
        
        if (financialPageResponse.data && financialPageResponse.data.chiffres_cles) {
          const chiffresCles = financialPageResponse.data.chiffres_cles;
          console.log("Données financières récupérées via la fiche financière.");
          
          // Extraire les années disponibles
          const annees = Object.keys(chiffresCles)
            .filter(key => /^\d{4}$/.test(key))
            .sort((a, b) => parseInt(b) - parseInt(a));
          
          annees.forEach(annee => {
            const donnees = chiffresCles[annee];
            if (donnees) {
              finances.push({
                annee: parseInt(annee),
                date_de_cloture_exercice: `${annee}-12-31`,
                duree_exercice: 12,
                chiffre_affaires: donnees.ca,
                resultat: donnees.resultat_net,
                effectif: donnees.effectif,
                marge_brute: donnees.marge_brute,
                excedent_brut_exploitation: donnees.ebitda,
                resultat_exploitation: donnees.resultat_exploitation,
                taux_croissance_chiffre_affaires: donnees.taux_croissance_ca,
                taux_marge_brute: donnees.taux_marge_brute,
                taux_marge_EBITDA: donnees.taux_marge_ebitda,
                taux_marge_operationnelle: donnees.taux_marge_operationnelle,
                BFR: donnees.bfr,
                BFR_jours_CA: donnees.bfr_jours_ca,
                delai_paiement_clients_jours: donnees.delai_paiement_clients_jours,
                delai_paiement_fournisseurs_jours: donnees.delai_paiement_fournisseurs_jours,
                capacite_autofinancement: donnees.capacite_autofinancement,
                capacite_autofinancement_CA: donnees.capacite_autofinancement_ca
              });
            }
          });
        }
      } catch (error) {
        console.log("Information: Impossible d'accéder à la fiche financière.");
      }
    }
    
    // Si aucune donnée financière n'a été récupérée, afficher un message
    if ((finances.length === 0 && consolidatedFinances.length === 0)) {
      console.log("Aucune donnée financière disponible pour cette entreprise via l'API Pappers.");
    }  
    
    // Créer un objet avec uniquement les informations nécessaires
    const essentialInfo = {
      // Informations générales
      nom_entreprise: data.nom_entreprise || 'Non disponible',
      siren: data.siren || 'Non disponible',
      siret_siege: data.siege?.siret || 'Non disponible',
      forme_juridique: data.forme_juridique || 'Non disponible',
      date_creation: data.date_creation ? formatDate(data.date_creation) : 'Non disponible',
      capital: data.capital ? formatNumber(data.capital) + ' €' : 'Non disponible',
      effectif: data.effectif || data.tranche_effectif || 'Non disponible',
      est_societe_mere: data.est_societe_mere || false,
      
      // Adresse
      siege: {
        adresse_complete: data.siege?.adresse_complete,
        adresse_ligne_1: data.siege?.adresse_ligne_1,
        code_postal: data.siege?.code_postal,
        ville: data.siege?.ville,
        departement: data.siege?.departement,
        region: data.siege?.region,
        pays: data.siege?.pays,
        telephone: data.siege?.telephone,
        email: data.siege?.email,
        site_web: data.siege?.site_web
      },
      
      // Activité
      code_naf: data.code_naf,
      libelle_code_naf: data.libelle_code_naf,
      domaine_activite: data.domaine_activite,
      
      // Informations légales
      numero_tva_intracommunautaire: data.numero_tva_intracommunautaire,
      numero_rcs: data.numero_rcs,
      greffe: data.greffe,
      date_immatriculation_rcs: data.date_immatriculation_rcs,
      statut: data.statut,
      
      // Informations financières
      finances: finances,
      finances_consolidees: consolidatedFinances,
      ratios: data.ratios || {},
      scoring: data.scoring || {}
    };
    
    return essentialInfo;
  } catch (error) {
    console.error('Erreur lors de la récupération des informations essentielles:', error.message);
    throw error;
  }
}

/**
 * Affiche les informations de l'entreprise
 * @param {Object} data - Données de l'entreprise
 */
function displayCompanyInfo(data) {
  try {
    // Utiliser console.clear() pour effacer la console avant d'afficher les informations
    console.clear();
    
    console.log('\n=== INFORMATIONS ESSENTIELLES ===');
    console.log(`Nom: ${data.nom_entreprise || data.nom || 'Non disponible'}`);
    console.log(`SIREN: ${data.siren || 'Non disponible'}`);
    console.log(`SIRET (siège): ${data.siret || data.siret_siege || 'Non disponible'}`);
    console.log(`Forme juridique: ${data.forme_juridique || 'Non disponible'}`);
    console.log(`Date de création: ${data.date_creation ? formatDate(data.date_creation) : 'Non disponible'}`);
    console.log(`Capital: ${data.capital ? formatNumber(data.capital) + ' €' : 'Non disponible'}`);
    console.log(`Effectif: ${data.effectif || 'Non disponible'}`);
    
    console.log('\n=== ADRESSE ET CONTACT ===');
    console.log(`Adresse: ${data.siege?.adresse_complete || 'Non disponible'}`);
    console.log(`Code postal: ${data.siege?.code_postal || 'Non disponible'}`);
    console.log(`Ville: ${data.siege?.ville || 'Non disponible'}`);
    console.log(`Téléphone: ${data.siege?.telephone || 'Non disponible'}`);
    console.log(`Email: ${data.siege?.email || 'Non disponible'}`);
    console.log(`Site web: ${data.siege?.site_web || 'Non disponible'}`);
    
    console.log('\n=== ACTIVITÉ ===');
    console.log(`Code NAF: ${data.code_naf || 'Non disponible'}${data.libelle_code_naf ? ` - ${data.libelle_code_naf}` : ''}`);
    
    console.log('\n=== INFORMATIONS LÉGALES ===');
    console.log(`Numéro TVA: ${data.numero_tva_intracommunautaire || 'Non disponible'}`);
    console.log(`Numéro RCS: ${data.numero_rcs || 'Non disponible'}`);
    console.log(`Greffe: ${data.greffe || 'Non disponible'}`);
    console.log(`Date d'immatriculation: ${data.date_immatriculation_rcs ? formatDate(data.date_immatriculation_rcs) : 'Non disponible'}`);
    console.log(`Statut: ${data.statut || 'Actif'}`);
    
    // Afficher les informations financières
    displayFinancialInfo(data);
  } catch (error) {
    console.error("Erreur lors de l'affichage des informations de l'entreprise:", error.message);
  }
}



/**
 * Afficher les informations financières
 * @param {object} data - Informations financières et ratios
 */
function displayFinancialInfo(data) {
  console.log('\n=== INFORMATIONS FINANCIÈRES ===');
  
  // Afficher les informations financières sociales
  if (data.finances && data.finances.length > 0) {
    console.log("\n=== INFORMATIONS FINANCIÈRES SOCIALES ===\n");
    
    // Afficher les performances financières
    console.log("PERFORMANCES FINANCIÈRES SOCIALES:");
    console.log("------------------------------------------------------------------");
    console.log("Année    | Chiffre d'affaires | Résultat net    | Marge brute");
    console.log("------------------------------------------------------------------");
    
    data.finances.slice(0, 3).forEach(finance => {
      const ca = finance.chiffre_affaires ? `${formatNumberToMillions(finance.chiffre_affaires)}€` : 'N/A';
      const resultat = finance.resultat ? `${formatNumberToMillions(finance.resultat)}€` : 'N/A';
      const marge = finance.marge_brute ? `${formatNumberToMillions(finance.marge_brute)}€` : 'N/A';
      
      console.log(`${finance.annee}    | ${ca.padEnd(18)} | ${resultat.padEnd(15)} | ${marge}`);
    });
    
    console.log("------------------------------------------------------------------\n");
    
    // Afficher les ratios de performance
    console.log("RATIOS DE PERFORMANCE SOCIAUX:");
    console.log("------------------------------------------------------------------");
    console.log("Année    | Croissance CA (%) | Marge brute (%)  | Marge EBITDA (%)");
    console.log("------------------------------------------------------------------");
    
    data.finances.slice(0, 3).forEach(finance => {
      const croissance = finance.taux_croissance_chiffre_affaires !== null && finance.taux_croissance_chiffre_affaires !== undefined ? `${finance.taux_croissance_chiffre_affaires.toFixed(1)}%` : 'N/A';
      const tauxMarge = finance.taux_marge_brute !== null && finance.taux_marge_brute !== undefined ? `${finance.taux_marge_brute.toFixed(1)}%` : 'N/A';
      const tauxEBITDA = finance.taux_marge_EBITDA !== null && finance.taux_marge_EBITDA !== undefined ? `${finance.taux_marge_EBITDA.toFixed(1)}%` : 'N/A';
      
      console.log(`${finance.annee}    | ${croissance.padEnd(17)} | ${tauxMarge.padEnd(16)} | ${tauxEBITDA}`);
    });
    
    console.log("------------------------------------------------------------------\n");
    
    // Afficher les informations de BFR et trésorerie (dernier exercice)
    const lastFinance = data.finances[0];
    if (lastFinance) {
      console.log("BFR ET TRÉSORERIE (dernier exercice social):");
      if (lastFinance.BFR !== null && lastFinance.BFR !== undefined) console.log(`BFR: ${formatNumberToMillions(lastFinance.BFR)}€`);
      if (lastFinance.BFR_jours_CA !== null && lastFinance.BFR_jours_CA !== undefined) console.log(`BFR en jours de CA: ${lastFinance.BFR_jours_CA.toFixed(1)} jours`);
      if (lastFinance.delai_paiement_clients_jours !== null && lastFinance.delai_paiement_clients_jours !== undefined) console.log(`Délai de paiement clients: ${lastFinance.delai_paiement_clients_jours.toFixed(1)} jours`);
      if (lastFinance.delai_paiement_fournisseurs_jours !== null && lastFinance.delai_paiement_fournisseurs_jours !== undefined) console.log(`Délai de paiement fournisseurs: ${Math.abs(lastFinance.delai_paiement_fournisseurs_jours).toFixed(1)} jours`);
      if (lastFinance.capacite_autofinancement !== null && lastFinance.capacite_autofinancement !== undefined) console.log(`Capacité d'autofinancement: ${formatNumberToMillions(lastFinance.capacite_autofinancement)}€`);
      if (lastFinance.capacite_autofinancement_CA !== null && lastFinance.capacite_autofinancement_CA !== undefined) console.log(`CAF/CA: ${lastFinance.capacite_autofinancement_CA.toFixed(1)}%`);
    }
  } else {
    console.log("\n=== INFORMATIONS FINANCIÈRES SOCIALES ===\n");
    console.log("Aucune information financière sociale disponible.");
  }
  
  // Afficher les informations financières consolidées
  if (data.finances_consolidees && data.finances_consolidees.length > 0) {
    console.log("\n=== INFORMATIONS FINANCIÈRES CONSOLIDÉES ===\n");
    
    // Afficher les performances financières consolidées
    console.log("PERFORMANCES FINANCIÈRES CONSOLIDÉES (GROUPE):");
    console.log("------------------------------------------------------------------");
    console.log("Année    | Chiffre d'affaires | Résultat net    | Effectif");
    console.log("------------------------------------------------------------------");
    
    data.finances_consolidees.slice(0, 3).forEach(finance => {
      const ca = finance.chiffre_affaires !== null && finance.chiffre_affaires !== undefined ? `${formatNumberToMillions(finance.chiffre_affaires)}€` : 'N/A';
      const resultat = finance.resultat !== null && finance.resultat !== undefined ? `${formatNumberToMillions(finance.resultat)}€` : 'N/A';
      const effectif = finance.effectif !== null && finance.effectif !== undefined ? `${finance.effectif.toLocaleString()}` : 'N/A';
      
      console.log(`${finance.annee}    | ${ca.padEnd(18)} | ${resultat.padEnd(15)} | ${effectif}`);
    });
    
    console.log("------------------------------------------------------------------\n");
    
    // Afficher les ratios de performance consolidés
    console.log("RATIOS DE PERFORMANCE CONSOLIDÉS:");
    console.log("------------------------------------------------------------------");
    console.log("Année    | Croissance CA (%) | Marge brute (%)  | Marge EBITDA (%)");
    console.log("------------------------------------------------------------------");
    
    data.finances_consolidees.slice(0, 3).forEach(finance => {
      const croissance = finance.taux_croissance_chiffre_affaires !== null && finance.taux_croissance_chiffre_affaires !== undefined ? `${finance.taux_croissance_chiffre_affaires.toFixed(1)}%` : 'N/A';
      const tauxMarge = finance.taux_marge_brute !== null && finance.taux_marge_brute !== undefined ? `${finance.taux_marge_brute.toFixed(1)}%` : 'N/A';
      const tauxEBITDA = finance.taux_marge_EBITDA !== null && finance.taux_marge_EBITDA !== undefined ? `${finance.taux_marge_EBITDA.toFixed(1)}%` : 'N/A';
      
      console.log(`${finance.annee}    | ${croissance.padEnd(17)} | ${tauxMarge.padEnd(16)} | ${tauxEBITDA}`);
    });
    
    console.log("------------------------------------------------------------------\n");
    
    // Afficher les informations de BFR et trésorerie consolidées (dernier exercice)
    const lastConsolidatedFinance = data.finances_consolidees[0];
    if (lastConsolidatedFinance) {
      console.log("BFR ET TRÉSORERIE CONSOLIDÉS (dernier exercice):");
      if (lastConsolidatedFinance.BFR !== null && lastConsolidatedFinance.BFR !== undefined) console.log(`BFR: ${formatNumberToMillions(lastConsolidatedFinance.BFR)}€`);
      if (lastConsolidatedFinance.BFR_jours_CA !== null && lastConsolidatedFinance.BFR_jours_CA !== undefined) console.log(`BFR en jours de CA: ${lastConsolidatedFinance.BFR_jours_CA.toFixed(1)} jours`);
      if (lastConsolidatedFinance.delai_paiement_clients_jours !== null && lastConsolidatedFinance.delai_paiement_clients_jours !== undefined) console.log(`Délai de paiement clients: ${lastConsolidatedFinance.delai_paiement_clients_jours.toFixed(1)} jours`);
      if (lastConsolidatedFinance.delai_paiement_fournisseurs_jours !== null && lastConsolidatedFinance.delai_paiement_fournisseurs_jours !== undefined) console.log(`Délai de paiement fournisseurs: ${Math.abs(lastConsolidatedFinance.delai_paiement_fournisseurs_jours).toFixed(1)} jours`);
      if (lastConsolidatedFinance.capacite_autofinancement !== null && lastConsolidatedFinance.capacite_autofinancement !== undefined) console.log(`Capacité d'autofinancement: ${formatNumberToMillions(lastConsolidatedFinance.capacite_autofinancement)}€`);
      if (lastConsolidatedFinance.capacite_autofinancement_CA !== null && lastConsolidatedFinance.capacite_autofinancement_CA !== undefined) console.log(`CAF/CA: ${lastConsolidatedFinance.capacite_autofinancement_CA.toFixed(1)}%`);
    }
  } else if (data.est_societe_mere) {
    console.log("\n=== INFORMATIONS FINANCIÈRES CONSOLIDÉES ===\n");
    console.log("Aucune information financière consolidée disponible pour cette société mère.");
  }
}

  } else {
    console.log("\n=== INFORMATIONS FINANCIÈRES SOCIALES ===\n");
    console.log("Aucune information financière sociale disponible.");
  }
  
  // Afficher les informations financières consolidées
  if (data.finances_consolidees && data.finances_consolidees.length > 0) {
    console.log("\n=== INFORMATIONS FINANCIÈRES CONSOLIDÉES ===\n");
    
    // Afficher les performances financières consolidées
    console.log("PERFORMANCES FINANCIÈRES CONSOLIDÉES (GROUPE):");
    console.log("------------------------------------------------------------------");
    console.log("Année    | Chiffre d'affaires | Résultat net    | Effectif");
    console.log("------------------------------------------------------------------");
    
    data.finances_consolidees.slice(0, 3).forEach(finance => {
      const ca = finance.chiffre_affaires !== null && finance.chiffre_affaires !== undefined ? `${formatNumberToMillions(finance.chiffre_affaires)}€` : 'N/A';
      const resultat = finance.resultat !== null && finance.resultat !== undefined ? `${formatNumberToMillions(finance.resultat)}€` : 'N/A';
      const effectif = finance.effectif !== null && finance.effectif !== undefined ? `${finance.effectif.toLocaleString()}` : 'N/A';
      
      console.log(`${finance.annee}    | ${ca.padEnd(18)} | ${resultat.padEnd(15)} | ${effectif}`);
    });
    
    console.log("------------------------------------------------------------------\n");
    
    // Afficher les ratios de performance consolidés
    console.log("RATIOS DE PERFORMANCE CONSOLIDÉS:");
    console.log("------------------------------------------------------------------");
    console.log("Année    | Croissance CA (%) | Marge brute (%)  | Marge EBITDA (%)");
    console.log("------------------------------------------------------------------");
    
    data.finances_consolidees.slice(0, 3).forEach(finance => {
      const croissance = finance.taux_croissance_chiffre_affaires !== null && finance.taux_croissance_chiffre_affaires !== undefined ? `${finance.taux_croissance_chiffre_affaires.toFixed(1)}%` : 'N/A';
      const tauxMarge = finance.taux_marge_brute !== null && finance.taux_marge_brute !== undefined ? `${finance.taux_marge_brute.toFixed(1)}%` : 'N/A';
      const tauxEBITDA = finance.taux_marge_EBITDA !== null && finance.taux_marge_EBITDA !== undefined ? `${finance.taux_marge_EBITDA.toFixed(1)}%` : 'N/A';
      
      console.log(`${finance.annee}    | ${croissance.padEnd(17)} | ${tauxMarge.padEnd(16)} | ${tauxEBITDA}`);
    });
    
    console.log("------------------------------------------------------------------\n");
    
    // Afficher les informations de BFR et trésorerie consolidées (dernier exercice)
    const lastConsolidatedFinance = data.finances_consolidees[0];
    if (lastConsolidatedFinance) {
      console.log("BFR ET TRÉSORERIE CONSOLIDÉS (dernier exercice):");
      if (lastConsolidatedFinance.BFR !== null && lastConsolidatedFinance.BFR !== undefined) console.log(`BFR: ${formatNumberToMillions(lastConsolidatedFinance.BFR)}€`);
      if (lastConsolidatedFinance.BFR_jours_CA !== null && lastConsolidatedFinance.BFR_jours_CA !== undefined) console.log(`BFR en jours de CA: ${lastConsolidatedFinance.BFR_jours_CA.toFixed(1)} jours`);
      if (lastConsolidatedFinance.delai_paiement_clients_jours !== null && lastConsolidatedFinance.delai_paiement_clients_jours !== undefined) console.log(`Délai de paiement clients: ${lastConsolidatedFinance.delai_paiement_clients_jours.toFixed(1)} jours`);
      if (lastConsolidatedFinance.delai_paiement_fournisseurs_jours !== null && lastConsolidatedFinance.delai_paiement_fournisseurs_jours !== undefined) console.log(`Délai de paiement fournisseurs: ${Math.abs(lastConsolidatedFinance.delai_paiement_fournisseurs_jours).toFixed(1)} jours`);
      if (lastConsolidatedFinance.capacite_autofinancement !== null && lastConsolidatedFinance.capacite_autofinancement !== undefined) console.log(`Capacité d'autofinancement: ${formatNumberToMillions(lastConsolidatedFinance.capacite_autofinancement)}€`);
      if (lastConsolidatedFinance.capacite_autofinancement_CA !== null && lastConsolidatedFinance.capacite_autofinancement_CA !== undefined) console.log(`CAF/CA: ${lastConsolidatedFinance.capacite_autofinancement_CA.toFixed(1)}%`);
    }
  } else if (data.est_societe_mere) {
    console.log("\n=== INFORMATIONS FINANCIÈRES CONSOLIDÉES ===\n");
    console.log("Aucune information financière consolidée disponible pour cette société mère.");
  }
}

/**
 * Formater une date
 * @param {string} dateString - Date au format string
 * @returns {string} - Date formatée
 */
function formatDate(dateString) {
  if (!dateString) return 'Non disponible';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('fr-FR');
  } catch (e) {
    return dateString;
  }
}

/**
 * Formater un nombre
 * @param {number} number - Le nombre à formater
 * @returns {string} - Le nombre formaté
 */
function formatNumber(number) {
  if (number === null || number === undefined) return 'N/A';
  return number.toLocaleString('fr-FR');
}

/**
 * Formater un grand nombre pour l'affichage (en K€, M€, etc.)
 * @param {number} number - Le nombre à formater
 * @returns {string} - Le nombre formaté
 */
function formatLargeNumber(number) {
  if (number === null || number === undefined) return 'N/A';
  
  if (Math.abs(number) >= 1000000000) {
    return `${(number / 1000000000).toFixed(1)}Md€`;
  } else if (Math.abs(number) >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M€`;
  } else if (Math.abs(number) >= 1000) {
    return `${(number / 1000).toFixed(1)}K€`;
  } else {
    return `${number}€`;
  }
}

/**
 * Formater un nombre en millions pour l'affichage
 * @param {number} number - Le nombre à formater
 * @returns {string} - Le nombre formaté en millions
 */
function formatNumberToMillions(number) {
  if (number === null || number === undefined) return 'N/A';
  
  if (Math.abs(number) >= 1000000000) {
    return `${(number / 1000000000).toFixed(1)}Md`;
  } else if (Math.abs(number) >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M`;
  } else if (Math.abs(number) >= 1000) {
    return `${(number / 1000).toFixed(1)}K`;
  } else {
    return `${number}`;
  }
}

// Exécuter la fonction principale
main().catch(error => {
  console.error('Erreur dans l\'exécution du script:', error);
});

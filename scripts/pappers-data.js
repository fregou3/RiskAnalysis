#!/usr/bin/env node

/**
 * Script pour récupérer les données essentielles d'une entreprise via l'API Pappers
 * Usage: node pappers-data.js [SIREN/SIRET ou nom d'entreprise] [--json] [--full]
 */

const axios = require('axios');
const { program } = require('commander');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis le fichier .env
function loadEnv() {
  try {
    const envPath = path.resolve(__dirname, '../backend/.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = envContent.split('\n').reduce((acc, line) => {
      const match = line.match(/^([^#\s][^=]*)=(.*)$/);
      if (match) {
        acc[match[1]] = match[2].trim();
      }
      return acc;
    }, {});
    return envVars;
  } catch (error) {
    console.error('Erreur lors du chargement du fichier .env:', error.message);
    return {};
  }
}

// Charger les variables d'environnement
const env = loadEnv();

// Configuration
const PAPPERS_API_KEY = env.PAPPERS_API_KEY || process.env.PAPPERS_API_KEY;

// Configurer les options de ligne de commande
program
  .argument('<searchTerm>', 'SIREN/SIRET ou nom de l\'entreprise')
  .option('--json', 'Sortie au format JSON')
  .option('--full', 'Récupérer toutes les informations disponibles')
  .parse(process.argv);

const options = program.opts();
const searchTerm = program.args[0];
const outputFormat = options.json ? 'json' : 'text';
const fullInfo = options.full || false;

// Vérifier la présence de la clé API
if (!PAPPERS_API_KEY) {
  console.error('Erreur: La clé API Pappers n\'est pas définie. Définissez la variable d\'environnement PAPPERS_API_KEY.');
  process.exit(1);
}

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
 * Rechercher une entreprise par nom
 * @param {string} name - Nom de l'entreprise
 * @returns {Promise<string|null>} - SIREN de l'entreprise ou null si non trouvé
 */
async function searchCompanyByName(name) {
  try {
    const response = await axios.get('https://api.pappers.fr/v2/recherche-entreprises', {
      params: {
        api_token: PAPPERS_API_KEY,
        q: name,
        par_page: 5
      }
    });
    
    if (response.data.resultats && response.data.resultats.length > 0) {
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
    
    // 1. Récupérer les informations générales de l'entreprise
    console.log('Requête à l\'API Pappers pour les informations générales...');
    const generalResponse = await axios.get('https://api.pappers.fr/v2/entreprise', {
      params: {
        api_token: PAPPERS_API_KEY,
        siren: siren,
        extrait_kbis: true,
        fiche_identite: true
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    // Vérifier si la réponse contient des données générales
    if (!generalResponse.data) {
      throw new Error('Aucune donnée générale reçue de l\'API Pappers');
    }
    
    console.log('Informations générales reçues');
    const data = generalResponse.data;
    
    // 2. Récupérer les comptes annuels de l'entreprise (données financières détaillées)
    console.log('Requête à l\'API Pappers pour les comptes annuels...');
    let comptesData = {};
    try {
      const comptesResponse = await axios.get('https://api.pappers.fr/v2/entreprise/comptes', {
        params: {
          api_token: PAPPERS_API_KEY,
          siren: siren
        },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (comptesResponse.data && Object.keys(comptesResponse.data).length > 0) {
        console.log(`Comptes annuels reçus pour ${Object.keys(comptesResponse.data).length} année(s)`);
        comptesData = comptesResponse.data;
        
        // Afficher les années disponibles
        console.log('Années disponibles: ' + Object.keys(comptesData).join(', '));
      } else {
        console.log('Aucun compte annuel disponible');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des comptes annuels:', error.message);
      console.log('Poursuite du traitement avec les informations générales uniquement');
    }
    
    // Récupérer les données financières sociales
    let finances = [];
    try {
      console.log('Récupération des comptes sociaux...');
      // Tentative de récupération des données financières sociales
      const comptesResponse = await axios.get(`https://api.pappers.fr/v2/entreprise/${siren}/comptes-sociaux`, {
        params: {
          _nocache: Date.now(), // Paramètre pour éviter la mise en cache
          api_token: PAPPERS_API_KEY,
          format_comptes: 'liasse',
          par_page: 5
        },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (comptesResponse.data) {
        console.log('Réponse reçue pour les comptes sociaux');
        
        if (comptesResponse.data.resultats && comptesResponse.data.resultats.length > 0) {
          console.log(`${comptesResponse.data.resultats.length} comptes sociaux trouvés`);
          comptesResponse.data.resultats.forEach(compte => {
            console.log(`Compte social pour l'année ${compte.annee}`);
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
        } else {
          console.log('Aucun compte social trouvé');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des comptes sociaux:', error.message);
      // Impossible d'accéder aux données financières sociales détaillées
    }
    
    // Essayer une autre approche si aucune donnée financière n'a été trouvée
    if (finances.length === 0) {
      try {
        console.log('Tentative alternative de récupération des données financières...');
        const bilansResponse = await axios.get(`https://api.pappers.fr/v2/entreprise/${siren}/bilans`, {
          params: {
            _nocache: Date.now(),
            api_token: PAPPERS_API_KEY,
            par_page: 5
          },
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (bilansResponse.data && bilansResponse.data.resultats && bilansResponse.data.resultats.length > 0) {
          console.log(`${bilansResponse.data.resultats.length} bilans trouvés`);
          bilansResponse.data.resultats.forEach(bilan => {
            console.log(`Bilan pour l'année ${bilan.annee}`);
            finances.push({
              annee: bilan.annee,
              date_de_cloture_exercice: bilan.date_cloture,
              duree_exercice: bilan.duree_exercice || 12,
              chiffre_affaires: bilan.chiffre_affaires,
              resultat: bilan.resultat_net,
              effectif: bilan.effectif
            });
          });
        } else {
          console.log('Aucun bilan trouvé');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des bilans:', error.message);
      }
      
      // Dernière tentative avec les documents financiers
      if (finances.length === 0) {
        try {
          console.log('Dernière tentative de récupération des données financières via les documents...');
          const documentsResponse = await axios.get(`https://api.pappers.fr/v2/entreprise/${siren}/documents`, {
            params: {
              _nocache: Date.now(),
              api_token: PAPPERS_API_KEY,
              type_document: 'comptes',
              par_page: 5
            },
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });
          
          if (documentsResponse.data && documentsResponse.data.resultats && documentsResponse.data.resultats.length > 0) {
            console.log(`${documentsResponse.data.resultats.length} documents financiers trouvés`);
            
            // Extraire les années des documents financiers
            const annees = documentsResponse.data.resultats
              .filter(doc => doc.type === 'comptes' || doc.type === 'comptes annuels')
              .map(doc => {
                const match = doc.date.match(/\d{4}/);
                return match ? parseInt(match[0]) : null;
              })
              .filter(annee => annee !== null);
            
            // Ajouter des entrées financières de base pour chaque année
            annees.forEach(annee => {
              console.log(`Document financier pour l'année ${annee}`);
              // Vérifier si l'année existe déjà dans les finances
              if (!finances.some(f => f.annee === annee)) {
                finances.push({
                  annee: annee,
                  date_de_cloture_exercice: `31/12/${annee}`,
                  duree_exercice: 12,
                  document_disponible: true
                });
              }
            });
          } else {
            console.log('Aucun document financier trouvé');
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des documents financiers:', error.message);
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
      // Impossible d'accéder aux données financières consolidées
    }
    
    // Extraire et organiser les données financières des comptes annuels
    let comptes_annuels = [];
    if (Object.keys(comptesData).length > 0) {
      // Parcourir les années disponibles
      Object.keys(comptesData).forEach(annee => {
        if (comptesData[annee] && comptesData[annee].length > 0) {
          const compte = comptesData[annee][0]; // Prendre le premier dépôt de l'année
          
          // Extraire les ratios financiers s'ils existent
          const ratios = compte.ratios || {};
          
          // Créer un objet pour cette année
          const compteAnnuel = {
            annee: annee,
            date_depot: compte.date_depot,
            date_cloture: compte.date_cloture,
            duree_exercice: compte.duree_exercice_n,
            type_comptes: compte.type_comptes,
            libelle_type_comptes: compte.libelle_type_comptes,
            confidentialite: compte.confidentialite,
            confidentialite_compte_de_resultat: compte.confidentialite_compte_de_resultat,
            // Données financières
            chiffre_affaires: ratios.chiffre_affaires,
            resultat: ratios.resultat,
            effectif: ratios.effectif,
            marge_brute: ratios.marge_brute,
            excedent_brut_exploitation: ratios.excedent_brut_exploitation,
            resultat_exploitation: ratios.resultat_exploitation,
            taux_croissance_chiffre_affaires: ratios.taux_croissance_chiffre_affaires,
            taux_marge_brute: ratios.taux_marge_brute,
            taux_marge_EBITDA: ratios.taux_marge_EBITDA,
            taux_marge_operationnelle: ratios.taux_marge_operationnelle,
            BFR: ratios.BFR,
            BFR_exploitation: ratios.BFR_exploitation,
            BFR_hors_exploitation: ratios.BFR_hors_exploitation,
            BFR_jours_CA: ratios.BFR_jours_CA,
            delai_paiement_clients_jours: ratios.delai_paiement_clients_jours,
            delai_paiement_fournisseurs_jours: ratios.delai_paiement_fournisseurs_jours,
            capacite_autofinancement: ratios.capacite_autofinancement,
            capacite_autofinancement_CA: ratios.capacite_autofinancement_CA,
            fonds_roulement_net_global: ratios.fonds_roulement_net_global,
            couverture_BFR: ratios.couverture_BFR,
            tresorerie: ratios.tresorerie
          };
          
          comptes_annuels.push(compteAnnuel);
        }
      });
      
      // Trier les comptes annuels par année (du plus récent au plus ancien)
      comptes_annuels.sort((a, b) => parseInt(b.annee) - parseInt(a.annee));
    }
    
    // Créer un objet avec uniquement les informations nécessaires
    const essentialInfo = {
      // Informations générales
      nom_entreprise: data.nom_entreprise || 'Non disponible',
      siren: data.siren || 'Non disponible',
      siret_siege: data.siege?.siret || 'Non disponible',
      forme_juridique: data.forme_juridique || 'Non disponible',
      date_creation: data.date_creation || 'Non disponible',
      capital: data.capital ? `${data.capital} €` : 'Non disponible',
      effectif: data.effectif || data.tranche_effectif || 'Non disponible',
      est_societe_mere: data.est_societe_mere || false,
      
      // Adresse
      siege: {
        adresse_complete: data.siege?.adresse_complete || 'Non disponible',
        code_postal: data.siege?.code_postal || 'Non disponible',
        ville: data.siege?.ville || 'Non disponible',
        telephone: data.siege?.telephone || 'Non disponible',
        email: data.siege?.email || 'Non disponible',
        site_web: data.siege?.site_web || 'Non disponible'
      },
      
      // Activité
      code_naf: data.code_naf || 'Non disponible',
      libelle_code_naf: data.libelle_code_naf || '',
      
      // Informations légales
      numero_tva_intracommunautaire: data.numero_tva_intracommunautaire || 'Non disponible',
      numero_rcs: data.numero_rcs || 'Non disponible',
      greffe: data.greffe || 'Non disponible',
      date_immatriculation_rcs: data.date_immatriculation_rcs || 'Non disponible',
      statut: data.statut || 'Actif',
      
      // Informations financières
      comptes_annuels: comptes_annuels,
      
      // Informations financières directes
      chiffre_affaires: data.chiffre_affaires,
      resultat: data.resultat,
      derniers_comptes: data.derniers_comptes,
      comptes: data.comptes,
      bilans: data.bilans,
      
      // Informations financières extraites
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
    console.log(`Nom: ${data.nom_entreprise}`);
    console.log(`SIREN: ${data.siren}`);
    console.log(`SIRET (siège): ${data.siret_siege}`);
    console.log(`Forme juridique: ${data.forme_juridique}`);
    console.log(`Date de création: ${formatDate(data.date_creation)}`);
    console.log(`Capital: ${data.capital}`);
    console.log(`Effectif: ${data.effectif}`);
    
    console.log('\n=== ADRESSE ET CONTACT ===');
    console.log(`Adresse: ${data.siege.adresse_complete}`);
    console.log(`Code postal: ${data.siege.code_postal}`);
    console.log(`Ville: ${data.siege.ville}`);
    console.log(`Téléphone: ${data.siege.telephone}`);
    console.log(`Email: ${data.siege.email}`);
    console.log(`Site web: ${data.siege.site_web}`);
    
    console.log('\n=== ACTIVITÉ ===');
    console.log(`Code NAF: ${data.code_naf}${data.libelle_code_naf ? ` - ${data.libelle_code_naf}` : ''}`);
    
    console.log('\n=== INFORMATIONS LÉGALES ===');
    console.log(`Numéro TVA: ${data.numero_tva_intracommunautaire}`);
    console.log(`Numéro RCS: ${data.numero_rcs}`);
    console.log(`Greffe: ${data.greffe}`);
    console.log(`Date d'immatriculation: ${formatDate(data.date_immatriculation_rcs)}`);
    console.log(`Statut: ${data.statut}`);
    
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
  
  // Afficher les comptes annuels (données financières détaillées)
  if (data.comptes_annuels && data.comptes_annuels.length > 0) {
    console.log("\n=== COMPTES ANNUELS DÉTAILLÉS ===\n");
    
    // Afficher les performances financières pour les 3 dernières années
    console.log("PERFORMANCES FINANCIÈRES:");
    console.log("------------------------------------------------------------------");
    console.log("Année    | Chiffre d'affaires | Résultat net    | Effectif");
    console.log("------------------------------------------------------------------");
    
    data.comptes_annuels.slice(0, 3).forEach(compte => {
      const ca = compte.chiffre_affaires ? `${formatNumberToMillions(compte.chiffre_affaires)}€` : 'N/A';
      const resultat = compte.resultat ? `${formatNumberToMillions(compte.resultat)}€` : 'N/A';
      const effectif = compte.effectif ? `${compte.effectif}` : 'N/A';
      
      console.log(`${compte.annee}    | ${ca.padEnd(18)} | ${resultat.padEnd(15)} | ${effectif}`);
    });
    
    console.log("------------------------------------------------------------------\n");
    
    // Afficher les ratios de performance
    console.log("RATIOS DE PERFORMANCE:");
    console.log("------------------------------------------------------------------");
    console.log("Année    | Croissance CA (%) | Marge brute (%)  | Marge EBITDA (%)");
    console.log("------------------------------------------------------------------");
    
    data.comptes_annuels.slice(0, 3).forEach(compte => {
      const croissance = compte.taux_croissance_chiffre_affaires !== null && compte.taux_croissance_chiffre_affaires !== undefined ? `${compte.taux_croissance_chiffre_affaires.toFixed(1)}%` : 'N/A';
      const tauxMarge = compte.taux_marge_brute !== null && compte.taux_marge_brute !== undefined ? `${compte.taux_marge_brute.toFixed(1)}%` : 'N/A';
      const tauxEBITDA = compte.taux_marge_EBITDA !== null && compte.taux_marge_EBITDA !== undefined ? `${compte.taux_marge_EBITDA.toFixed(1)}%` : 'N/A';
      
      console.log(`${compte.annee}    | ${croissance.padEnd(17)} | ${tauxMarge.padEnd(16)} | ${tauxEBITDA}`);
    });
    
    console.log("------------------------------------------------------------------\n");
    
    // Afficher les informations de BFR et trésorerie (dernier exercice)
    const lastCompte = data.comptes_annuels[0];
    if (lastCompte) {
      console.log(`INFORMATIONS DÉTAILLÉES (${lastCompte.annee}):`);
      console.log(`Type de comptes: ${lastCompte.libelle_type_comptes || lastCompte.type_comptes || 'Non spécifié'}`);
      console.log(`Date de clôture: ${formatDate(lastCompte.date_cloture)}`);
      console.log(`Date de dépôt: ${formatDate(lastCompte.date_depot)}`);
      console.log(`Durée de l'exercice: ${lastCompte.duree_exercice || 12} mois`);
      
      if (lastCompte.confidentialite) {
        console.log('Comptes confidentiels');
      } else if (lastCompte.confidentialite_compte_de_resultat) {
        console.log('Compte de résultat confidentiel');
      }
      
      console.log("\nINDICATEURS FINANCIERS:");
      if (lastCompte.chiffre_affaires !== null && lastCompte.chiffre_affaires !== undefined) {
        console.log(`Chiffre d'affaires: ${formatNumberToMillions(lastCompte.chiffre_affaires)}€`);
      }
      
      if (lastCompte.resultat !== null && lastCompte.resultat !== undefined) {
        console.log(`Résultat net: ${formatNumberToMillions(lastCompte.resultat)}€`);
      }
      
      if (lastCompte.effectif !== null && lastCompte.effectif !== undefined) {
        console.log(`Effectif: ${lastCompte.effectif}`);
      }
      
      if (lastCompte.marge_brute !== null && lastCompte.marge_brute !== undefined) {
        console.log(`Marge brute: ${formatNumberToMillions(lastCompte.marge_brute)}€`);
      }
      
      if (lastCompte.excedent_brut_exploitation !== null && lastCompte.excedent_brut_exploitation !== undefined) {
        console.log(`Excédent brut d'exploitation (EBITDA): ${formatNumberToMillions(lastCompte.excedent_brut_exploitation)}€`);
      }
      
      if (lastCompte.resultat_exploitation !== null && lastCompte.resultat_exploitation !== undefined) {
        console.log(`Résultat d'exploitation (EBIT): ${formatNumberToMillions(lastCompte.resultat_exploitation)}€`);
      }
      
      console.log("\nBFR ET TRÉSORERIE:");
      if (lastCompte.BFR !== null && lastCompte.BFR !== undefined) {
        console.log(`BFR: ${formatNumberToMillions(lastCompte.BFR)}€`);
      }
      
      if (lastCompte.BFR_jours_CA !== null && lastCompte.BFR_jours_CA !== undefined) {
        console.log(`BFR en jours de CA: ${lastCompte.BFR_jours_CA.toFixed(1)} jours`);
      }
      
      if (lastCompte.delai_paiement_clients_jours !== null && lastCompte.delai_paiement_clients_jours !== undefined) {
        console.log(`Délai de paiement clients: ${lastCompte.delai_paiement_clients_jours.toFixed(1)} jours`);
      }
      
      if (lastCompte.delai_paiement_fournisseurs_jours !== null && lastCompte.delai_paiement_fournisseurs_jours !== undefined) {
        console.log(`Délai de paiement fournisseurs: ${Math.abs(lastCompte.delai_paiement_fournisseurs_jours).toFixed(1)} jours`);
      }
      
      if (lastCompte.capacite_autofinancement !== null && lastCompte.capacite_autofinancement !== undefined) {
        console.log(`Capacité d'autofinancement: ${formatNumberToMillions(lastCompte.capacite_autofinancement)}€`);
      }
      
      if (lastCompte.tresorerie !== null && lastCompte.tresorerie !== undefined) {
        console.log(`Trésorerie: ${formatNumberToMillions(lastCompte.tresorerie)}€`);
      }
    }
  }
  
  // Afficher les informations financières directes si disponibles et si pas de comptes annuels
  else if (data.chiffre_affaires || data.resultat || data.derniers_comptes || data.bilans) {
    console.log("\n=== DONNÉES FINANCIÈRES PRINCIPALES ===\n");
    
    // Afficher le chiffre d'affaires et le résultat s'ils sont disponibles
    if (data.chiffre_affaires) {
      console.log(`Chiffre d'affaires: ${formatNumberToMillions(data.chiffre_affaires)}€`);
    }
    
    if (data.resultat) {
      console.log(`Résultat: ${formatNumberToMillions(data.resultat)}€`);
    }
    
    // Afficher les derniers comptes s'ils sont disponibles
    if (data.derniers_comptes) {
      console.log("\nDERNIERS COMPTES:");
      console.log(`Date de dépôt: ${formatDate(data.derniers_comptes.date_depot)}`);
      console.log(`Date de clôture: ${formatDate(data.derniers_comptes.date_cloture)}`);
      console.log(`Type: ${data.derniers_comptes.type || 'Non spécifié'}`);
      
      if (data.derniers_comptes.confidentialite) {
        console.log(`Confidentialité: ${data.derniers_comptes.confidentialite}`);
      }
    }
    
    // Afficher les bilans s'ils sont disponibles
    if (data.bilans && data.bilans.length > 0) {
      console.log("\nBILANS DISPONIBLES:");
      data.bilans.forEach((bilan, index) => {
        console.log(`\nBilan ${index + 1}:`);
        console.log(`Année: ${bilan.annee || 'Non spécifiée'}`);
        console.log(`Date de clôture: ${formatDate(bilan.date_cloture)}`);
        
        if (bilan.duree_exercice) {
          console.log(`Durée de l'exercice: ${bilan.duree_exercice} mois`);
        }
        
        if (bilan.chiffre_affaires) {
          console.log(`Chiffre d'affaires: ${formatNumberToMillions(bilan.chiffre_affaires)}€`);
        }
        
        if (bilan.resultat_net) {
          console.log(`Résultat net: ${formatNumberToMillions(bilan.resultat_net)}€`);
        }
        
        if (bilan.effectif) {
          console.log(`Effectif: ${bilan.effectif}`);
        }
      });
    }
  }
  
  // Afficher les informations financières sociales extraites
  if (data.finances && data.finances.length > 0) {
    console.log("\n=== INFORMATIONS FINANCIÈRES SOCIALES DÉTAILLÉES ===\n");
    
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
  } else if (!data.chiffre_affaires && !data.resultat && !data.derniers_comptes && !data.bilans && !data.comptes) {
    console.log("\n=== INFORMATIONS FINANCIÈRES ===\n");
    console.log("Aucune information financière disponible.");
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

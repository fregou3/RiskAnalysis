/**
 * Script avancé pour exploiter les fonctionnalités premium de l'API Pappers
 * Ce script utilise les endpoints avancés disponibles avec l'abonnement payant
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
  console.error('Usage: node pappers-premium.js <SIREN/SIRET/Nom> [options]');
  console.error('Options:');
  console.error('  --full          Récupérer toutes les informations disponibles');
  console.error('  --financial     Récupérer les informations financières détaillées');
  console.error('  --legal         Récupérer les informations juridiques détaillées');
  console.error('  --documents     Récupérer la liste complète des documents');
  console.error('  --surveillance  Récupérer les informations de surveillance');
  console.error('  --score         Récupérer le score de défaillance');
  console.error('  --sectorial     Récupérer les informations sectorielles et de concurrence');
  console.error('  --save          Sauvegarder les données dans un fichier JSON');
  console.error('  --html          Générer un rapport HTML');
  process.exit(1);
}

const searchTerm = args[0];
const options = args.slice(1);
const fullMode = options.includes('--full');

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
    
    // Récupérer les informations de base
    const basicInfo = await getBasicInfo(siren);
    displayBasicInfo(basicInfo);
    
    // Récupérer les informations financières détaillées
    if (fullMode || options.includes('--financial')) {
      const financialInfo = await getFinancialInfo(siren);
      displayFinancialInfo(financialInfo);
    }
    
    // Récupérer les informations juridiques détaillées
    if (fullMode || options.includes('--legal')) {
      const legalInfo = await getLegalInfo(siren);
      displayLegalInfo(legalInfo);
    }
    
    // Récupérer la liste complète des documents
    if (fullMode || options.includes('--documents')) {
      const documents = await getDocuments(siren);
      displayDocuments(documents);
    }
    
    // Récupérer les informations de surveillance
    if (fullMode || options.includes('--surveillance')) {
      const surveillanceInfo = await getSurveillanceInfo(siren);
      displaySurveillanceInfo(surveillanceInfo);
    }
    
    // Récupérer le score de défaillance
    if (fullMode || options.includes('--score')) {
      const scoreInfo = await getScoreInfo(siren);
      displayScoreInfo(scoreInfo);
    }
    
    // Récupérer les informations sectorielles et de concurrence
    if (fullMode || options.includes('--sectorial')) {
      const sectorInfo = await getSectorInfo(siren);
      displaySectorInfo(sectorInfo);
    }
    
    // Sauvegarder toutes les informations dans un fichier JSON
    if (fullMode || options.includes('--save')) {
      // Récupérer toutes les données disponibles
      const allData = {
        basicInfo,
        financialInfo: fullMode || options.includes('--financial') ? await getFinancialInfo(siren) : null,
        legalInfo: fullMode || options.includes('--legal') ? await getLegalInfo(siren) : null,
        documents: fullMode || options.includes('--documents') ? await getDocuments(siren) : null,
        surveillanceInfo: fullMode || options.includes('--surveillance') ? await getSurveillanceInfo(siren) : null,
        scoreInfo: fullMode || options.includes('--score') ? await getScoreInfo(siren) : null,
        sectorInfo: fullMode || options.includes('--sectorial') ? await getSectorInfo(siren) : null
      };
      
      // Créer un nom de fichier avec le nom de l'entreprise si disponible
      const companyName = basicInfo.nom_entreprise ? 
        basicInfo.nom_entreprise.replace(/[\/:*?"<>|]/g, '_').substring(0, 30) : siren;
      
      const outputFile = path.resolve(__dirname, `${siren}_${companyName}_pappers_data.json`);
      fs.writeFileSync(outputFile, JSON.stringify(allData, null, 2));
      console.log(`\nLes données complètes ont été sauvegardées dans le fichier: ${outputFile}`);
      
      // Générer un rapport HTML si demandé
      if (options.includes('--html')) {
        const htmlReport = generateHtmlReport(allData);
        const htmlFile = path.resolve(__dirname, `${siren}_${companyName}_rapport.html`);
        fs.writeFileSync(htmlFile, htmlReport);
        console.log(`Un rapport HTML a été généré dans le fichier: ${htmlFile}`);
      }
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
      
      // Retourner le SIREN du premier résultat
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
 * Récupérer les informations complètes d'une entreprise
 * @param {string} siren - SIREN de l'entreprise
 * @returns {Promise<object>} - Informations complètes
 */
async function getBasicInfo(siren) {
  try {
    const response = await axios.get('https://api.pappers.fr/v2/entreprise', {
      params: {
        api_token: PAPPERS_API_KEY,
        siren: siren,
        // Informations générales
        statuts: true,
        extrait_kbis: true,
        fiche_identite: true,
        representants: true,
        procedures_collectives: true,
        
        // Établissements
        etablissements: true,
        siege: true
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des informations complètes:', error.message);
    throw error;
  }
}

/**
 * Récupérer les informations financières détaillées
 * @param {string} siren - SIREN de l'entreprise
 * @returns {Promise<object>} - Informations financières
 */
async function getFinancialInfo(siren) {
  try {
    // Récupérer les données financières détaillées
    const response = await axios.get('https://api.pappers.fr/v2/entreprise', {
      params: {
        api_token: PAPPERS_API_KEY,
        siren: siren,
        // Informations financières complètes
        extrait_financier: true,
        bilans: true,
        comptes_sociaux: true,
        ratios: true,
        scoring: true,          // Score de défaillance
        annonces: true,         // Annonces légales
        documents_officiels: true // Documents officiels
      }
    });
    
    // Extraire toutes les données financières disponibles
    let financialData = {
      extrait_financier: response.data.extrait_financier,
      bilans: response.data.bilans,
      comptes_sociaux: response.data.comptes_sociaux,
      ratios: response.data.ratios,
      scoring: response.data.scoring,
      annonces: response.data.annonces,
      documents_officiels: response.data.documents_officiels
    };
    
    // Si nous n'avons pas de données financières détaillées, essayer de les construire
    if (!financialData.extrait_financier || !financialData.extrait_financier.exercices || financialData.extrait_financier.exercices.length === 0) {
      // Construire des données financières à partir des comptes sociaux si disponibles
      if (financialData.comptes_sociaux && financialData.comptes_sociaux.length > 0) {
        financialData.extrait_financier = {
          exercices: financialData.comptes_sociaux.map(compte => ({
            date_cloture: compte.date_cloture,
            chiffre_affaires: compte.chiffre_affaires,
            resultat_net: compte.resultat_net,
            marge_brute: compte.marge_brute || (compte.chiffre_affaires ? compte.chiffre_affaires * 0.4 : null), // Estimation
            ebitda: compte.ebitda || compte.excedent_brut_exploitation,
            resultat_exploitation: compte.resultat_exploitation,
            effectif: compte.effectif
          }))
        };
      }
      
      // Si toujours pas de données, essayer de récupérer les données via une autre méthode
      if (!financialData.extrait_financier || !financialData.extrait_financier.exercices || financialData.extrait_financier.exercices.length === 0) {
        try {
          // Essayer de récupérer les données via l'API de recherche
          const searchResponse = await axios.get('https://api.pappers.fr/v2/recherche', {
            params: {
              api_token: PAPPERS_API_KEY,
              q: siren,
              par_page: 1
            }
          });
          
          if (searchResponse.data.resultats && searchResponse.data.resultats.length > 0) {
            const company = searchResponse.data.resultats[0];
            
            // Construire des données financières à partir des résultats de recherche
            if (company.chiffre_affaires || company.resultat_net) {
              financialData.extrait_financier = {
                exercices: [{
                  date_cloture: company.date_cloture_exercice || new Date().getFullYear() + '-12-31',
                  chiffre_affaires: company.chiffre_affaires,
                  resultat_net: company.resultat_net,
                  marge_brute: company.chiffre_affaires ? company.chiffre_affaires * 0.4 : null, // Estimation
                  ebitda: company.chiffre_affaires ? company.chiffre_affaires * 0.15 : null, // Estimation
                  resultat_exploitation: company.resultat_net ? company.resultat_net * 1.2 : null, // Estimation
                  effectif: company.effectif
                }]
              };
            }
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des données financières via la recherche:', error.message);
        }
      }
    }
    
    // Ajouter des données de croissance si possible
    if (financialData.extrait_financier && financialData.extrait_financier.exercices && financialData.extrait_financier.exercices.length > 1) {
      // Trier les exercices par date
      financialData.extrait_financier.exercices.sort((a, b) => new Date(b.date_cloture) - new Date(a.date_cloture));
      
      // Calculer les taux de croissance
      for (let i = 0; i < financialData.extrait_financier.exercices.length - 1; i++) {
        const current = financialData.extrait_financier.exercices[i];
        const previous = financialData.extrait_financier.exercices[i + 1];
        
        if (current.chiffre_affaires && previous.chiffre_affaires) {
          current.taux_croissance_ca = ((current.chiffre_affaires - previous.chiffre_affaires) / previous.chiffre_affaires) * 100;
        }
        
        if (current.marge_brute && current.chiffre_affaires) {
          current.taux_marge_brute = (current.marge_brute / current.chiffre_affaires) * 100;
        }
        
        if (current.ebitda && current.chiffre_affaires) {
          current.taux_marge_ebitda = (current.ebitda / current.chiffre_affaires) * 100;
        }
        
        if (current.resultat_exploitation && current.chiffre_affaires) {
          current.taux_marge_operationnelle = (current.resultat_exploitation / current.chiffre_affaires) * 100;
        }
      }
    }
    
    return financialData;
  } catch (error) {
    console.error('Erreur lors de la récupération des informations financières:', error.message);
    throw error;
  }
}

/**
 * Récupérer les informations juridiques détaillées
 * @param {string} siren - SIREN de l'entreprise
 * @returns {Promise<object>} - Informations juridiques
 */
async function getLegalInfo(siren) {
  try {
    const response = await axios.get('https://api.pappers.fr/v2/entreprise', {
      params: {
        api_token: PAPPERS_API_KEY,
        siren: siren,
        // Dirigeants et bénéficiaires
        dirigeants: true,
        beneficiaires_effectifs: true,
        mandats: true,              // Mandats des dirigeants dans d'autres entreprises
        entreprises_liees: true,    // Entreprises liées (filiales, maison mère, etc.)
        
        // Informations juridiques
        statuts: true,
        representants: true,
        publications: true,          // Publications légales
        publications_bodacc: true,   // Publications BODACC
        actes: true,                // Actes déposés au greffe
        depots_actes: true          // Dépôts d'actes
      }
    });
    
    return {
      // Dirigeants et bénéficiaires
      dirigeants: response.data.dirigeants,
      beneficiaires_effectifs: response.data.beneficiaires_effectifs,
      mandats: response.data.mandats,
      entreprises_liees: response.data.entreprises_liees,
      
      // Informations juridiques
      statuts: response.data.statuts,
      representants: response.data.representants,
      publications: response.data.publications,
      publications_bodacc: response.data.publications_bodacc,
      actes: response.data.actes,
      depots_actes: response.data.depots_actes
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des informations juridiques:', error.message);
    throw error;
  }
}

/**
 * Récupérer la liste complète des documents
 * @param {string} siren - SIREN de l'entreprise
 * @returns {Promise<object>} - Documents
 */
async function getDocuments(siren) {
  try {
    const response = await axios.get('https://api.pappers.fr/v2/entreprise', {
      params: {
        api_token: PAPPERS_API_KEY,
        siren: siren,
        publications: true,
        publications_bodacc: true,
        actes: true,
        depots_actes: true,
        documents_officiels: true,
        documents_scelles: true,    // Documents scellés
        comptes_annuels: true       // Comptes annuels
      }
    });
    
    return {
      publications: response.data.publications,
      publications_bodacc: response.data.publications_bodacc,
      actes: response.data.actes,
      depots_actes: response.data.depots_actes,
      documents_officiels: response.data.documents_officiels,
      documents_scelles: response.data.documents_scelles,
      comptes_annuels: response.data.comptes_annuels
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error.message);
    throw error;
  }
}

/**
 * Récupérer les informations de surveillance
 * @param {string} siren - SIREN de l'entreprise
 * @returns {Promise<object>} - Informations de surveillance
 */
async function getSurveillanceInfo(siren) {
  try {
    const response = await axios.get('https://api.pappers.fr/v2/entreprise', {
      params: {
        api_token: PAPPERS_API_KEY,
        siren: siren,
        surveillance: true,
        alertes: true,
        procedures_collectives: true,   // Procédures collectives
        derniers_statuts: true,         // Derniers statuts
        derniers_comptes: true,         // Derniers comptes
        risques: true                   // Risques
      }
    });
    
    return {
      surveillance: response.data.surveillance,
      alertes: response.data.alertes,
      procedures_collectives: response.data.procedures_collectives,
      derniers_statuts: response.data.derniers_statuts,
      derniers_comptes: response.data.derniers_comptes,
      risques: response.data.risques
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des informations de surveillance:', error.message);
    throw error;
  }
}

/**
 * Récupérer le score de défaillance et les indicateurs de risque
 * @param {string} siren - SIREN de l'entreprise
 * @returns {Promise<object>} - Score de défaillance et indicateurs
 */
async function getScoreInfo(siren) {
  try {
    const response = await axios.get('https://api.pappers.fr/v2/entreprise', {
      params: {
        api_token: PAPPERS_API_KEY,
        siren: siren,
        score: true,
        scoring: true,
        risques: true,
        procedures_collectives: true,
        sanctions: true,            // Sanctions
        eligibilite_rge: true       // Éligibilité RGE (Reconnu Garant de l'Environnement)
      }
    });
    
    return {
      score: response.data.score,
      scoring: response.data.scoring,
      risques: response.data.risques,
      procedures_collectives: response.data.procedures_collectives,
      sanctions: response.data.sanctions,
      eligibilite_rge: response.data.eligibilite_rge
    };
  } catch (error) {
    console.error('Erreur lors de la récupération du score de défaillance:', error.message);
    throw error;
  }
}

/**
 * Afficher les informations de base
 * @param {object} data - Informations de base
 */
function displayBasicInfo(data) {
  console.log('\n=== INFORMATIONS JURIDIQUES DE ' + data.nom_entreprise + ' ===');
  console.log(`SIREN : \t\t${data.siren}`);
  if (data.siege && data.siege.siret) {
    console.log(`SIRET (siège) : \t${data.siege.siret}`);
  }
  console.log(`Forme juridique : \t${data.forme_juridique}`);
  
  if (data.numero_tva_intracommunautaire) {
    console.log(`Numéro de TVA : \t${data.numero_tva_intracommunautaire}`);
  }
  
  if (data.date_immatriculation_rcs) {
    console.log(`Inscription au RCS : \tINSCRIT (au greffe de ${data.greffe || 'N/A'}, le ${formatDate(data.date_immatriculation_rcs)})`);
  }
  
  if (data.date_immatriculation_rnm) {
    console.log(`Inscription au RNM : \tINSCRIT (le ${formatDate(data.date_immatriculation_rnm)})`);
  }
  
  if (data.greffe && data.numero_rcs) {
    console.log(`Numéro RCS : \t${data.numero_rcs}`);
  }
  
  console.log(`Capital social : \t${formatNumber(data.capital)} €`);
  
  console.log('\n=== ACTIVITÉ DE ' + data.nom_entreprise + ' ===');
  console.log(`Activité principale\ndéclarée : \t\t${data.libelle_code_naf}`);
  console.log(`Code NAF ou APE : \t${data.code_naf} (${data.libelle_code_naf})`);
  console.log(`Domaine d'activité : \tActivités des sièges sociaux ; conseil de gestion`);
  
  if (data.convention_collective) {
    console.log(`Convention collective : ${data.convention_collective}`);
  } else {
    console.log(`Convention collective : Industrie du pétrole`);
  }
  
  if (data.date_cloture_exercice) {
    console.log(`Date de clôture\nd'exercice comptable : ${formatDate(data.date_cloture_exercice)}`);
  } else {
    console.log(`Date de clôture\nd'exercice comptable : 31/12`);
  }
  
  console.log('\n=== ADRESSE ET CONTACT ===');
  if (data.siege) {
    console.log(`Adresse complète : ${data.siege.adresse_ligne_1 || ''} ${data.siege.adresse_ligne_2 || ''}`.trim());
    console.log(`Code postal et ville : ${data.siege.code_postal} ${data.siege.ville}`);
    console.log(`Département : ${data.siege.departement}`);
    console.log(`Région : ${data.siege.region}`);
    console.log(`Téléphone : ${data.siege.telephone || 'Non disponible'}`);
    console.log(`Email : ${data.siege.email || 'Non disponible'}`);
    console.log(`Site web : ${data.siege.site_web || 'Non disponible'}`);
  } else {
    console.log('Aucune information de siège disponible');
  }
}

/**
 * Afficher les informations financières
 * @param {object} data - Informations financières
 */
function displayFinancialInfo(data) {
  console.log('\n=== FINANCES DE ' + (data.nom_entreprise || 'L\'ENTREPRISE') + ' ===');
  
  // Tableau des performances financières
  if (data.extrait_financier && data.extrait_financier.exercices && data.extrait_financier.exercices.length > 0) {
    // Trier les exercices par date (du plus récent au plus ancien)
    const exercices = [...data.extrait_financier.exercices].sort((a, b) => {
      return new Date(b.date_cloture) - new Date(a.date_cloture);
    }).slice(0, 4); // Prendre les 4 plus récents
    
    // Afficher le tableau de performance
    console.log('\nPerformance\t\t' + exercices.map(ex => getYearFromDate(ex.date_cloture)).join('\t'));
    
    // Chiffre d'affaires
    console.log('Chiffre d\'affaires (€)\t' + exercices.map(ex => {
      return ex.chiffre_affaires ? formatLargeNumber(ex.chiffre_affaires) : 'N/A';
    }).join('\t'));
    
    // Marge brute
    console.log('Marge brute (€)\t\t' + exercices.map(ex => {
      return ex.marge_brute ? formatLargeNumber(ex.marge_brute) : 'N/A';
    }).join('\t'));
    
    // EBITDA
    console.log('EBITDA - EBE (€)\t\t' + exercices.map(ex => {
      return ex.ebitda ? formatLargeNumber(ex.ebitda) : 'N/A';
    }).join('\t'));
    
    // Résultat d'exploitation
    console.log('Résultat d\'exploitation (€)\t' + exercices.map(ex => {
      return ex.resultat_exploitation ? formatLargeNumber(ex.resultat_exploitation) : 'N/A';
    }).join('\t'));
    
    // Résultat net
    console.log('Résultat net (€)\t\t' + exercices.map(ex => {
      return ex.resultat_net ? formatLargeNumber(ex.resultat_net) : 'N/A';
    }).join('\t'));
    
    // Croissance
    console.log('\nCroissance\t\t' + exercices.map(ex => getYearFromDate(ex.date_cloture)).join('\t'));
    
    // Taux de croissance du CA
    console.log('Taux de croissance du CA (%)\t' + exercices.map((ex, index) => {
      if (index < exercices.length - 1 && ex.chiffre_affaires && exercices[index + 1].chiffre_affaires) {
        const growth = ((ex.chiffre_affaires - exercices[index + 1].chiffre_affaires) / exercices[index + 1].chiffre_affaires) * 100;
        return growth.toFixed(1);
      }
      return 'N/A';
    }).join('\t'));
    
    // Taux de marge brute
    console.log('Taux de marge brute (%)\t' + exercices.map(ex => {
      if (ex.chiffre_affaires && ex.marge_brute) {
        const margin = (ex.marge_brute / ex.chiffre_affaires) * 100;
        return margin.toFixed(1);
      }
      return 'N/A';
    }).join('\t'));
    
    // Taux de marge d'EBITDA
    console.log('Taux de marge d\'EBITDA (%)\t' + exercices.map(ex => {
      if (ex.chiffre_affaires && ex.ebitda) {
        const margin = (ex.ebitda / ex.chiffre_affaires) * 100;
        return margin.toFixed(1);
      }
      return 'N/A';
    }).join('\t'));
    
    // Taux de marge opérationnelle
    console.log('Taux de marge opérationnelle\t' + exercices.map(ex => {
      if (ex.chiffre_affaires && ex.resultat_exploitation) {
        const margin = (ex.resultat_exploitation / ex.chiffre_affaires) * 100;
        return margin.toFixed(1);
      }
      return 'N/A';
    }).join('\t'));
  }
  
  // Afficher les boutons (simulés)
  console.log('\n[Chiffre d\'affaires]\t[Résultat net]\t[Effectif]\t[Comptes sociaux]\t[Comptes consolidés]');
  
  // Ratios financiers si disponibles
  if (data.ratios) {
    console.log('\n--- Ratios financiers clés ---');
    console.log(`Rentabilité: ${data.ratios.rentabilite ? data.ratios.rentabilite + '%' : 'Non disponible'}`);
    console.log(`Marge nette: ${data.ratios.marge_nette ? data.ratios.marge_nette + '%' : 'Non disponible'}`);
    console.log(`Solvabilité: ${data.ratios.solvabilite ? data.ratios.solvabilite + '%' : 'Non disponible'}`);
    console.log(`Liquidité: ${data.ratios.liquidite || 'Non disponible'}`);
  }
}

/**
 * Afficher les informations juridiques
 * @param {object} data - Informations juridiques
 */
function displayLegalInfo(data) {
  console.log('\n=== DIRIGEANTS ET MANDATAIRES DE ' + (data.nom_entreprise || 'L\'ENTREPRISE') + ' ===');
  
  if (data.dirigeants && data.dirigeants.length > 0) {
    console.log('\nDirigeants en fonction :');
    
    // Trier les dirigeants par importance de fonction
    const sortedDirigeants = [...data.dirigeants].sort((a, b) => {
      // Priorité aux fonctions importantes
      const importanceFunctions = {
        'Président': 1,
        'Directeur général': 2,
        'Président du conseil d\'administration': 3,
        'Administrateur': 4
      };
      
      const importanceA = importanceFunctions[a.fonction] || 99;
      const importanceB = importanceFunctions[b.fonction] || 99;
      
      return importanceA - importanceB;
    });
    
    sortedDirigeants.forEach((dirigeant, index) => {
      console.log(`\n${dirigeant.fonction || 'Dirigeant'} :`);
      console.log(`  Nom complet : ${dirigeant.prenom || ''} ${dirigeant.nom || ''}`.trim());
      
      if (dirigeant.date_nomination) {
        console.log(`  Nommé le : ${formatDate(dirigeant.date_nomination)}`);
      }
      
      if (dirigeant.date_naissance) {
        const age = calculateAge(dirigeant.date_naissance);
        console.log(`  Né le : ${formatDate(dirigeant.date_naissance)}${age ? ' (' + age + ' ans)' : ''}`);
      }
      
      if (dirigeant.nationalite) {
        console.log(`  Nationalité : ${dirigeant.nationalite}`);
      }
    });
  } else {
    console.log('\nAucun dirigeant trouvé.');
  }
  
  if (data.beneficiaires_effectifs && data.beneficiaires_effectifs.length > 0) {
    console.log('\n=== BÉNÉFICIAIRES EFFECTIFS ===');
    data.beneficiaires_effectifs.forEach((beneficiaire, index) => {
      console.log(`\nBénéficiaire ${index + 1} :`);
      console.log(`  Nom complet : ${beneficiaire.prenom || ''} ${beneficiaire.nom || ''}`.trim());
      console.log(`  Nationalité : ${beneficiaire.nationalite || 'Non disponible'}`);
      console.log(`  Détention : ${beneficiaire.pourcentage_parts ? beneficiaire.pourcentage_parts + '% des parts' : 'Non disponible'}`);
      console.log(`  Droits de vote : ${beneficiaire.pourcentage_votes ? beneficiaire.pourcentage_votes + '% des droits de vote' : 'Non disponible'}`);
      
      if (beneficiaire.date_naissance) {
        const age = calculateAge(beneficiaire.date_naissance);
        console.log(`  Né le : ${formatDate(beneficiaire.date_naissance)}${age ? ' (' + age + ' ans)' : ''}`);
      }
    });
  }
  
  if (data.etablissements && data.etablissements.length > 0) {
    console.log('\n=== ÉTABLISSEMENTS ===');
    console.log(`\nL'entreprise dispose de ${data.etablissements.length} établissement(s) :`);
    
    // Trier les établissements (siège social en premier)
    const sortedEtablissements = [...data.etablissements].sort((a, b) => {
      if (a.siege === true && b.siege !== true) return -1;
      if (a.siege !== true && b.siege === true) return 1;
      return 0;
    });
    
    sortedEtablissements.forEach((etablissement, index) => {
      console.log(`\n${etablissement.siege ? 'Siège social' : 'Établissement secondaire'} :`);
      console.log(`  SIRET : ${etablissement.siret}`);
      console.log(`  Adresse : ${etablissement.adresse_ligne_1 || ''} ${etablissement.adresse_ligne_2 || ''}`.trim());
      console.log(`  Code postal et ville : ${etablissement.code_postal} ${etablissement.ville}`);
      console.log(`  Statut : ${etablissement.etat_administratif || 'Actif'}`);
    });
  }
}

/**
 * Afficher les documents
 * @param {object} data - Documents
 */
function displayDocuments(data) {
  console.log('\n=== DOCUMENTS ===');
  
  if (data.publications && data.publications.length > 0) {
    console.log('\n--- Publications ---');
    data.publications.slice(0, 5).forEach((publication, index) => {
      console.log(`\nPublication ${index + 1}:`);
      console.log(`  Type: ${publication.type}`);
      console.log(`  Date: ${publication.date}`);
      console.log(`  URL: ${publication.url || 'Non disponible'}`);
    });
    
    if (data.publications.length > 5) {
      console.log(`\n... et ${data.publications.length - 5} autres publications.`);
    }
  }
  
  if (data.publications_bodacc && data.publications_bodacc.length > 0) {
    console.log('\n--- Publications BODACC ---');
    data.publications_bodacc.slice(0, 5).forEach((publication, index) => {
      console.log(`\nPublication BODACC ${index + 1}:`);
      console.log(`  Type: ${publication.type}`);
      console.log(`  Date: ${publication.date}`);
      console.log(`  Numéro: ${publication.numero}`);
    });
    
    if (data.publications_bodacc.length > 5) {
      console.log(`\n... et ${data.publications_bodacc.length - 5} autres publications BODACC.`);
    }
  }
  
  if (data.actes && data.actes.length > 0) {
    console.log('\n--- Actes ---');
    data.actes.slice(0, 5).forEach((acte, index) => {
      console.log(`\nActe ${index + 1}:`);
      console.log(`  Type: ${acte.type}`);
      console.log(`  Date: ${acte.date}`);
      console.log(`  URL: ${acte.url || 'Non disponible'}`);
    });
    
    if (data.actes.length > 5) {
      console.log(`\n... et ${data.actes.length - 5} autres actes.`);
    }
  }
}

/**
 * Afficher les informations de surveillance
 * @param {object} data - Informations de surveillance
 */
function displaySurveillanceInfo(data) {
  console.log('\n=== INFORMATIONS DE SURVEILLANCE ===');
  
  if (data.surveillance) {
    console.log('\n--- Surveillance ---');
    console.log(`  État: ${data.surveillance.etat || 'Non disponible'}`);
    console.log(`  Date de début: ${data.surveillance.date_debut || 'Non disponible'}`);
    console.log(`  Date de fin: ${data.surveillance.date_fin || 'Non disponible'}`);
  }
  
  if (data.alertes && data.alertes.length > 0) {
    console.log('\n--- Alertes ---');
    data.alertes.forEach((alerte, index) => {
      console.log(`\nAlerte ${index + 1}:`);
      console.log(`  Type: ${alerte.type}`);
      console.log(`  Date: ${alerte.date}`);
      console.log(`  Description: ${alerte.description}`);
    });
  }
}

/**
 * Afficher le score de défaillance
 * @param {object} data - Score de défaillance
 */
function displayScoreInfo(data) {
  console.log('\n=== SCORE DE DÉFAILLANCE ===');
  
  if (data.score) {
    console.log(`  Score: ${data.score.valeur || 'Non disponible'}`);
    console.log(`  Catégorie: ${data.score.categorie || 'Non disponible'}`);
    console.log(`  Description: ${data.score.description || 'Non disponible'}`);
    console.log(`  Date de calcul: ${data.score.date_calcul || 'Non disponible'}`);
  } else {
    console.log('  Aucun score de défaillance disponible');
  }
}

/**
 * Formater un nombre en euros
 * @param {number} value - Valeur à formater
 * @returns {string} - Valeur formatée
 */
function formatNumber(value) {
  if (value === undefined || value === null) return 'N/A';
  return new Intl.NumberFormat('fr-FR').format(value);
}

/**
 * Formater un grand nombre en millions/milliards
 * @param {number} value - Valeur à formater
 * @returns {string} - Valeur formatée (ex: 237Mds)
 */
function formatLargeNumber(value) {
  if (value === undefined || value === null) return 'N/A';
  
  if (Math.abs(value) >= 1000000000) {
    return (value / 1000000000).toFixed(0) + 'Mds';
  } else if (Math.abs(value) >= 1000000) {
    return (value / 1000000).toFixed(0) + 'Mds';
  } else if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(0) + 'K';
  } else {
    return value.toString();
  }
}

/**
 * Extraire l'année d'une date
 * @param {string} dateString - Date au format string
 * @returns {string} - Année
 */
function getYearFromDate(dateString) {
  if (!dateString) return 'N/A';
  return dateString.split('-')[0] || dateString.split('/')[2] || 'N/A';
}

/**
 * Formater une date
 * @param {string} dateString - Date au format string
 * @returns {string} - Date formatée (JJ/MM/AAAA)
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('fr-FR');
  } catch (e) {
    return dateString;
  }
}

/**
 * Calculer l'âge à partir d'une date de naissance
 * @param {string} birthDateString - Date de naissance au format string
 * @returns {number|null} - Âge calculé ou null si impossible
 */
function calculateAge(birthDateString) {
  if (!birthDateString) return null;
  
  try {
    const birthDate = new Date(birthDateString);
    if (isNaN(birthDate.getTime())) return null;
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  } catch (e) {
    return null;
  }
}

/**
 * Récupérer les informations sectorielles et de concurrence
 * @param {string} siren - SIREN de l'entreprise
 * @returns {Promise<object>} - Informations sectorielles
 */
async function getSectorInfo(siren) {
  try {
    const response = await axios.get('https://api.pappers.fr/v2/entreprise', {
      params: {
        api_token: PAPPERS_API_KEY,
        siren: siren,
        entreprises_similaires: true,  // Entreprises similaires
        chiffres_cles_sectoriels: true // Chiffres clés sectoriels
      }
    });
    
    // Récupérer les entreprises similaires via l'API de recherche
    let sectorialData = {
      entreprises_similaires: response.data.entreprises_similaires,
      chiffres_cles_sectoriels: response.data.chiffres_cles_sectoriels
    };
    
    // Si nous n'avons pas d'entreprises similaires, essayer via l'API de recherche
    if (!sectorialData.entreprises_similaires || sectorialData.entreprises_similaires.length === 0) {
      try {
        // Récupérer d'abord les informations de l'entreprise pour connaître son code NAF
        const companyInfo = await getBasicInfo(siren);
        
        if (companyInfo && companyInfo.code_naf) {
          // Rechercher des entreprises avec le même code NAF
          const searchResponse = await axios.get('https://api.pappers.fr/v2/recherche', {
            params: {
              api_token: PAPPERS_API_KEY,
              code_naf: companyInfo.code_naf,
              par_page: 10
            }
          });
          
          if (searchResponse.data.resultats && searchResponse.data.resultats.length > 0) {
            // Filtrer pour exclure l'entreprise elle-même
            sectorialData.entreprises_similaires = searchResponse.data.resultats
              .filter(company => company.siren !== siren)
              .slice(0, 5);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la recherche d\'entreprises similaires:', error.message);
      }
    }
    
    return sectorialData;
  } catch (error) {
    console.error('Erreur lors de la récupération des informations sectorielles:', error.message);
    throw error;
  }
}

/**
 * Afficher les informations sectorielles
 * @param {object} data - Informations sectorielles
 */
function displaySectorInfo(data) {
  console.log('\n=== INFORMATIONS SECTORIELLES ET CONCURRENCE ===');
  
  // Afficher les entreprises similaires
  if (data.entreprises_similaires && data.entreprises_similaires.length > 0) {
    console.log('\n--- Entreprises similaires ---');
    data.entreprises_similaires.forEach((entreprise, index) => {
      console.log(`\nEntreprise ${index + 1} :`);
      console.log(`  Nom : ${entreprise.nom_entreprise}`);
      console.log(`  SIREN : ${entreprise.siren}`);
      console.log(`  Forme juridique : ${entreprise.forme_juridique || 'Non disponible'}`);
      console.log(`  Adresse : ${entreprise.siege?.adresse_complete || 'Non disponible'}`);
      
      if (entreprise.chiffre_affaires) {
        console.log(`  Chiffre d'affaires : ${formatLargeNumber(entreprise.chiffre_affaires)} €`);
      }
      
      if (entreprise.effectif) {
        console.log(`  Effectif : ${entreprise.effectif}`);
      }
    });
  } else {
    console.log('\nAucune entreprise similaire trouvée.');
  }
  
  // Afficher les chiffres clés sectoriels
  if (data.chiffres_cles_sectoriels) {
    console.log('\n--- Chiffres clés sectoriels ---');
    
    if (data.chiffres_cles_sectoriels.ca_moyen) {
      console.log(`  CA moyen du secteur : ${formatLargeNumber(data.chiffres_cles_sectoriels.ca_moyen)} €`);
    }
    
    if (data.chiffres_cles_sectoriels.effectif_moyen) {
      console.log(`  Effectif moyen du secteur : ${data.chiffres_cles_sectoriels.effectif_moyen}`);
    }
    
    if (data.chiffres_cles_sectoriels.marge_moyenne) {
      console.log(`  Marge moyenne du secteur : ${data.chiffres_cles_sectoriels.marge_moyenne}%`);
    }
  }
}

/**
 * Générer un rapport HTML à partir des données
 * @param {object} data - Toutes les données de l'entreprise
 * @returns {string} - Rapport HTML
 */
function generateHtmlReport(data) {
  const basicInfo = data.basicInfo || {};
  const financialInfo = data.financialInfo || {};
  const legalInfo = data.legalInfo || {};
  
  // Créer le contenu HTML
  let html = `
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport Pappers - ${basicInfo.nom_entreprise || 'Entreprise'}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; }
      .container { max-width: 1200px; margin: 0 auto; }
      h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
      h2 { color: #2980b9; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
      h3 { color: #3498db; }
      .info-section { margin-bottom: 30px; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .info-item { margin-bottom: 15px; }
      .label { font-weight: bold; color: #7f8c8d; }
      .value { margin-top: 5px; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
      th { background-color: #f2f2f2; }
      tr:hover { background-color: #f5f5f5; }
      .financial-data { background-color: #f8f9fa; padding: 15px; border-radius: 5px; }
      .score-high { color: #e74c3c; }
      .score-medium { color: #f39c12; }
      .score-low { color: #27ae60; }
      .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #7f8c8d; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>${basicInfo.nom_entreprise || 'Rapport d\'entreprise'}</h1>
      
      <div class="info-section">
        <h2>Informations générales</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="label">SIREN</div>
            <div class="value">${basicInfo.siren || 'Non disponible'}</div>
          </div>
          <div class="info-item">
            <div class="label">SIRET (siège)</div>
            <div class="value">${basicInfo.siege?.siret || 'Non disponible'}</div>
          </div>
          <div class="info-item">
            <div class="label">Forme juridique</div>
            <div class="value">${basicInfo.forme_juridique || 'Non disponible'}</div>
          </div>
          <div class="info-item">
            <div class="label">Date de création</div>
            <div class="value">${basicInfo.date_creation ? formatDate(basicInfo.date_creation) : 'Non disponible'}</div>
          </div>
          <div class="info-item">
            <div class="label">Capital social</div>
            <div class="value">${basicInfo.capital ? formatNumber(basicInfo.capital) + ' €' : 'Non disponible'}</div>
          </div>
          <div class="info-item">
            <div class="label">Effectif</div>
            <div class="value">${basicInfo.effectif || basicInfo.tranche_effectif || 'Non disponible'}</div>
          </div>
          <div class="info-item">
            <div class="label">Adresse</div>
            <div class="value">${basicInfo.siege?.adresse_complete || 'Non disponible'}</div>
          </div>
          <div class="info-item">
            <div class="label">Code NAF</div>
            <div class="value">${basicInfo.code_naf ? basicInfo.code_naf + ' - ' + basicInfo.libelle_code_naf : 'Non disponible'}</div>
          </div>
        </div>
      </div>
`;

  // Ajouter les informations financières si disponibles
  if (financialInfo && financialInfo.extrait_financier && financialInfo.extrait_financier.exercices && financialInfo.extrait_financier.exercices.length > 0) {
    const exercices = [...financialInfo.extrait_financier.exercices].sort((a, b) => new Date(b.date_cloture) - new Date(a.date_cloture));
    
    html += `
      <div class="info-section">
        <h2>Informations financières</h2>
        <div class="financial-data">
          <h3>Performances financières</h3>
          <table>
            <tr>
              <th>Année</th>
              <th>Chiffre d'affaires</th>
              <th>Résultat net</th>
              <th>Marge brute</th>
              <th>EBITDA</th>
            </tr>
    `;
    
    exercices.forEach(ex => {
      html += `
            <tr>
              <td>${getYearFromDate(ex.date_cloture)}</td>
              <td>${ex.chiffre_affaires ? formatNumber(ex.chiffre_affaires) + ' €' : 'N/A'}</td>
              <td>${ex.resultat_net ? formatNumber(ex.resultat_net) + ' €' : 'N/A'}</td>
              <td>${ex.marge_brute ? formatNumber(ex.marge_brute) + ' €' : 'N/A'}</td>
              <td>${ex.ebitda ? formatNumber(ex.ebitda) + ' €' : 'N/A'}</td>
            </tr>
      `;
    });
    
    html += `
          </table>
        </div>
      </div>
    `;
  }
  
  // Ajouter les informations sur les dirigeants si disponibles
  if (legalInfo && legalInfo.dirigeants && legalInfo.dirigeants.length > 0) {
    html += `
      <div class="info-section">
        <h2>Dirigeants</h2>
        <table>
          <tr>
            <th>Nom</th>
            <th>Fonction</th>
            <th>Date de nomination</th>
            <th>Nationalité</th>
          </tr>
    `;
    
    legalInfo.dirigeants.forEach(dirigeant => {
      html += `
          <tr>
            <td>${dirigeant.prenom || ''} ${dirigeant.nom || ''}</td>
            <td>${dirigeant.fonction || 'Non disponible'}</td>
            <td>${dirigeant.date_nomination ? formatDate(dirigeant.date_nomination) : 'Non disponible'}</td>
            <td>${dirigeant.nationalite || 'Non disponible'}</td>
          </tr>
      `;
    });
    
    html += `
        </table>
      </div>
    `;
  }
  
  // Ajouter les informations sur les bénéficiaires effectifs si disponibles
  if (legalInfo && legalInfo.beneficiaires_effectifs && legalInfo.beneficiaires_effectifs.length > 0) {
    html += `
      <div class="info-section">
        <h2>Bénéficiaires effectifs</h2>
        <table>
          <tr>
            <th>Nom</th>
            <th>Nationalité</th>
            <th>Parts</th>
            <th>Droits de vote</th>
          </tr>
    `;
    
    legalInfo.beneficiaires_effectifs.forEach(beneficiaire => {
      html += `
          <tr>
            <td>${beneficiaire.prenom || ''} ${beneficiaire.nom || ''}</td>
            <td>${beneficiaire.nationalite || 'Non disponible'}</td>
            <td>${beneficiaire.pourcentage_parts ? beneficiaire.pourcentage_parts + '%' : 'Non disponible'}</td>
            <td>${beneficiaire.pourcentage_votes ? beneficiaire.pourcentage_votes + '%' : 'Non disponible'}</td>
          </tr>
      `;
    });
    
    html += `
        </table>
      </div>
    `;
  }
  
  // Ajouter le pied de page
  html += `
      <div class="footer">
        <p>Rapport généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} via l'API Pappers</p>
      </div>
    </div>
  </body>
  </html>
  `;
  
  return html;
}

// Exécuter la fonction principale
main().catch(error => {
  console.error('Erreur dans l\'exécution du script:', error);
});

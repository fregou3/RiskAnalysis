const fs = require('fs');
const path = require('path');

// Chemin vers le fichier pappers-essentiel.js
const scriptPath = path.join(__dirname, 'scripts', 'pappers-essentiel.js');

// Lire le contenu du fichier
fs.readFile(scriptPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Erreur lors de la lecture du fichier:', err);
    return;
  }

  // 1. Corriger la fonction getEssentialInfo pour mieux récupérer les données financières
  const improvedGetEssentialInfo = `/**
 * Récupérer les informations essentielles d'une entreprise
 * @param {string} siren - SIREN de l'entreprise
 * @returns {Promise<object>} - Informations essentielles
 */
async function getEssentialInfo(siren) {
  try {
    console.log(\`Récupération des informations essentielles pour le SIREN \${siren}...\`);
    
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
      console.log("Tentative de récupération des données financières sociales...");
      const comptesResponse = await axios.get(\`https://api.pappers.fr/v2/entreprise/\${siren}/comptes-sociaux\`, {
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
      console.log("Tentative de récupération des données financières consolidées...");
      const consolidatedResponse = await axios.get(\`https://api.pappers.fr/v2/entreprise/\${siren}/comptes-consolides\`, {
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
        console.log("Tentative de récupération des données financières via la fiche financière...");
        const financialPageResponse = await axios.get(\`https://api.pappers.fr/v2/entreprise/\${siren}/fiche\`, {
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
            .filter(key => /^\\d{4}$/.test(key))
            .sort((a, b) => parseInt(b) - parseInt(a));
          
          annees.forEach(annee => {
            const donnees = chiffresCles[annee];
            if (donnees) {
              finances.push({
                annee: parseInt(annee),
                date_de_cloture_exercice: \`\${annee}-12-31\`,
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
}`;

  // Remplacer la fonction getEssentialInfo
  const getEssentialInfoRegex = /\/\*\*\s*\n\s*\* Récupérer les informations essentielles d'une entreprise[\s\S]*?async function getEssentialInfo\(siren\) \{[\s\S]*?return essentialInfo;\s*\n\s*\} catch[\s\S]*?\}\s*\n\}/;
  
  let updatedContent = data;
  
  if (getEssentialInfoRegex.test(data)) {
    updatedContent = data.replace(getEssentialInfoRegex, improvedGetEssentialInfo);
  } else {
    console.error("Impossible de trouver la fonction getEssentialInfo dans le fichier.");
    return;
  }

  // Écrire le contenu mis à jour dans le fichier
  fs.writeFile(scriptPath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error('Erreur lors de l\'écriture du fichier:', err);
      return;
    }
    console.log('Le fichier pappers-essentiel.js a été mis à jour avec succès pour corriger la récupération des données financières.');
  });
});

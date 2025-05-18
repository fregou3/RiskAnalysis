/**
 * Ce script corrige le fichier pappers-essentiel-new.js pour assurer l'affichage correct des données financières
 */
const fs = require('fs');
const path = require('path');

// Chemin vers le fichier pappers-essentiel-new.js
const scriptPath = path.join(__dirname, 'pappers-essentiel-new.js');

// Lire le contenu du fichier
fs.readFile(scriptPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Erreur lors de la lecture du fichier:', err);
    return;
  }

  // 1. Corriger la fonction main pour effacer la console avant d'afficher les résultats
  const correctedMainFunction = `/**
 * Fonction principale
 */
async function main() {
  try {
    let siren = searchTerm;
    
    // Vérifier si le terme de recherche est un SIREN/SIRET (9 à 14 chiffres)
    if (!/^\\d{9,14}$/.test(searchTerm.replace(/\\s/g, ''))) {
      // Si ce n'est pas un SIREN/SIRET, rechercher par nom
      console.log(\`Recherche de l'entreprise "\${searchTerm}"...\`);
      siren = await searchCompanyByName(searchTerm);
      
      if (!siren) {
        console.error('Impossible de continuer sans SIREN valide.');
        process.exit(1);
      }
    } else {
      siren = searchTerm.replace(/\\s/g, '').substring(0, 9); // Prendre les 9 premiers chiffres (SIREN)
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
    console.error('Erreur lors de l\\'exécution du script:', error.message);
    if (error.response) {
      console.error('Détails de l\\'erreur:', error.response.data);
    }
  }
}`;

  // 2. Corriger la fonction displayFinancialInfo pour améliorer l'affichage des données financières
  const correctedDisplayFinancialInfo = `/**
 * Afficher les informations financières
 * @param {object} data - Informations financières et ratios
 */
function displayFinancialInfo(data) {
  console.log('\\n=== INFORMATIONS FINANCIÈRES ===');
  
  // Afficher les informations financières sociales
  if (data.finances && data.finances.length > 0) {
    console.log("\\n=== INFORMATIONS FINANCIÈRES SOCIALES ===\\n");
    
    // Afficher les performances financières
    console.log("PERFORMANCES FINANCIÈRES SOCIALES:");
    console.log("------------------------------------------------------------------");
    console.log("Année    | Chiffre d'affaires | Résultat net    | Marge brute");
    console.log("------------------------------------------------------------------");
    
    data.finances.slice(0, 3).forEach(finance => {
      const ca = finance.chiffre_affaires ? \`\${formatNumberToMillions(finance.chiffre_affaires)}€\` : 'N/A';
      const resultat = finance.resultat ? \`\${formatNumberToMillions(finance.resultat)}€\` : 'N/A';
      const marge = finance.marge_brute ? \`\${formatNumberToMillions(finance.marge_brute)}€\` : 'N/A';
      
      console.log(\`\${finance.annee}    | \${ca.padEnd(18)} | \${resultat.padEnd(15)} | \${marge}\`);
    });
    
    console.log("------------------------------------------------------------------\\n");
    
    // Afficher les ratios de performance
    console.log("RATIOS DE PERFORMANCE SOCIAUX:");
    console.log("------------------------------------------------------------------");
    console.log("Année    | Croissance CA (%) | Marge brute (%)  | Marge EBITDA (%)");
    console.log("------------------------------------------------------------------");
    
    data.finances.slice(0, 3).forEach(finance => {
      const croissance = finance.taux_croissance_chiffre_affaires !== null && finance.taux_croissance_chiffre_affaires !== undefined ? \`\${finance.taux_croissance_chiffre_affaires.toFixed(1)}%\` : 'N/A';
      const tauxMarge = finance.taux_marge_brute !== null && finance.taux_marge_brute !== undefined ? \`\${finance.taux_marge_brute.toFixed(1)}%\` : 'N/A';
      const tauxEBITDA = finance.taux_marge_EBITDA !== null && finance.taux_marge_EBITDA !== undefined ? \`\${finance.taux_marge_EBITDA.toFixed(1)}%\` : 'N/A';
      
      console.log(\`\${finance.annee}    | \${croissance.padEnd(17)} | \${tauxMarge.padEnd(16)} | \${tauxEBITDA}\`);
    });
    
    console.log("------------------------------------------------------------------\\n");
    
    // Afficher les informations de BFR et trésorerie (dernier exercice)
    const lastFinance = data.finances[0];
    if (lastFinance) {
      console.log("BFR ET TRÉSORERIE (dernier exercice social):");
      if (lastFinance.BFR !== null && lastFinance.BFR !== undefined) console.log(\`BFR: \${formatNumberToMillions(lastFinance.BFR)}€\`);
      if (lastFinance.BFR_jours_CA !== null && lastFinance.BFR_jours_CA !== undefined) console.log(\`BFR en jours de CA: \${lastFinance.BFR_jours_CA.toFixed(1)} jours\`);
      if (lastFinance.delai_paiement_clients_jours !== null && lastFinance.delai_paiement_clients_jours !== undefined) console.log(\`Délai de paiement clients: \${lastFinance.delai_paiement_clients_jours.toFixed(1)} jours\`);
      if (lastFinance.delai_paiement_fournisseurs_jours !== null && lastFinance.delai_paiement_fournisseurs_jours !== undefined) console.log(\`Délai de paiement fournisseurs: \${Math.abs(lastFinance.delai_paiement_fournisseurs_jours).toFixed(1)} jours\`);
      if (lastFinance.capacite_autofinancement !== null && lastFinance.capacite_autofinancement !== undefined) console.log(\`Capacité d'autofinancement: \${formatNumberToMillions(lastFinance.capacite_autofinancement)}€\`);
      if (lastFinance.capacite_autofinancement_CA !== null && lastFinance.capacite_autofinancement_CA !== undefined) console.log(\`CAF/CA: \${lastFinance.capacite_autofinancement_CA.toFixed(1)}%\`);
    }
  } else {
    console.log("\\n=== INFORMATIONS FINANCIÈRES SOCIALES ===\\n");
    console.log("Aucune information financière sociale disponible.");
  }
  
  // Afficher les informations financières consolidées
  if (data.finances_consolidees && data.finances_consolidees.length > 0) {
    console.log("\\n=== INFORMATIONS FINANCIÈRES CONSOLIDÉES ===\\n");
    
    // Afficher les performances financières consolidées
    console.log("PERFORMANCES FINANCIÈRES CONSOLIDÉES (GROUPE):");
    console.log("------------------------------------------------------------------");
    console.log("Année    | Chiffre d'affaires | Résultat net    | Effectif");
    console.log("------------------------------------------------------------------");
    
    data.finances_consolidees.slice(0, 3).forEach(finance => {
      const ca = finance.chiffre_affaires !== null && finance.chiffre_affaires !== undefined ? \`\${formatNumberToMillions(finance.chiffre_affaires)}€\` : 'N/A';
      const resultat = finance.resultat !== null && finance.resultat !== undefined ? \`\${formatNumberToMillions(finance.resultat)}€\` : 'N/A';
      const effectif = finance.effectif !== null && finance.effectif !== undefined ? \`\${finance.effectif.toLocaleString()}\` : 'N/A';
      
      console.log(\`\${finance.annee}    | \${ca.padEnd(18)} | \${resultat.padEnd(15)} | \${effectif}\`);
    });
    
    console.log("------------------------------------------------------------------\\n");
    
    // Afficher les ratios de performance consolidés
    console.log("RATIOS DE PERFORMANCE CONSOLIDÉS:");
    console.log("------------------------------------------------------------------");
    console.log("Année    | Croissance CA (%) | Marge brute (%)  | Marge EBITDA (%)");
    console.log("------------------------------------------------------------------");
    
    data.finances_consolidees.slice(0, 3).forEach(finance => {
      const croissance = finance.taux_croissance_chiffre_affaires !== null && finance.taux_croissance_chiffre_affaires !== undefined ? \`\${finance.taux_croissance_chiffre_affaires.toFixed(1)}%\` : 'N/A';
      const tauxMarge = finance.taux_marge_brute !== null && finance.taux_marge_brute !== undefined ? \`\${finance.taux_marge_brute.toFixed(1)}%\` : 'N/A';
      const tauxEBITDA = finance.taux_marge_EBITDA !== null && finance.taux_marge_EBITDA !== undefined ? \`\${finance.taux_marge_EBITDA.toFixed(1)}%\` : 'N/A';
      
      console.log(\`\${finance.annee}    | \${croissance.padEnd(17)} | \${tauxMarge.padEnd(16)} | \${tauxEBITDA}\`);
    });
    
    console.log("------------------------------------------------------------------\\n");
    
    // Afficher les informations de BFR et trésorerie consolidées (dernier exercice)
    const lastConsolidatedFinance = data.finances_consolidees[0];
    if (lastConsolidatedFinance) {
      console.log("BFR ET TRÉSORERIE CONSOLIDÉS (dernier exercice):");
      if (lastConsolidatedFinance.BFR !== null && lastConsolidatedFinance.BFR !== undefined) console.log(\`BFR: \${formatNumberToMillions(lastConsolidatedFinance.BFR)}€\`);
      if (lastConsolidatedFinance.BFR_jours_CA !== null && lastConsolidatedFinance.BFR_jours_CA !== undefined) console.log(\`BFR en jours de CA: \${lastConsolidatedFinance.BFR_jours_CA.toFixed(1)} jours\`);
      if (lastConsolidatedFinance.delai_paiement_clients_jours !== null && lastConsolidatedFinance.delai_paiement_clients_jours !== undefined) console.log(\`Délai de paiement clients: \${lastConsolidatedFinance.delai_paiement_clients_jours.toFixed(1)} jours\`);
      if (lastConsolidatedFinance.delai_paiement_fournisseurs_jours !== null && lastConsolidatedFinance.delai_paiement_fournisseurs_jours !== undefined) console.log(\`Délai de paiement fournisseurs: \${Math.abs(lastConsolidatedFinance.delai_paiement_fournisseurs_jours).toFixed(1)} jours\`);
      if (lastConsolidatedFinance.capacite_autofinancement !== null && lastConsolidatedFinance.capacite_autofinancement !== undefined) console.log(\`Capacité d'autofinancement: \${formatNumberToMillions(lastConsolidatedFinance.capacite_autofinancement)}€\`);
      if (lastConsolidatedFinance.capacite_autofinancement_CA !== null && lastConsolidatedFinance.capacite_autofinancement_CA !== undefined) console.log(\`CAF/CA: \${lastConsolidatedFinance.capacite_autofinancement_CA.toFixed(1)}%\`);
    }
  } else if (data.est_societe_mere) {
    console.log("\\n=== INFORMATIONS FINANCIÈRES CONSOLIDÉES ===\\n");
    console.log("Aucune information financière consolidée disponible pour cette société mère.");
  }
}`;

  // 3. Améliorer la récupération des données financières
  const improvedFinancialDataRetrieval = `
    // Récupérer les données financières sociales
    let finances = [];
    try {
      // Tentative de récupération des données financières sociales
      const comptesResponse = await axios.get(\`https://api.pappers.fr/v2/entreprise/\${siren}/comptes-sociaux\`, {
        params: {
          _nocache: Date.now(), // Paramètre pour éviter la mise en cache
          api_token: PAPPERS_API_KEY
        }
      });
      
      if (comptesResponse.data && comptesResponse.data.resultats && comptesResponse.data.resultats.length > 0) {
        
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
      // Impossible d'accéder aux données financières sociales détaillées
    }`;

  // Remplacer les fonctions dans le fichier
  let updatedContent = data;
  
  // Remplacer la fonction main
  const mainFunctionRegex = /\/\*\*\s*\n\s*\* Fonction principale[\s\S]*?async function main\(\) \{[\s\S]*?}\s*\n\s*}/;
  if (mainFunctionRegex.test(data)) {
    updatedContent = updatedContent.replace(mainFunctionRegex, correctedMainFunction);
  }
  
  // Remplacer la fonction displayFinancialInfo
  const displayFinancialInfoRegex = /\/\*\*\s*\n\s*\* Afficher les informations financières[\s\S]*?function displayFinancialInfo\(data\) \{[\s\S]*?}\s*\n/;
  if (displayFinancialInfoRegex.test(updatedContent)) {
    updatedContent = updatedContent.replace(displayFinancialInfoRegex, correctedDisplayFinancialInfo + '\n\n');
  }
  
  // Remplacer la section de récupération des données financières
  updatedContent = updatedContent.replace(
    /\/\/ Récupérer les données financières sociales[\s\S]+?let finances = \[\];[\s\S]+?try \{[\s\S]+?const comptesResponse[\s\S]+?catch \(error\) \{[\s\S]+?console\.log\("Information: Impossible d'accéder à la fiche financière détaillée\."\);[\s\S]+?\}/,
    improvedFinancialDataRetrieval
  );

  // Écrire le contenu corrigé dans le fichier
  fs.writeFile(scriptPath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error('Erreur lors de l\'écriture du fichier:', err);
      return;
    }
    console.log('Le fichier pappers-essentiel-new.js a été corrigé avec succès.');
  });
});

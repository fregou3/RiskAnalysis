const fs = require('fs');
const path = require('path');

// Chemin vers le fichier pappers-essentiel.js
const scriptPath = path.join(__dirname, 'scripts', 'pappers-essentiel.js');

// Lire le contenu du fichier
let scriptContent = fs.readFileSync(scriptPath, 'utf8');

// 1. Améliorer la récupération des données financières dans la fonction getEssentialInfo
const improvedFinancialDataRetrieval = `
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
`;

// Remplacer la section de récupération des données financières
scriptContent = scriptContent.replace(
  /\/\/ Récupérer les données financières sociales[\s\S]+?try \{[\s\S]+?const comptesResponse[\s\S]+?catch \(error\) \{[\s\S]+?console\.log\("Information: Impossible d'accéder à la fiche financière détaillée\."\);[\s\S]+?\}/,
  improvedFinancialDataRetrieval
);

// 2. Améliorer la fonction displayFinancialInfo pour mieux afficher les données financières
const improvedDisplayFinancialInfo = `
/**
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
      const croissance = finance.taux_croissance_chiffre_affaires !== null ? \`\${finance.taux_croissance_chiffre_affaires.toFixed(1)}%\` : 'N/A';
      const tauxMarge = finance.taux_marge_brute !== null ? \`\${finance.taux_marge_brute.toFixed(1)}%\` : 'N/A';
      const tauxEBITDA = finance.taux_marge_EBITDA !== null ? \`\${finance.taux_marge_EBITDA.toFixed(1)}%\` : 'N/A';
      
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
      const ca = finance.chiffre_affaires !== null ? \`\${formatNumberToMillions(finance.chiffre_affaires)}€\` : 'N/A';
      const resultat = finance.resultat !== null ? \`\${formatNumberToMillions(finance.resultat)}€\` : 'N/A';
      const effectif = finance.effectif !== null ? \`\${finance.effectif.toLocaleString()}\` : 'N/A';
      
      console.log(\`\${finance.annee}    | \${ca.padEnd(18)} | \${resultat.padEnd(15)} | \${effectif}\`);
    });
    
    console.log("------------------------------------------------------------------\\n");
    
    // Afficher les ratios de performance consolidés
    console.log("RATIOS DE PERFORMANCE CONSOLIDÉS:");
    console.log("------------------------------------------------------------------");
    console.log("Année    | Croissance CA (%) | Marge brute (%)  | Marge EBITDA (%)");
    console.log("------------------------------------------------------------------");
    
    data.finances_consolidees.slice(0, 3).forEach(finance => {
      const croissance = finance.taux_croissance_chiffre_affaires !== null ? \`\${finance.taux_croissance_chiffre_affaires.toFixed(1)}%\` : 'N/A';
      const tauxMarge = finance.taux_marge_brute !== null ? \`\${finance.taux_marge_brute.toFixed(1)}%\` : 'N/A';
      const tauxEBITDA = finance.taux_marge_EBITDA !== null ? \`\${finance.taux_marge_EBITDA.toFixed(1)}%\` : 'N/A';
      
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

// Remplacer la fonction displayFinancialInfo
scriptContent = scriptContent.replace(
  /\/\*\*\s*\n\s*\* Afficher les informations financières[\s\S]+?function displayFinancialInfo\(data\) \{[\s\S]+?\}\s*\n/,
  improvedDisplayFinancialInfo + '\n\n'
);

// Écrire le contenu modifié dans le fichier
fs.writeFileSync(scriptPath, scriptContent, 'utf8');

console.log('Le script pappers-essentiel.js a été modifié pour afficher correctement les données financières et les données financières consolidées.');

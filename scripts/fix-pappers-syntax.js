/**
 * Script pour corriger l'erreur de syntaxe dans pappers-essentiel.js
 */
const fs = require('fs');
const path = require('path');

// Chemin vers le fichier pappers-essentiel.js
const scriptPath = path.join(__dirname, 'pappers-essentiel.js');

// Lire le contenu du fichier
fs.readFile(scriptPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Erreur lors de la lecture du fichier:', err);
    return;
  }

  // Corriger l'erreur de syntaxe en supprimant le bloc problématique
  const correctedContent = data.replace(
    /} else \{\s+siren = searchTerm\.replace\(\/\\s\/g, ''\)\.substring\(0, 9\); \/\/ Prendre les 9 premiers chiffres \(SIREN\)\s+\}\s+\s+\/\/ Récupérer les informations essentielles\s+const companyData = await getEssentialInfo\(siren\);\s+\s+\/\/ Afficher ou sauvegarder les résultats\s+if \(outputFormat === 'json'\) \{/g, 
    '}\n\n/**\n * Fonction pour récupérer et afficher les informations d\'une entreprise\n */\nasync function processCompany() {\n  let siren = searchTerm;\n  \n  // Vérifier si le terme de recherche est un SIREN/SIRET (9 à 14 chiffres)\n  if (!/^\\d{9,14}$/.test(searchTerm.replace(/\\s/g, \'\'))) {\n    // Si ce n\'est pas un SIREN/SIRET, rechercher par nom\n    console.log(`Recherche de l\\\'entreprise "${searchTerm}"...`);\n    siren = await searchCompanyByName(searchTerm);\n    \n    if (!siren) {\n      console.error(\'Impossible de continuer sans SIREN valide.\');\n      process.exit(1);\n    }\n  } else {\n    siren = searchTerm.replace(/\\s/g, \'\').substring(0, 9); // Prendre les 9 premiers chiffres (SIREN)\n  }\n  \n  // Récupérer les informations essentielles\n  const companyData = await getEssentialInfo(siren);\n  \n  // Afficher ou sauvegarder les résultats\n  if (outputFormat === \'json\') {'
  );

  // Écrire le contenu corrigé dans le fichier
  fs.writeFile(scriptPath, correctedContent, 'utf8', (err) => {
    if (err) {
      console.error('Erreur lors de l\'écriture du fichier:', err);
      return;
    }
    console.log('L\'erreur de syntaxe dans pappers-essentiel.js a été corrigée avec succès.');
  });
});

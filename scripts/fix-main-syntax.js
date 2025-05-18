/**
 * Ce script corrige l'erreur de syntaxe dans la fonction main de pappers-essentiel.js
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

  // Supprimer le code dupliqué qui cause l'erreur
  const fixedContent = data.replace(
    /} else {\s+siren = searchTerm\.replace\(\/\\s\/g, ''\)\.substring\(0, 9\); \/\/ Prendre les 9 premiers chiffres \(SIREN\)\s+}\s+\s+\/\/ Récupérer les informations essentielles\s+const companyData = await getEssentialInfo\(siren\);\s+\s+\/\/ Afficher ou sauvegarder les résultats\s+if \(outputFormat === 'json'\) {\s+\/\/ Sortie au format JSON/g,
    ''
  );

  // Écrire le contenu corrigé dans le fichier
  fs.writeFile(scriptPath, fixedContent, 'utf8', (err) => {
    if (err) {
      console.error('Erreur lors de l\'écriture du fichier:', err);
      return;
    }
    console.log('L\'erreur de syntaxe dans la fonction main a été corrigée avec succès.');
  });
});

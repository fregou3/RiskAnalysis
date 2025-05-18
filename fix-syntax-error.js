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

  // Rechercher et supprimer le code dupliqué qui cause l'erreur de syntaxe
  const fixedContent = data.replace(
    /}\s*\n\s*} else {\s*\n\s*console\.log\("\\n=== INFORMATIONS FINANCIÈRES SOCIALES ===\\n"\);\s*\n\s*console\.log\("Aucune information financière sociale disponible\."\);\s*\n\s*}\s*\n\s*\/\/ Afficher les informations financières consolidées\s*\n\s*if \(data\.finances_consolidees && data\.finances_consolidees\.length > 0\) {/g,
    '}'
  );

  // Écrire le contenu corrigé dans le fichier
  fs.writeFile(scriptPath, fixedContent, 'utf8', (err) => {
    if (err) {
      console.error('Erreur lors de l\'écriture du fichier:', err);
      return;
    }
    console.log('Le fichier pappers-essentiel.js a été corrigé avec succès.');
  });
});

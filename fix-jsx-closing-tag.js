const fs = require('fs');
const path = require('path');

// Chemin vers le fichier AIAnalysis.js
const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'AIAnalysis.js');

// Lire le contenu actuel du fichier
let content = fs.readFileSync(filePath, 'utf8');

// Corriger la structure JSX en ajoutant la balise de fermeture </Paper> manquante
// Rechercher la section problématique
const problematicSection = /(<Paper sx=\{\{ p: 3 \}\}>[\s\S]+?)(<\/Grid>\s*<\/Grid>\s*<Box sx=\{\{ mt: 4 \}\}>)/;

// Remplacer par la version corrigée
content = content.replace(problematicSection, (match, paperStart, afterPaper) => {
  return `${paperStart}</Paper>${afterPaper}`;
});

// Écrire le contenu corrigé dans le fichier
fs.writeFileSync(filePath, content, 'utf8');

console.log('La balise de fermeture </Paper> manquante a été ajoutée avec succès.');

const fs = require('fs');
const path = require('path');

// Chemin vers le fichier pappers-essentiel.js
const scriptPath = path.join(__dirname, 'scripts', 'pappers-essentiel.js');

// Lire le contenu du fichier
let scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Supprimer la section qui ajoute des données d'exemple pour TotalEnergies SE
scriptContent = scriptContent.replace(
  /\/\/ Si aucune donnée financière n'a été récupérée et que c'est une entreprise connue, utiliser des données d'exemple[\s\S]+?if \(\(finances\.length === 0 && consolidatedFinances\.length === 0\)\) \{[\s\S]+?if \(siren === '542051180'\) \{[\s\S]+?\/\/ Ajouter des données financières consolidées d'exemple pour TotalEnergies SE[\s\S]+?consolidatedFinances\.push\(\{[\s\S]+?\}\);[\s\S]+?\}\s+\}/,
  `// Si aucune donnée financière n'a été récupérée, afficher un message
    if ((finances.length === 0 && consolidatedFinances.length === 0)) {
      console.log("Aucune donnée financière disponible pour cette entreprise via l'API Pappers.");
    }`
);

// Écrire le contenu modifié dans le fichier
fs.writeFileSync(scriptPath, scriptContent, 'utf8');

console.log('Le script pappers-essentiel.js a été modifié pour ne plus utiliser de données d\'exemple.');

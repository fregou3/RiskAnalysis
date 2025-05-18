const fs = require('fs');
const path = require('path');

// Chemin vers les fichiers à modifier
const aiAnalysisPath = path.join(__dirname, 'frontend', 'src', 'pages', 'AIAnalysis.js');
const pappersDisplayPath = path.join(__dirname, 'frontend', 'src', 'components', 'PappersDataDisplay.js');

// Lire le contenu des fichiers
let aiAnalysisContent = fs.readFileSync(aiAnalysisPath, 'utf8');
let pappersDisplayContent = fs.readFileSync(pappersDisplayPath, 'utf8');

// 1. Modifier le titre dans le composant PappersDataDisplay
pappersDisplayContent = pappersDisplayContent.replace(
  /<CardHeader\s+title="Données Officielles \(Pappers\)"/g,
  '<CardHeader title="Résultats de la recherche Internet"'
);

// 2. Supprimer la section "Résultats de la recherche Internet" si elle existe
// Cette section peut être présente sous différentes formes, essayons de couvrir les cas possibles
aiAnalysisContent = aiAnalysisContent.replace(
  /<Typography variant="h5"[^>]*>Résultats de la recherche Internet<\/Typography>[\s\S]*?<\/Grid>/g,
  ''
);

aiAnalysisContent = aiAnalysisContent.replace(
  /<Card[^>]*>[\s\S]*?<CardHeader[^>]*title="Résultats de la recherche Internet"[\s\S]*?<\/Card>/g,
  ''
);

// Écrire les contenus modifiés dans les fichiers
fs.writeFileSync(pappersDisplayPath, pappersDisplayContent, 'utf8');
fs.writeFileSync(aiAnalysisPath, aiAnalysisContent, 'utf8');

console.log('Les titres des sections ont été modifiés avec succès.');

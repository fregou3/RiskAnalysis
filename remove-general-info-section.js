const fs = require('fs');
const path = require('path');

// Chemin vers le fichier PappersDataDisplay.js
const pappersDisplayPath = path.join(__dirname, 'frontend', 'src', 'components', 'PappersDataDisplay.js');

// Lire le contenu du fichier
let pappersDisplayContent = fs.readFileSync(pappersDisplayPath, 'utf8');

// Supprimer la section "Informations générales"
pappersDisplayContent = pappersDisplayContent.replace(
  /{\/\* Informations générales \*\/}[\s\S]*?<\/Grid>\s*<\/Grid>\s*<\/Grid>/,
  ''
);

// Écrire le contenu modifié dans le fichier
fs.writeFileSync(pappersDisplayPath, pappersDisplayContent, 'utf8');

console.log('La section "Informations générales" a été supprimée avec succès.');

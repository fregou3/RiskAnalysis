const fs = require('fs');
const path = require('path');

// Chemin vers le fichier pappers-essentiel.js
const scriptPath = path.join(__dirname, 'scripts', 'pappers-essentiel.js');

// Lire le contenu du fichier
let scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Ajouter un paramètre timestamp à chaque requête API pour éviter la mise en cache
// 1. Modifier la requête de recherche par nom
scriptContent = scriptContent.replace(
  /const response = await axios\.get\('https:\/\/api\.pappers\.fr\/v2\/recherche',\s*\{\s*params:\s*\{/,
  `const response = await axios.get('https://api.pappers.fr/v2/recherche', {\n      params: {\n        _nocache: Date.now(), // Paramètre pour éviter la mise en cache`
);

// 2. Modifier la requête principale d'informations sur l'entreprise
scriptContent = scriptContent.replace(
  /const response = await axios\.get\('https:\/\/api\.pappers\.fr\/v2\/entreprise',\s*\{\s*params:\s*\{/,
  `const response = await axios.get('https://api.pappers.fr/v2/entreprise', {\n      params: {\n        _nocache: Date.now(), // Paramètre pour éviter la mise en cache`
);

// 3. Modifier la requête financière
scriptContent = scriptContent.replace(
  /const financialResponse = await axios\.get\('https:\/\/api\.pappers\.fr\/v2\/entreprise',\s*\{\s*params:\s*\{/,
  `const financialResponse = await axios.get('https://api.pappers.fr/v2/entreprise', {\n      params: {\n        _nocache: Date.now(), // Paramètre pour éviter la mise en cache`
);

// 4. Modifier les requêtes pour les comptes sociaux
scriptContent = scriptContent.replace(
  /const comptesResponse = await axios\.get\(`https:\/\/api\.pappers\.fr\/v2\/entreprise\/\${siren}\/comptes-sociaux`,\s*\{\s*params:\s*\{/g,
  `const comptesResponse = await axios.get(\`https://api.pappers.fr/v2/entreprise/\${siren}/comptes-sociaux\`, {\n        params: {\n          _nocache: Date.now(), // Paramètre pour éviter la mise en cache`
);

// 5. Modifier les requêtes pour les comptes consolidés
scriptContent = scriptContent.replace(
  /const consolidatedResponse = await axios\.get\(`https:\/\/api\.pappers\.fr\/v2\/entreprise\/\${siren}\/comptes-consolides`,\s*\{\s*params:\s*\{/g,
  `const consolidatedResponse = await axios.get(\`https://api.pappers.fr/v2/entreprise/\${siren}/comptes-consolides\`, {\n        params: {\n          _nocache: Date.now(), // Paramètre pour éviter la mise en cache`
);

// 6. Modifier les requêtes pour la fiche financière
scriptContent = scriptContent.replace(
  /const financialPageResponse = await axios\.get\(`https:\/\/api\.pappers\.fr\/v2\/entreprise\/\${siren}\/fiche`,\s*\{\s*params:\s*\{/g,
  `const financialPageResponse = await axios.get(\`https://api.pappers.fr/v2/entreprise/\${siren}/fiche\`, {\n          params: {\n            _nocache: Date.now(), // Paramètre pour éviter la mise en cache`
);

// Écrire le contenu modifié dans le fichier
fs.writeFileSync(scriptPath, scriptContent, 'utf8');

console.log('Le script pappers-essentiel.js a été modifié pour désactiver toute mise en cache des données.');

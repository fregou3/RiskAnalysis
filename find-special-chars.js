/**
 * Script pour rechercher les caractères spéciaux problématiques dans tous les fichiers du projet
 */

const fs = require('fs');
const path = require('path');

// Caractères problématiques à rechercher
const problematicChars = ['Ø', '=', 'ß', 'à'];
const problematicSequence = 'Ø=ßà';

// Fonction pour rechercher dans un fichier
function searchInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Rechercher la séquence exacte
    if (content.includes(problematicSequence)) {
      console.log(`✅ Séquence exacte "Ø=ßà" trouvée dans: ${filePath}`);
      return true;
    }
    
    // Rechercher les caractères individuels
    for (const char of problematicChars) {
      if (content.includes(char)) {
        console.log(`ℹ️ Caractère "${char}" trouvé dans: ${filePath}`);
      }
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Erreur lors de la lecture de ${filePath}:`, error.message);
    return false;
  }
}

// Fonction pour rechercher récursivement dans un répertoire
function searchInDirectory(directory) {
  if (!fs.existsSync(directory)) return;
  
  const items = fs.readdirSync(directory);
  
  for (const item of items) {
    const itemPath = path.join(directory, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      // Ignorer les dossiers node_modules et .git
      if (item !== 'node_modules' && item !== '.git') {
        searchInDirectory(itemPath);
      }
    } else if (stats.isFile()) {
      // Vérifier les extensions de fichiers pertinentes
      const ext = path.extname(itemPath).toLowerCase();
      if (['.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.md'].includes(ext)) {
        searchInFile(itemPath);
      }
    }
  }
}

// Fonction principale
function findProblematicCharacters() {
  console.log('🔍 Recherche des caractères problématiques dans le projet...');
  
  // Répertoires à rechercher
  const directories = [
    path.join(__dirname, 'frontend'),
    path.join(__dirname, 'backend'),
    path.join(__dirname, 'scripts')
  ];
  
  directories.forEach(dir => {
    console.log(`\n📂 Recherche dans: ${dir}`);
    searchInDirectory(dir);
  });
  
  console.log('\n✅ Recherche terminée');
}

// Exécuter la fonction principale
findProblematicCharacters();

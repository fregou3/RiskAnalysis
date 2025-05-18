/**
 * Script pour corriger les problèmes d'encodage dans les notes de risque
 * Ce script corrige les caractères spéciaux "Ø=ßà" qui apparaissent à côté des notes de risque
 */

const fs = require('fs');
const path = require('path');

// Fichiers à modifier
const filesToFix = [
  path.join(__dirname, 'frontend', 'src', 'pages', 'RiskAssessment.js'),
  path.join(__dirname, 'frontend', 'src', 'pages', 'SupplierDetail.js'),
  path.join(__dirname, 'frontend', 'src', 'pages', 'AIAnalysis.js')
];

// Expression régulière pour détecter les problèmes d'encodage dans les notes de risque
const problematicPatterns = [
  /Note de risque:\s*(\d+)\s*Ø=ßà/g,
  /Note de risque\s*:\s*(\d+)\s*Ø=ßà/g,
  /Note\s+de\s+risque\s*:\s*(\d+)\s*Ø=ßà/g
];

// Fonction pour corriger un fichier
function fixFile(filePath) {
  console.log(`Traitement du fichier: ${filePath}`);
  
  try {
    // Lire le contenu du fichier
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let modified = false;
    
    // Appliquer les corrections pour chaque pattern problématique
    problematicPatterns.forEach(pattern => {
      content = content.replace(pattern, 'Note de risque: $1');
    });
    
    // Vérifier si des modifications ont été apportées
    if (content !== originalContent) {
      modified = true;
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Corrections appliquées à ${filePath}`);
    } else {
      console.log(`ℹ️ Aucune correction nécessaire pour ${filePath}`);
    }
    
    return modified;
  } catch (error) {
    console.error(`❌ Erreur lors du traitement de ${filePath}:`, error.message);
    return false;
  }
}

// Fonction pour corriger les problèmes dans les fichiers de l'application
function fixEncodingIssues() {
  console.log('🔍 Recherche et correction des problèmes d\'encodage dans les notes de risque...');
  
  let modifiedCount = 0;
  
  // Parcourir tous les fichiers à corriger
  filesToFix.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      const modified = fixFile(filePath);
      if (modified) modifiedCount++;
    } else {
      console.warn(`⚠️ Fichier non trouvé: ${filePath}`);
    }
  });
  
  // Rechercher récursivement dans les dossiers pour trouver d'autres fichiers potentiellement affectés
  const searchDirectories = [
    path.join(__dirname, 'frontend', 'src'),
    path.join(__dirname, 'backend')
  ];
  
  searchDirectories.forEach(dir => {
    searchAndFixInDirectory(dir, modifiedCount);
  });
  
  console.log(`\n📊 Résumé: ${modifiedCount} fichier(s) corrigé(s)`);
}

// Fonction pour rechercher et corriger récursivement dans un répertoire
function searchAndFixInDirectory(directory, modifiedCount) {
  if (!fs.existsSync(directory)) return;
  
  const items = fs.readdirSync(directory);
  
  items.forEach(item => {
    const itemPath = path.join(directory, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      // Ignorer les dossiers node_modules et .git
      if (item !== 'node_modules' && item !== '.git') {
        searchAndFixInDirectory(itemPath, modifiedCount);
      }
    } else if (stats.isFile() && (item.endsWith('.js') || item.endsWith('.jsx'))) {
      // Vérifier si le fichier contient des notes de risque avec des problèmes d'encodage
      const content = fs.readFileSync(itemPath, 'utf8');
      let hasIssue = false;
      
      problematicPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          hasIssue = true;
        }
      });
      
      if (hasIssue && !filesToFix.includes(itemPath)) {
        console.log(`🔎 Problème d'encodage détecté dans: ${itemPath}`);
        const modified = fixFile(itemPath);
        if (modified) modifiedCount++;
      }
    }
  });
}

// Exécuter la fonction principale
fixEncodingIssues();

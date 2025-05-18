/**
 * Script pour corriger les problèmes d'encodage dans les notes de risque des PDF
 * Ce script corrige les caractères spéciaux "Ø=ßà" qui apparaissent à côté des notes de risque
 */

const fs = require('fs');
const path = require('path');

// Fonction pour remplacer les caractères problématiques dans les fichiers markdown ou texte
function fixRiskNotationInMarkdown() {
  // Dossier où les rapports sont générés ou stockés temporairement
  const directories = [
    path.join(__dirname, 'frontend', 'src', 'pages'),
    path.join(__dirname, 'backend', 'services'),
    path.join(__dirname, 'backend', 'routes'),
    path.join(__dirname, 'scripts')
  ];
  
  console.log('🔍 Recherche et correction des problèmes d\'encodage dans les notes de risque...');
  
  // Expressions régulières pour détecter et corriger les problèmes
  const patterns = [
    { 
      regex: /Note de risque:\s*(\d+)\s*Ø=ßà/g, 
      replacement: 'Note de risque: $1' 
    },
    { 
      regex: /Note de risque\s*:\s*(\d+)\s*Ø=ßà/g, 
      replacement: 'Note de risque: $1' 
    },
    { 
      regex: /Note\s+de\s+risque\s*:\s*(\d+)\s*Ø=ßà/g, 
      replacement: 'Note de risque: $1' 
    },
    // Ajout de patterns spécifiques pour les caractères problématiques
    { 
      regex: /(\d+)\s*Ø=ßà/g, 
      replacement: '$1' 
    }
  ];
  
  // Parcourir tous les répertoires
  directories.forEach(directory => {
    searchAndFixInDirectory(directory, patterns);
  });
  
  console.log('\n✅ Recherche et correction terminées');
}

// Fonction pour rechercher et corriger récursivement dans un répertoire
function searchAndFixInDirectory(directory, patterns) {
  if (!fs.existsSync(directory)) return;
  
  const items = fs.readdirSync(directory);
  
  items.forEach(item => {
    const itemPath = path.join(directory, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      // Ignorer les dossiers node_modules et .git
      if (item !== 'node_modules' && item !== '.git') {
        searchAndFixInDirectory(itemPath, patterns);
      }
    } else if (stats.isFile()) {
      // Vérifier les extensions de fichiers pertinentes
      const ext = path.extname(itemPath).toLowerCase();
      if (['.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.md', '.txt'].includes(ext)) {
        fixFileContent(itemPath, patterns);
      }
    }
  });
}

// Fonction pour corriger le contenu d'un fichier
function fixFileContent(filePath, patterns) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    let modified = false;
    
    // Appliquer chaque pattern de correction
    patterns.forEach(({ regex, replacement }) => {
      if (regex.test(content)) {
        content = content.replace(regex, replacement);
        modified = true;
        console.log(`🔧 Problème détecté et corrigé dans: ${filePath}`);
      }
    });
    
    // Enregistrer le fichier si des modifications ont été apportées
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fichier corrigé: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors du traitement de ${filePath}:`, error.message);
  }
}

// Fonction pour corriger les problèmes d'encodage dans le code de génération PDF
function fixPdfGenerationCode() {
  const pdfGenerationFiles = [
    path.join(__dirname, 'frontend', 'src', 'pages', 'AIAnalysis.js'),
    path.join(__dirname, 'optimize-pdf-export.js'),
    path.join(__dirname, 'add-pdf-export.js')
  ];
  
  console.log('\n🔍 Correction du code de génération PDF...');
  
  pdfGenerationFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;
        
        // Remplacer les caractères problématiques dans le code de génération PDF
        // Rechercher les endroits où le texte est traité pour les PDF
        const pdfTextProcessingPatterns = [
          {
            // Rechercher les endroits où le texte markdown est converti en HTML
            regex: /(marked\.parse\(.*?\))/g,
            replacement: '$1.replace(/Ø=ßà/g, "")'
          },
          {
            // Rechercher les endroits où le texte est ajouté au PDF
            regex: /(pdf\.text\(.*?\))/g,
            replacement: '$1.replace(/Ø=ßà/g, "")'
          },
          {
            // Rechercher les endroits où les lignes sont ajoutées au PDF
            regex: /(lines\[i\])/g,
            replacement: '(lines[i] ? lines[i].replace(/Ø=ßà/g, "") : "")'
          }
        ];
        
        let modified = false;
        pdfTextProcessingPatterns.forEach(({ regex, replacement }) => {
          if (regex.test(content)) {
            content = content.replace(regex, replacement);
            modified = true;
          }
        });
        
        if (modified) {
          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`✅ Code de génération PDF corrigé dans: ${filePath}`);
        } else {
          console.log(`ℹ️ Aucune correction nécessaire pour: ${filePath}`);
        }
      } catch (error) {
        console.error(`❌ Erreur lors du traitement de ${filePath}:`, error.message);
      }
    }
  });
}

// Exécuter les fonctions principales
fixRiskNotationInMarkdown();
fixPdfGenerationCode();

console.log('\n✅ Toutes les corrections ont été appliquées. Veuillez redémarrer l\'application pour appliquer les changements.');

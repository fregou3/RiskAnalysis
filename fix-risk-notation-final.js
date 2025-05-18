/**
 * Script pour corriger définitivement les problèmes d'affichage des notes de risque
 * Ce script modifie directement les fichiers du moteur de raisonnement pour remplacer
 * les caractères problématiques par des pastilles de couleur
 */

const fs = require('fs');
const path = require('path');

// Fonction pour remplacer les caractères problématiques dans un fichier
function fixFile(filePath) {
  console.log(`Traitement du fichier: ${filePath}`);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`Le fichier ${filePath} n'existe pas.`);
      return false;
    }
    
    // Lire le contenu du fichier
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Remplacer les caractères problématiques par des emojis de couleur
    // Pattern 1: Note de risque: XX Ø=ßà
    content = content.replace(/(Note\s+de\s+risque\s*:?\s*)(\d+)(\s*Ø=ßà)/gi, (match, prefix, score, suffix) => {
      const scoreNum = parseInt(score, 10);
      const emoji = getRiskEmoji(scoreNum);
      return `${prefix}${emoji} ${score}`;
    });
    
    // Pattern 2: Note: Ø=ßà XX
    content = content.replace(/(Note\s*:?\s*)Ø=ßà(\s*)(\d+)/gi, (match, prefix, space, score) => {
      const scoreNum = parseInt(score, 10);
      const emoji = getRiskEmoji(scoreNum);
      return `${prefix}${emoji} ${score}`;
    });
    
    // Pattern 3: Standalone Ø=ßà
    content = content.replace(/Ø=ßà/g, '');
    
    // Vérifier si des modifications ont été apportées
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Corrections appliquées à ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️ Aucune correction nécessaire pour ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Erreur lors du traitement de ${filePath}:`, error.message);
    return false;
  }
}

// Fonction pour obtenir l'emoji correspondant au niveau de risque
function getRiskEmoji(score) {
  if (score < 66) return '🟢'; // Vert pour risque faible
  if (score < 80) return '🟠'; // Orange pour risque moyen
  return '🔴'; // Rouge pour risque élevé
}

// Fonction pour rechercher et corriger récursivement dans un répertoire
function searchAndFixInDirectory(directory) {
  if (!fs.existsSync(directory)) {
    console.error(`Le répertoire ${directory} n'existe pas.`);
    return 0;
  }
  
  let fixedCount = 0;
  const items = fs.readdirSync(directory);
  
  for (const item of items) {
    const itemPath = path.join(directory, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      // Ignorer les dossiers node_modules et .git
      if (item !== 'node_modules' && item !== '.git') {
        fixedCount += searchAndFixInDirectory(itemPath);
      }
    } else if (stats.isFile()) {
      // Vérifier les extensions de fichiers pertinentes
      const ext = path.extname(itemPath).toLowerCase();
      if (['.js', '.jsx', '.ts', '.tsx', '.json', '.md'].includes(ext)) {
        if (fixFile(itemPath)) {
          fixedCount++;
        }
      }
    }
  }
  
  return fixedCount;
}

// Fonction pour créer un service de formatage des réponses
function createResponseFormatterService() {
  const serviceDir = path.join(__dirname, 'backend', 'services');
  const serviceFilePath = path.join(serviceDir, 'responseFormatter.js');
  
  // Vérifier si le répertoire services existe, sinon le créer
  if (!fs.existsSync(serviceDir)) {
    fs.mkdirSync(serviceDir, { recursive: true });
  }
  
  // Contenu du service de formatage
  const serviceContent = `/**
 * Service pour formater et nettoyer les réponses des modèles d'IA
 * Ce service intercepte et corrige les problèmes d'encodage et de formatage
 */

// Fonction pour nettoyer les caractères problématiques dans les notes de risque
function cleanRiskNotation(text) {
  if (!text) return text;
  
  // Remplacer les caractères problématiques par des emojis de couleur appropriés
  const patterns = [
    // Pattern 1: Note de risque: XX Ø=ßà
    {
      regex: /(Note\\s+de\\s+risque\\s*:?\\s*)(\\d+)(\\s*Ø=ßà)/gi,
      replacer: (match, prefix, score, suffix) => {
        const scoreNum = parseInt(score, 10);
        const emoji = getRiskEmoji(scoreNum);
        return \`\${prefix}\${emoji} \${score}\`;
      }
    },
    // Pattern 2: Note: Ø=ßà XX
    {
      regex: /(Note\\s*:?\\s*)Ø=ßà(\\s*)(\\d+)/gi,
      replacer: (match, prefix, space, score) => {
        const scoreNum = parseInt(score, 10);
        const emoji = getRiskEmoji(scoreNum);
        return \`\${prefix}\${emoji} \${score}\`;
      }
    },
    // Pattern 3: Standalone Ø=ßà
    {
      regex: /Ø=ßà/g,
      replacer: () => ''
    }
  ];
  
  // Appliquer tous les patterns de remplacement
  let cleanedText = text;
  patterns.forEach(({ regex, replacer }) => {
    cleanedText = cleanedText.replace(regex, replacer);
  });
  
  return cleanedText;
}

// Fonction pour obtenir l'emoji correspondant au niveau de risque
function getRiskEmoji(score) {
  if (score < 66) return '🟢'; // Vert pour risque faible
  if (score < 80) return '🟠'; // Orange pour risque moyen
  return '🔴'; // Rouge pour risque élevé
}

// Fonction principale pour formater les réponses des modèles d'IA
function formatAIResponse(response) {
  if (!response) return response;
  
  // Si la réponse est une chaîne de caractères
  if (typeof response === 'string') {
    return cleanRiskNotation(response);
  }
  
  // Si la réponse est un objet avec des propriétés de texte
  if (typeof response === 'object') {
    const formattedResponse = { ...response };
    
    // Traiter les propriétés courantes des réponses d'IA
    const textProperties = ['reasoning', 'openai', 'anthropic', 'deepseek', 'gemini', 'content', 'text'];
    
    textProperties.forEach(prop => {
      if (formattedResponse[prop] && typeof formattedResponse[prop] === 'string') {
        formattedResponse[prop] = cleanRiskNotation(formattedResponse[prop]);
      }
    });
    
    return formattedResponse;
  }
  
  return response;
}

module.exports = {
  cleanRiskNotation,
  formatAIResponse
};`;
  
  // Écrire le contenu du service dans le fichier
  fs.writeFileSync(serviceFilePath, serviceContent, 'utf8');
  console.log(`✅ Service de formatage des réponses créé: ${serviceFilePath}`);
  
  return serviceFilePath;
}

// Fonction pour modifier le fichier server.js et intégrer le service de formatage
function updateServerFile() {
  const serverFilePath = path.join(__dirname, 'backend', 'server.js');
  
  if (!fs.existsSync(serverFilePath)) {
    console.error(`Le fichier ${serverFilePath} n'existe pas.`);
    return false;
  }
  
  try {
    let content = fs.readFileSync(serverFilePath, 'utf8');
    const originalContent = content;
    
    // Vérifier si le service est déjà importé
    if (!content.includes("require('./services/responseFormatter')")) {
      // Ajouter l'importation du service
      const importPattern = /const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\);/;
      const lastImportMatch = [...content.matchAll(importPattern)].pop();
      
      if (lastImportMatch) {
        const insertPosition = lastImportMatch.index + lastImportMatch[0].length;
        content = content.slice(0, insertPosition) + 
                 "\n\n// Importer le service de formatage des réponses\nconst { formatAIResponse } = require('./services/responseFormatter');" + 
                 content.slice(insertPosition);
      } else {
        // Si aucune importation n'est trouvée, ajouter au début du fichier
        content = "// Importer le service de formatage des réponses\nconst { formatAIResponse } = require('./services/responseFormatter');\n\n" + content;
      }
    }
    
    // Vérifier si des modifications ont été apportées
    if (content !== originalContent) {
      fs.writeFileSync(serverFilePath, content, 'utf8');
      console.log(`✅ Fichier server.js mis à jour pour intégrer le service de formatage`);
      return true;
    } else {
      console.log(`ℹ️ Le service de formatage est déjà intégré dans server.js`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la mise à jour de ${serverFilePath}:`, error.message);
    return false;
  }
}

// Fonction pour modifier le fichier AIAnalysis.js et intégrer le remplacement des caractères problématiques
function updateAIAnalysisFile() {
  const aiAnalysisFilePath = path.join(__dirname, 'frontend', 'src', 'pages', 'AIAnalysis.js');
  
  if (!fs.existsSync(aiAnalysisFilePath)) {
    console.error(`Le fichier ${aiAnalysisFilePath} n'existe pas.`);
    return false;
  }
  
  try {
    let content = fs.readFileSync(aiAnalysisFilePath, 'utf8');
    const originalContent = content;
    
    // Remplacer les caractères problématiques dans le contenu markdown avant la conversion en HTML
    const markdownConversionPattern = /(const\s+htmlText\s*=\s*marked\.parse\()([^)]+)(\);)/;
    if (markdownConversionPattern.test(content)) {
      content = content.replace(markdownConversionPattern, (match, prefix, content, suffix) => {
        return `${prefix}${content}.replace(/Ø=ßà/g, "")${suffix}`;
      });
    }
    
    // Vérifier si des modifications ont été apportées
    if (content !== originalContent) {
      fs.writeFileSync(aiAnalysisFilePath, content, 'utf8');
      console.log(`✅ Fichier AIAnalysis.js mis à jour pour nettoyer les caractères problématiques`);
      return true;
    } else {
      console.log(`ℹ️ Le fichier AIAnalysis.js est déjà à jour`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la mise à jour de ${aiAnalysisFilePath}:`, error.message);
    return false;
  }
}

// Fonction principale
function main() {
  console.log('🔍 Correction des problèmes d\'affichage des notes de risque...');
  
  // Créer le service de formatage des réponses
  createResponseFormatterService();
  
  // Mettre à jour le fichier server.js
  updateServerFile();
  
  // Mettre à jour le fichier AIAnalysis.js
  updateAIAnalysisFile();
  
  // Rechercher et corriger les caractères problématiques dans tous les fichiers
  console.log('\n🔍 Recherche et correction des caractères problématiques dans les fichiers...');
  const backendFixedCount = searchAndFixInDirectory(path.join(__dirname, 'backend'));
  const frontendFixedCount = searchAndFixInDirectory(path.join(__dirname, 'frontend'));
  const scriptsFixedCount = searchAndFixInDirectory(path.join(__dirname, 'scripts'));
  
  console.log(`\n📊 Résumé des corrections:`);
  console.log(`- Backend: ${backendFixedCount} fichier(s) corrigé(s)`);
  console.log(`- Frontend: ${frontendFixedCount} fichier(s) corrigé(s)`);
  console.log(`- Scripts: ${scriptsFixedCount} fichier(s) corrigé(s)`);
  console.log(`- Total: ${backendFixedCount + frontendFixedCount + scriptsFixedCount} fichier(s) corrigé(s)`);
  
  console.log('\n✅ Correction terminée. Veuillez redémarrer l\'application pour appliquer les changements.');
}

// Exécuter la fonction principale
main();

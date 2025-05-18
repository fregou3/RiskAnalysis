/**
 * Service pour formater et nettoyer les réponses des modèles d'IA
 * Ce service intercepte et corrige les problèmes d'encodage et de formatage
 * et améliore la mise en page des résultats pour une meilleure lisibilité
 */

// Fonction pour nettoyer les caractères problématiques dans les notes de risque
function cleanRiskNotation(text) {
  if (!text) return text;
  
  // Définir les caractères problématiques pour chaque niveau de risque
  const riskChars = {
    low: 'Ø=ßV', // Vert
    medium: 'Ø=ßO', // Orange
    high: 'Ø=ßR'  // Rouge
  };
  
  // Remplacer les caractères problématiques par des emojis de couleur appropriés
  const patterns = [
    // Pattern 1: Note de risque: XX + caractères spéciaux (vert)
    {
      regex: new RegExp(`(Note\\s+de\\s+risque\\s*:?\\s*)(\\d+)(\\s*${riskChars.low})`, 'gi'),
      replacer: (match, prefix, score) => {
        return `${prefix}🟢 ${score}`; // Emoji vert
      }
    },
    // Pattern 2: Note de risque: XX + caractères spéciaux (orange)
    {
      regex: new RegExp(`(Note\\s+de\\s+risque\\s*:?\\s*)(\\d+)(\\s*${riskChars.medium})`, 'gi'),
      replacer: (match, prefix, score) => {
        return `${prefix}🟠 ${score}`; // Emoji orange
      }
    },
    // Pattern 3: Note de risque: XX + caractères spéciaux (rouge)
    {
      regex: new RegExp(`(Note\\s+de\\s+risque\\s*:?\\s*)(\\d+)(\\s*${riskChars.high})`, 'gi'),
      replacer: (match, prefix, score) => {
        return `${prefix}🔴 ${score}`; // Emoji rouge
      }
    },
    // Pattern 4: Note: + caractères spéciaux (vert) + XX
    {
      regex: new RegExp(`(Note\\s*:?\\s*)${riskChars.low}(\\s*)(\\d+)`, 'gi'),
      replacer: (match, prefix, space, score) => {
        return `${prefix}🟢 ${score}`; // Emoji vert
      }
    },
    // Pattern 5: Note: + caractères spéciaux (orange) + XX
    {
      regex: new RegExp(`(Note\\s*:?\\s*)${riskChars.medium}(\\s*)(\\d+)`, 'gi'),
      replacer: (match, prefix, space, score) => {
        return `${prefix}🟠 ${score}`; // Emoji orange
      }
    },
    // Pattern 6: Note: + caractères spéciaux (rouge) + XX
    {
      regex: new RegExp(`(Note\\s*:?\\s*)${riskChars.high}(\\s*)(\\d+)`, 'gi'),
      replacer: (match, prefix, space, score) => {
        return `${prefix}🔴 ${score}`; // Emoji rouge
      }
    },
    // Pattern 7: Standalone caractères spéciaux (vert)
    {
      regex: new RegExp(riskChars.low, 'g'),
      replacer: () => '🟢' // Emoji vert
    },
    // Pattern 8: Standalone caractères spéciaux (orange)
    {
      regex: new RegExp(riskChars.medium, 'g'),
      replacer: () => '🟠' // Emoji orange
    },
    // Pattern 9: Standalone caractères spéciaux (rouge)
    {
      regex: new RegExp(riskChars.high, 'g'),
      replacer: () => '🔴' // Emoji rouge
    },
    // Pattern 4: Note de risque: XX (sans caractères spéciaux)
    {
      regex: /(Note\s+de\s+risque\s*:?\s*)(\d+)(?!\s*[🟢🟠🔴])/gi,
      replacer: (match, prefix, score) => {
        const scoreNum = parseInt(score, 10);
        const emoji = getRiskEmoji(scoreNum);
        return `${prefix}${emoji} ${score}`;
      }
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
  // Convertir le score en nombre si c'est une chaîne
  const numScore = typeof score === 'string' ? parseInt(score, 10) : score;
  
  // Utiliser les mêmes seuils que dans le reste de l'application
  if (numScore < 66) return '🟢'; // Vert pour risque faible
  if (numScore < 80) return '🟠'; // Orange pour risque moyen
  return '🔴'; // Rouge pour risque élevé
}

// Fonction pour obtenir le caractère problématique correspondant au niveau de risque
function getRiskChar(score) {
  // Convertir le score en nombre si c'est une chaîne
  const numScore = typeof score === 'string' ? parseInt(score, 10) : score;
  
  // Retourner le caractère correspondant au niveau de risque
  if (numScore < 66) return 'Ø=ßV'; // Vert pour risque faible
  if (numScore < 80) return 'Ø=ßO'; // Orange pour risque moyen
  return 'Ø=ßR'; // Rouge pour risque élevé
}

// Fonction pour améliorer la mise en page des résultats d'analyse selon le format demandé
function enhanceFormatting(text) {
  if (!text) return text;
  
  // Identifier le nom de l'entreprise et le VAT Number
  let enhancedText = text;
  
  // Extraire le nom de l'entreprise (si présent dans le texte)
  const companyNameMatch = enhancedText.match(/Analyse de l'entreprise ([\w\s-]+)/i) || 
                          enhancedText.match(/([\w\s-]+) est une entreprise/i);
  
  let companyName = '';
  if (companyNameMatch && companyNameMatch[1]) {
    companyName = companyNameMatch[1].trim();
  }
  
  // Extraire le VAT Number (si présent)
  const vatMatch = enhancedText.match(/VAT\s+Number\s*:?\s*([A-Z0-9]+)/i) ||
                  enhancedText.match(/Numéro\s+de\s+TVA\s*:?\s*([A-Z0-9]+)/i);
  
  let vatNumber = '';
  if (vatMatch && vatMatch[1]) {
    vatNumber = vatMatch[1].trim();
  }
  
  // Formater le texte pour avoir une structure claire
  // 1. Remplacer les titres de section par des titres bien formatés
  const sectionHeaders = [
    'Secteur d\'activité et positionnement sur le marché',
    'Produits/services principaux',
    'Performance financière',
    'Structure de gouvernance',
    'Risques potentiels'
  ];
  
  // Créer un texte formaté à partir de zéro
  let formattedText = '';
  
  // Ajouter le titre avec le nom de l'entreprise
  if (companyName) {
    formattedText += `# Analyse de l'entreprise ${companyName}\n\n`;
  } else {
    // Si on n'a pas pu extraire le nom, garder le titre original s'il existe
    const titleMatch = enhancedText.match(/^#?\s*Analyse de l'entreprise [^\n]+/i);
    if (titleMatch) {
      formattedText += `# ${titleMatch[0].replace(/^#?\s*/, '')}\n\n`;
    }
  }
  
  // Ajouter le VAT Number s'il existe
  if (vatNumber) {
    formattedText += `VAT Number: ${vatNumber}\n\n`;
  }
  
  // Traiter chaque section
  sectionHeaders.forEach(header => {
    // Rechercher le contenu de la section
    const sectionRegex = new RegExp(`${header}\s*:?\s*([^#]+?)(?=\n\s*(?:${sectionHeaders.join('|')})|$)`, 'is');
    const sectionMatch = enhancedText.match(sectionRegex);
    
    if (sectionMatch && sectionMatch[1]) {
      const sectionContent = sectionMatch[1].trim();
      formattedText += `## ${header}\n${sectionContent}\n\n`;
    }
  });
  
  // Si aucune section n'a été trouvée, utiliser le texte original mais avec un formatage amélioré
  if (formattedText.trim() === (companyName ? `# Analyse de l'entreprise ${companyName}` : '').trim()) {
    // Nettoyer le texte original
    enhancedText = enhancedText
      // Supprimer les markdown existants
      .replace(/^#+\s+/gm, '')
      .replace(/\*\*/g, '');
      
    // Identifier les sections potentielles
    const potentialSections = [
      'Secteur d\'activité', 'Produits/services', 'Performance financière', 
      'Structure de gouvernance', 'Risques potentiels', 'Analyse financière',
      'Analyse des risques', 'Analyse stratégique', 'Conclusion'
    ];
    
    potentialSections.forEach(section => {
      const sectionRegex = new RegExp(`(^|\n)(${section}[^\n]*:?)`, 'gi');
      enhancedText = enhancedText.replace(sectionRegex, '$1## $2');
    });
    
    return enhancedText;
  }
  
  return formattedText;
}

// Fonction principale pour formater les réponses des modèles d'IA
function formatAIResponse(response) {
  if (!response) return '';
  
  // Si la réponse est une chaîne de caractères
  if (typeof response === 'string') {
    return enhanceFormatting(cleanRiskNotation(response));
  }
  
  // Si la réponse est un objet avec des propriétés de texte
  if (typeof response === 'object') {
    // Si l'objet a une propriété 'text' ou 'content', utiliser cette valeur
    if (response.text && typeof response.text === 'string') {
      return enhanceFormatting(cleanRiskNotation(response.text));
    }
    if (response.content && typeof response.content === 'string') {
      return enhanceFormatting(cleanRiskNotation(response.content));
    }
    
    // Essayer de convertir l'objet en texte markdown
    try {
      // Extraire le contenu textuel des propriétés courantes
      const textProperties = ['reasoning', 'openai', 'anthropic', 'deepseek', 'gemini', 'content', 'text'];
      
      for (const prop of textProperties) {
        if (response[prop] && typeof response[prop] === 'string') {
          return enhanceFormatting(cleanRiskNotation(response[prop]));
        }
      }
      
      // Si aucune propriété textuelle n'est trouvée, convertir l'objet en texte
      return enhanceFormatting(cleanRiskNotation(JSON.stringify(response, null, 2)));
    } catch (error) {
      console.error('Error formatting AI response:', error);
      return String(response);
    }
  }
  
  // Pour tout autre type, convertir en chaîne
  return String(response);
}

module.exports = {
  cleanRiskNotation,
  formatAIResponse,
  enhanceFormatting,
  getRiskEmoji,
  getRiskChar
};
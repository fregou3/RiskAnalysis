/**
 * Service pour l'extraction, la normalisation et l'enrichissement des noms d'entreprises
 * Ce service améliore la qualité des recherches en normalisant les noms d'entreprises
 * et en extrayant les informations pertinentes pour la recherche Pappers, y compris le numéro de TVA
 */

const axios = require('axios');
require('dotenv').config();
const knownCompanies = require('../data/known-companies');
const OpenAI = require('openai');

// Initialiser le client OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Normalise un nom d'entreprise pour améliorer les recherches
 * @param {string} companyName - Nom brut de l'entreprise
 * @returns {string} - Nom normalisé
 */
function normalizeCompanyName(companyName) {
  if (!companyName) return '';
  
  let normalized = companyName.trim();
  
  // Convertir en minuscules
  normalized = normalized.toLowerCase();
  
  // Supprimer les termes juridiques courants
  const legalTerms = [
    'sa', 'sas', 'sarl', 'eurl', 'sasu', 'sci', 'scp', 'sca', 'scop', 'scs', 'snc',
    'société anonyme', 'société par actions simplifiée', 'société à responsabilité limitée',
    'entreprise unipersonnelle à responsabilité limitée', 'société civile immobilière',
    'société en nom collectif', 'société en commandite simple', 'société en commandite par actions',
    'société coopérative', 'société coopérative de production'
  ];
  
  legalTerms.forEach(term => {
    // Supprimer le terme s'il est entouré d'espaces ou de ponctuation
    normalized = normalized.replace(new RegExp(`\\s+${term}\\s*$`, 'i'), '');
    normalized = normalized.replace(new RegExp(`^\\s*${term}\\s+`, 'i'), '');
    normalized = normalized.replace(new RegExp(`\\s+${term}\\b`, 'i'), '');
    normalized = normalized.replace(new RegExp(`\\b${term}\\s+`, 'i'), '');
  });
  
  // Supprimer les caractères spéciaux et la ponctuation excessive
  normalized = normalized.replace(/[&.,\/#!$%\^*;:{}=\-_`~()]/g, ' ');
  
  // Remplacer les espaces multiples par un seul espace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Extrait le numéro de TVA (VAT number) d'une entreprise à partir d'un texte d'analyse
 * @param {string} analysisText - Texte d'analyse contenant des informations sur l'entreprise
 * @returns {Promise<string|null>} - Numéro de TVA de l'entreprise ou null si non trouvé
 */
async function extractVatNumber(analysisText) {
  try {
    // Si le texte d'analyse est vide ou trop court, retourner null
    if (!analysisText || analysisText.length < 50) {
      return null;
    }
    
    // Rechercher des patterns de numéro de TVA français dans le texte
    // Format typique: FR12345678901 ou FR 12 345 678 901
    const vatRegex = /\b(FR\s*\d{2}\s*\d{3}\s*\d{3}\s*\d{3})\b/gi;
    const matches = [...analysisText.matchAll(vatRegex)];
    
    if (matches && matches.length > 0) {
      // Nettoyer le numéro de TVA trouvé (supprimer les espaces)
      return matches[0][1].replace(/\s+/g, '');
    }
    
    // Si aucun pattern n'est trouvé directement, utiliser OpenAI pour l'extraire
    const prompt = `
Tu es un expert en analyse d'entreprises françaises. Voici un texte d'analyse concernant une entreprise :

---
${analysisText.substring(0, 3000)}
---

Extrait de ce texte le numéro de TVA intracommunautaire (VAT number) de l'entreprise analysée.
Le format typique d'un numéro de TVA français est FR suivi de 11 chiffres (ex: FR12345678901).

Réponds UNIQUEMENT avec le numéro de TVA, sans aucun texte supplémentaire, explication ou ponctuation.
Si tu ne trouves pas de numéro de TVA dans le texte, réponds simplement "NON_TROUVE".`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Tu es un assistant spécialisé dans l'extraction de numéros de TVA d'entreprises françaises." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 50,
    });
    
    // Extraire et nettoyer la réponse
    const extractedVat = completion.choices[0].message.content.trim();
    
    // Vérifier si la réponse est valide
    if (!extractedVat || 
        extractedVat.toLowerCase() === 'non_trouve' || 
        extractedVat.toLowerCase() === 'non trouvé' ||
        extractedVat.toLowerCase().includes('non disponible')) {
      return null;
    }
    
    // Nettoyer le numéro de TVA (supprimer les espaces et autres caractères non alphanumériques)
    const cleanedVat = extractedVat.replace(/[^A-Z0-9]/gi, '');
    
    // Vérifier si le format est correct (FR + 11 chiffres)
    if (/^FR\d{11}$/i.test(cleanedVat)) {
      return cleanedVat.toUpperCase();
    }
    
    return null;
  } catch (error) {
    console.error('Erreur lors de l\'extraction du numéro de TVA:', error);
    return null;
  }
}

/**
 * Extrait le nom légal complet d'une entreprise à partir d'un texte d'analyse
 * @param {string} analysisText - Texte d'analyse contenant des informations sur l'entreprise
 * @param {string} initialCompanyName - Nom initial de l'entreprise (si disponible)
 * @returns {Promise<string>} - Nom légal complet de l'entreprise
 */
async function extractCompanyLegalName(analysisText, initialCompanyName = '') {
  try {
    // Si le texte d'analyse est vide ou trop court, retourner le nom initial
    if (!analysisText || analysisText.length < 50) {
      return initialCompanyName;
    }
    
    // Utiliser OpenAI pour extraire le nom légal complet
    const prompt = `
Tu es un expert en analyse d'entreprises françaises. Voici un texte d'analyse concernant une entreprise :

---
${analysisText.substring(0, 2000)}
---

Extrait de ce texte le nom légal complet et exact de l'entreprise analysée.
${initialCompanyName ? `Le nom initial fourni est "${initialCompanyName}", mais il pourrait être incomplet ou inexact.` : ''}

Réponds UNIQUEMENT avec le nom légal complet de l'entreprise, sans aucun texte supplémentaire, explication ou ponctuation. 
Si tu ne peux pas déterminer le nom légal avec certitude, réponds simplement avec le nom le plus probable ou le nom initial s'il était fourni.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Tu es un assistant spécialisé dans l'identification des noms légaux d'entreprises françaises." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 50,
    });
    
    // Extraire et nettoyer la réponse
    const extractedName = completion.choices[0].message.content.trim();
    
    // Si la réponse est vide ou trop générique, revenir au nom initial
    if (!extractedName || extractedName.length < 2 || 
        extractedName.toLowerCase() === 'inconnu' || 
        extractedName.toLowerCase() === 'non spécifié') {
      return initialCompanyName;
    }
    
    return extractedName;
  } catch (error) {
    console.error(`Error extracting company legal name: ${error.message}`);
    // En cas d'erreur, retourner le nom initial
    return initialCompanyName;
  }
}

/**
 * Génère des variations de noms d'entreprises pour améliorer les recherches
 * @param {string} companyName - Nom de l'entreprise
 * @returns {Array<string>} - Liste des variations de noms
 */
function generateNameVariations(companyName) {
  if (!companyName) return [];
  
  const variations = new Set();
  const normalized = normalizeCompanyName(companyName);
  
  // Ajouter le nom original et normalisé
  variations.add(companyName.trim());
  variations.add(normalized);
  
  // Ajouter des variations courantes
  const commonPrefixes = ['Groupe', 'Société', 'Compagnie', 'Établissements', 'Ets', 'Ste'];
  
  // Ajouter des variations avec préfixes
  commonPrefixes.forEach(prefix => {
    variations.add(`${prefix} ${normalized}`);
    
    // Si le nom commence déjà par ce préfixe, ajouter une version sans le préfixe
    const prefixRegex = new RegExp(`^${prefix}\\s+`, 'i');
    if (prefixRegex.test(normalized)) {
      variations.add(normalized.replace(prefixRegex, ''));
    }
  });
  
  // Traiter les cas spécifiques
  if (normalized.includes(' et ')) {
    variations.add(normalized.replace(' et ', ' & '));
  }
  if (normalized.includes(' & ')) {
    variations.add(normalized.replace(' & ', ' et '));
  }
  
  // Supprimer les articles pour certaines variations
  const articlesRegex = /^(le|la|les|l')\s+/i;
  if (articlesRegex.test(normalized)) {
    variations.add(normalized.replace(articlesRegex, ''));
  }
  
  return [...variations];
}

/**
 * Recherche le SIREN d'une entreprise à partir de son nom en utilisant plusieurs méthodes
 * @param {string} companyName - Nom de l'entreprise
 * @returns {Promise<string|null>} - SIREN de l'entreprise ou null si non trouvé
 */
async function findCompanySiren(companyName) {
  if (!companyName) return null;
  
  // Normaliser le nom de l'entreprise
  const normalizedName = normalizeCompanyName(companyName);
  
  // Vérifier si le nom normalisé est dans la base de données des entreprises connues
  if (knownCompanies[normalizedName]) {
    console.log(`Found exact match in database for normalized name: ${normalizedName}`);
    return knownCompanies[normalizedName];
  }
  
  // Générer des variations du nom et vérifier chacune
  const variations = generateNameVariations(companyName);
  for (const variation of variations) {
    if (knownCompanies[variation.toLowerCase()]) {
      console.log(`Found match in database for variation: ${variation}`);
      return knownCompanies[variation.toLowerCase()];
    }
  }
  
  // Rechercher des correspondances partielles dans la base de données
  for (const [knownName, siren] of Object.entries(knownCompanies)) {
    // Vérifier si le nom connu contient le nom normalisé ou vice versa
    if (knownName.includes(normalizedName) || normalizedName.includes(knownName)) {
      console.log(`Found partial match in database: ${knownName}`);
      return siren;
    }
    
    // Vérifier les variations
    for (const variation of variations) {
      if (knownName.includes(variation.toLowerCase()) || variation.toLowerCase().includes(knownName)) {
        console.log(`Found partial match with variation: ${variation} -> ${knownName}`);
        return siren;
      }
    }
  }
  
  // Si aucune correspondance n'est trouvée dans la base de données, utiliser l'API OpenAI
  try {
    console.log(`Using AI to find SIREN for: ${companyName}`);
    
    const prompt = `Tu es un expert en entreprises françaises. Je cherche le numéro SIREN de l'entreprise "${companyName}".

Réponds UNIQUEMENT avec le numéro SIREN à 9 chiffres, sans texte ni explication. Si tu ne connais pas le SIREN exact, ne donne pas de réponse approximative, réponds simplement "inconnu".`;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Tu es un assistant spécialisé dans l'identification des entreprises françaises. Tu connais les numéros SIREN des grandes entreprises françaises." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1, // Faible température pour des réponses plus précises
      max_tokens: 20, // Réponse courte attendue
    });
    
    const response = completion.choices[0].message.content.trim();
    console.log(`AI response for SIREN: ${response}`);
    
    // Vérifier si la réponse est un SIREN valide (9 chiffres)
    if (/^\d{9}$/.test(response)) {
      return response;
    } else if (response.toLowerCase() === 'inconnu') {
      console.log('AI could not find a SIREN for this company');
      return null;
    } else {
      // Essayer d'extraire un SIREN de la réponse (au cas où l'IA inclut du texte supplémentaire)
      const sirenMatch = response.match(/(\d{9})/);
      if (sirenMatch && sirenMatch[1]) {
        return sirenMatch[1];
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error finding SIREN with AI: ${error.message}`);
    return null;
  }
}

/**
 * Enrichit un nom d'entreprise en extrayant le nom légal, le SIREN et le numéro de TVA
 * @param {string} initialName - Nom initial de l'entreprise
 * @param {string} analysisText - Texte d'analyse contenant des informations sur l'entreprise
 * @returns {Promise<Object>} - Objet contenant le nom enrichi, le SIREN et le numéro de TVA
 */
async function enrichCompanyName(initialName, analysisText = '') {
  try {
    // Étape 1: Extraire le nom légal complet si possible
    const legalName = await extractCompanyLegalName(analysisText, initialName);
    console.log(`Extracted legal name: "${legalName}" from initial name: "${initialName}"`);
    
    // Étape 2: Trouver le SIREN
    const siren = await findCompanySiren(legalName || initialName);
    
    // Étape 3: Extraire le numéro de TVA si possible
    let vatNumber = null;
    if (analysisText && analysisText.length > 0) {
      vatNumber = await extractVatNumber(analysisText);
      console.log(`Extracted VAT number: ${vatNumber || 'Not found'} for company: ${legalName || initialName}`);
    }
    
    // Étape 4: Si on a un SIREN mais pas de numéro de TVA, on peut le générer
    // Le numéro de TVA français est généralement FR + clé (2 chiffres) + SIREN
    // Mais comme la clé nécessite un calcul spécifique, on ne le fait pas ici
    
    return {
      initialName: initialName,
      legalName: legalName || initialName,
      normalizedName: normalizeCompanyName(legalName || initialName),
      siren: siren,
      vatNumber: vatNumber,
      variations: generateNameVariations(legalName || initialName)
    };
  } catch (error) {
    console.error(`Error enriching company name: ${error.message}`);
    return {
      initialName: initialName,
      legalName: initialName,
      normalizedName: normalizeCompanyName(initialName),
      siren: null,
      vatNumber: null,
      variations: generateNameVariations(initialName)
    };
  }
}

module.exports = {
  normalizeCompanyName,
  extractCompanyLegalName,
  extractVatNumber,
  generateNameVariations,
  findCompanySiren,
  enrichCompanyName
};

/**
 * Script de test pour vérifier le remplacement des caractères problématiques
 * par des pastilles de couleur dans les notes de risque
 */

// Importer le service de formatage des réponses
const { formatAIResponse, getRiskChar } = require('./backend/services/responseFormatter');

// Définir les chaînes de caractères problématiques pour chaque niveau de risque
const riskChars = {
  low: 'Ø=ßV',    // Vert
  medium: 'Ø=ßO', // Orange
  high: 'Ø=ßR'    // Rouge
};

// Créer des chaînes de test avec les différents caractères problématiques
const testStrings = [
  `Test avec Note de risque: 60 ${riskChars.low}`,
  `Test avec Note de risque: 70 ${riskChars.medium}`,
  `Test avec Note de risque: 85 ${riskChars.high}`,
  `Test avec Note: ${riskChars.low} 60`,
  `Test avec Note: ${riskChars.medium} 70`,
  `Test avec Note: ${riskChars.high} 85`,
  `Test avec ${riskChars.low} sans note`,
  `Test avec ${riskChars.medium} sans note`,
  `Test avec ${riskChars.high} sans note`
];

// Tester le formatage pour chaque chaîne
console.log('=== TEST DE FORMATAGE DES NOTES DE RISQUE ===\n');
testStrings.forEach((str, index) => {
  const formatted = formatAIResponse(str);
  console.log(`Test ${index + 1}:`);
  console.log(`Original: ${str}`);
  console.log(`Formatté: ${formatted}`);
  console.log('');
});

console.log('=== TEST TERMINÉ ===');

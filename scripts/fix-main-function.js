/**
 * Ce script corrige la fonction main dans pappers-essentiel.js
 */
const fs = require('fs');
const path = require('path');

// Chemin vers le fichier pappers-essentiel.js
const scriptPath = path.join(__dirname, 'pappers-essentiel.js');

// Lire le contenu du fichier
fs.readFile(scriptPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Erreur lors de la lecture du fichier:', err);
    return;
  }

  // Fonction main corrigée
  const correctedMainFunction = `/**
 * Fonction principale
 */
async function main() {
  try {
    let siren = searchTerm;
    
    // Vérifier si le terme de recherche est un SIREN/SIRET (9 à 14 chiffres)
    if (!/^\\d{9,14}$/.test(searchTerm.replace(/\\s/g, ''))) {
      // Si ce n'est pas un SIREN/SIRET, rechercher par nom
      console.log(\`Recherche de l'entreprise "\${searchTerm}"...\`);
      siren = await searchCompanyByName(searchTerm);
      
      if (!siren) {
        console.error('Impossible de continuer sans SIREN valide.');
        process.exit(1);
      }
    } else {
      siren = searchTerm.replace(/\\s/g, '').substring(0, 9); // Prendre les 9 premiers chiffres (SIREN)
    }
    
    // Récupérer les informations essentielles
    const companyData = await getEssentialInfo(siren);
    
    // Afficher ou sauvegarder les résultats
    if (outputFormat === 'json') {
      // Sortie au format JSON
      console.log(JSON.stringify(companyData, null, 2));
    } else {
      // Effacer la console avant d'afficher les informations
      console.clear();
      // Afficher dans la console
      displayCompanyInfo(companyData);
    }
    
  } catch (error) {
    console.error('Erreur lors de l\\'exécution du script:', error.message);
    if (error.response) {
      console.error('Détails de l\\'erreur:', error.response.data);
    }
  }
}`;

  // Rechercher et remplacer la fonction main
  const mainFunctionRegex = /\/\*\*\s*\n\s*\* Fonction principale[\s\S]*?async function main\(\) \{[\s\S]*?}\s*\n\s*}/;
  
  // Vérifier si nous avons trouvé la fonction
  if (!mainFunctionRegex.test(data)) {
    console.error('Impossible de trouver la fonction main dans le fichier.');
    return;
  }

  // Remplacer la fonction main
  const correctedContent = data.replace(mainFunctionRegex, correctedMainFunction);

  // Écrire le contenu corrigé dans le fichier
  fs.writeFile(scriptPath, correctedContent, 'utf8', (err) => {
    if (err) {
      console.error('Erreur lors de l\'écriture du fichier:', err);
      return;
    }
    console.log('La fonction main a été corrigée avec succès dans pappers-essentiel.js.');
  });
});

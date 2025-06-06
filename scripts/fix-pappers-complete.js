/**
 * Script pour corriger complètement les erreurs de syntaxe dans pappers-essentiel.js
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

  // Corriger la fonction main pour qu'elle soit complète et correcte
  const mainFunctionRegex = /\/\*\*\s*\n\s*\* Fonction principale[\s\S]*?async function main\(\) \{[\s\S]*?}\s*\n\s*}/;
  
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

  // Remplacer la fonction main
  let correctedContent = data;
  
  if (mainFunctionRegex.test(data)) {
    correctedContent = data.replace(mainFunctionRegex, correctedMainFunction);
  } else {
    // Si la regex ne trouve pas la fonction main, essayer une approche plus directe
    // Supprimer tout le contenu après la définition de la fonction main jusqu'à la prochaine fonction
    const mainFunctionStartIndex = data.indexOf("/**\n * Fonction principale");
    if (mainFunctionStartIndex !== -1) {
      const nextFunctionIndex = data.indexOf("/**", mainFunctionStartIndex + 10);
      if (nextFunctionIndex !== -1) {
        correctedContent = 
          data.substring(0, mainFunctionStartIndex) + 
          correctedMainFunction + 
          "\n\n" + 
          data.substring(nextFunctionIndex);
      }
    }
  }

  // Écrire le contenu corrigé dans le fichier
  fs.writeFile(scriptPath, correctedContent, 'utf8', (err) => {
    if (err) {
      console.error('Erreur lors de l\'écriture du fichier:', err);
      return;
    }
    console.log('Le script pappers-essentiel.js a été complètement corrigé.');
  });
});

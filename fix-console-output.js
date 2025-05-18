const fs = require('fs');
const path = require('path');

// Chemin vers le fichier pappers-essentiel.js
const scriptPath = path.join(__dirname, 'scripts', 'pappers-essentiel.js');

// Lire le contenu du fichier
fs.readFile(scriptPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Erreur lors de la lecture du fichier:', err);
    return;
  }

  // Modifier la fonction main pour effacer la console avant d'afficher les résultats
  const improvedMainFunction = `/**
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

  // Modifier les messages de log dans getEssentialInfo pour qu'ils soient moins intrusifs
  const improvedGetEssentialInfoLogs = `
    // Récupérer les données financières sociales
    let finances = [];
    try {
      // Tentative de récupération des données financières sociales
      const comptesResponse = await axios.get(\`https://api.pappers.fr/v2/entreprise/\${siren}/comptes-sociaux\`, {
        params: {
          _nocache: Date.now(), // Paramètre pour éviter la mise en cache
          api_token: PAPPERS_API_KEY
        }
      });`;

  // Remplacer la fonction main
  const mainFunctionRegex = /\/\*\*\s*\n\s*\* Fonction principale[\s\S]*?async function main\(\) \{[\s\S]*?}\s*\n\s*}/;
  
  let updatedContent = data;
  
  if (mainFunctionRegex.test(data)) {
    updatedContent = data.replace(mainFunctionRegex, improvedMainFunction);
  } else {
    console.error("Impossible de trouver la fonction main dans le fichier.");
    return;
  }

  // Réduire la verbosité des logs
  updatedContent = updatedContent.replace(
    /console\.log\("Tentative de récupération des données financières sociales\.\.\."\);/g,
    '// Tentative de récupération des données financières sociales'
  );
  
  updatedContent = updatedContent.replace(
    /console\.log\("Tentative de récupération des données financières consolidées\.\.\."\);/g,
    '// Tentative de récupération des données financières consolidées'
  );
  
  updatedContent = updatedContent.replace(
    /console\.log\("Tentative de récupération des données financières via la fiche financière\.\.\."\);/g,
    '// Tentative de récupération des données financières via la fiche financière'
  );

  // Écrire le contenu mis à jour dans le fichier
  fs.writeFile(scriptPath, updatedContent, 'utf8', (err) => {
    if (err) {
      console.error('Erreur lors de l\'écriture du fichier:', err);
      return;
    }
    console.log('Le fichier pappers-essentiel.js a été mis à jour pour améliorer l\'affichage des résultats.');
  });
});

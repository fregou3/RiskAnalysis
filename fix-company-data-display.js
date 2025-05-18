const fs = require('fs');
const path = require('path');

// Chemins vers les fichiers à modifier
const serverPath = path.join(__dirname, 'backend', 'server.js');
const pappersServicePath = path.join(__dirname, 'backend', 'services', 'pappersEssentialService.js');
const aiAnalysisPath = path.join(__dirname, 'frontend', 'src', 'pages', 'AIAnalysis.js');

// Lire le contenu des fichiers
let serverContent = fs.readFileSync(serverPath, 'utf8');
let pappersServiceContent = fs.readFileSync(pappersServicePath, 'utf8');
let aiAnalysisContent = fs.readFileSync(aiAnalysisPath, 'utf8');

// 1. Modifier le service pappersEssentialService.js pour qu'il fonctionne correctement avec l'option --full
pappersServiceContent = `const { exec } = require('child_process');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Exécute le script pappers-essentiel.js avec un SIREN ou un nom d'entreprise
 * @param {string} query - SIREN ou nom d'entreprise
 * @returns {Promise<object>} - Les données financières essentielles de l'entreprise
 */
async function getPappersEssentialData(query) {
  try {
    // Construire le chemin vers le script
    const scriptPath = path.join(__dirname, '..', '..', 'scripts', 'pappers-essentiel.js');
    
    // Construire la commande avec l'option --full pour obtenir les résultats bruts
    const command = \`node "\${scriptPath}" "\${query}" --full\`;
    
    console.log(\`Exécution de la commande: \${command}\`);
    
    // Exécuter le script
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      console.error(\`Erreur lors de l'exécution du script: \${stderr}\`);
    }
    
    // Retourner la sortie brute
    return { rawOutput: stdout };
  } catch (error) {
    console.error('Erreur lors de l\\'exécution du script pappers-essentiel.js:', error);
    return { error: error.message };
  }
}

module.exports = {
  getPappersEssentialData
};`;

// 2. Modifier la route /api/company-financial-data dans server.js pour qu'elle utilise correctement le service
serverContent = serverContent.replace(
  /const financialData = await getPappersEssentialData\(query, true\);/,
  'const financialData = await getPappersEssentialData(query);'
);

// 3. Modifier la fonction handleScrapingClick dans AIAnalysis.js pour s'assurer qu'elle appelle correctement l'API
const updatedHandleScrapingClick = `
  const handleScrapingClick = async () => {
    if (!companyName.trim()) {
      setError('Veuillez entrer un nom d\\'entreprise');
      return;
    }

    setScrapingLoading(true);
    setError('');

    try {
      // Utiliser l'identifiant pour la recherche si disponible, sinon utiliser le nom de l'entreprise
      const searchTerm = identifier.trim() || companyName.trim();
      
      // Appeler directement le service pour récupérer les données financières
      const response = await aiAnalysisService.getCompanyFinancialData(
        companyName.trim(),
        identifier
      );
      
      if (response.data && response.data.success) {
        setPappersData(response.data.data);
        setNotification({
          open: true,
          message: 'Recherche Internet terminée avec succès.'
        });
      } else {
        console.error('Erreur lors de la récupération des données:', response.data);
        setError('Aucune donnée trouvée pour cette entreprise.');
      }
    } catch (error) {
      console.error('Error in data fetching:', error);
      setError('Une erreur est survenue lors de la recherche Internet. Veuillez réessayer.');
    } finally {
      setScrapingLoading(false);
    }
  };`;

// Remplacer la fonction handleScrapingClick existante
aiAnalysisContent = aiAnalysisContent.replace(
  /const handleScrapingClick = async \(\) => \{[\s\S]+?\};/,
  updatedHandleScrapingClick
);

// Écrire les contenus modifiés dans les fichiers
fs.writeFileSync(pappersServicePath, pappersServiceContent, 'utf8');
fs.writeFileSync(serverPath, serverContent, 'utf8');
fs.writeFileSync(aiAnalysisPath, aiAnalysisContent, 'utf8');

console.log('Les modifications ont été effectuées avec succès. L\'application affichera maintenant correctement les données de l\'entreprise analysée.');

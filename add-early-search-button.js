const fs = require('fs');
const path = require('path');

// Chemin vers le fichier AIAnalysis.js
const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'AIAnalysis.js');

// Lire le contenu actuel du fichier
let content = fs.readFileSync(filePath, 'utf8');

// Modifier la section des boutons d'analyse pour inclure le bouton de recherche Internet
const updatedButtonsSection = `
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
                size="large"
              >
                {loading ? 'Analyse en cours...' : 'Analyser'}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleScrapingClick}
                disabled={scrapingLoading}
                startIcon={scrapingLoading ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
                size="large"
              >
                {scrapingLoading ? 'Recherche en cours...' : 'Recherche Internet'}
              </Button>
            </Box>`;

// Remplacer la section des boutons existante
content = content.replace(/<Box sx=\{\{ display: 'flex', justifyContent: 'center', mt: 2 \}\}>[\s\S]+?<\/Box>/,
  updatedButtonsSection);

// Modifier la fonction handleScrapingClick pour qu'elle ne dépende plus des résultats d'analyse
const updatedScrapingFunction = `
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
      
      const response = await aiAnalysisService.scrape(
        companyName.trim(),
        country,
        identifier,
        searchTerm
      );
      
      setScrapedData(response.data.data);
      setNotification({
        open: true,
        message: 'Recherche Internet terminée avec succès.'
      });
      
      // Récupérer les données Pappers après le scraping
      await handlePappersDataFetch();
    } catch (error) {
      console.error('Error in scraping:', error);
      setError('Une erreur est survenue lors de la recherche Internet. Veuillez réessayer.');
    } finally {
      setScrapingLoading(false);
    }
  };`;

// Remplacer la fonction handleScrapingClick existante
content = content.replace(/const handleScrapingClick = async \(\) => \{[\s\S]+?\};/,
  updatedScrapingFunction);

// Supprimer le bouton de recherche Internet de la section des résultats d'analyse
content = content.replace(/<Tooltip title="Collecter des informations supplémentaires sur Internet pour enrichir l'analyse">[\s\S]+?<\/Button>\s*<\/Tooltip>/,
  '');

// Écrire le contenu mis à jour dans le fichier
fs.writeFileSync(filePath, content, 'utf8');

console.log('Le bouton de recherche Internet a été ajouté à côté du bouton d\'analyse.');

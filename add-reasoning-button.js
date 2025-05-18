const fs = require('fs');
const path = require('path');

// Chemin vers le fichier AIAnalysis.js
const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'AIAnalysis.js');

// Lire le contenu actuel du fichier
let content = fs.readFileSync(filePath, 'utf8');

// Ajouter la fonction handleReasoningClick
const handleReasoningFunction = `
  const handleReasoningClick = async () => {
    if (!results.openai || !results.anthropic || !results.deepseek || !results.gemini) {
      setError('Veuillez d\\'abord lancer les analyses avec les quatre modèles');
      return;
    }

    setReasoningLoading(true);
    setShowReasoning(true);
    try {
      const response = await aiAnalysisService.reasoning(
        results.openai,
        results.anthropic,
        results.deepseek,
        results.gemini,
        companyName,
        scrapedData,
        pappersData,
        country,
        identifier
      );
      setResults(prev => ({ ...prev, reasoning: response.data.result }));
    } catch (err) {
      console.error('Error getting reasoning:', err);
      setError('Erreur lors de la génération du raisonnement. Veuillez réessayer.');
    } finally {
      setReasoningLoading(false);
    }
  };
`;

// Insérer la fonction handleReasoningClick après handleScrapingClick
content = content.replace(/  \};(\s*\/\/ Fonction pour récupérer les données financières)/, `  };${handleReasoningFunction}$1`);

// Modifier la section des boutons pour inclure le bouton de raisonnement
const reasoningButton = `
                <Tooltip title="Collecter des informations supplémentaires sur Internet pour enrichir l'analyse">
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleScrapingClick}
                    disabled={scrapingLoading || !(results.openai && results.anthropic && results.deepseek && results.gemini)}
                    startIcon={scrapingLoading ? <CircularProgress size={24} color="inherit" /> : <SearchIcon />}
                  >
                    {scrapingLoading ? 'Recherche en cours...' : 'Recherche Internet'}
                  </Button>
                </Tooltip>
                <Button
                  variant="contained"
                  color="warning"
                  onClick={handleReasoningClick}
                  disabled={reasoningLoading || !(results.openai && results.anthropic && results.deepseek && results.gemini)}
                  startIcon={reasoningLoading ? <CircularProgress size={24} color="inherit" /> : <SmartToyIcon />}
                >
                  {reasoningLoading ? 'Consolidation en cours...' : 'Moteur de raisonnement'}
                </Button>`;

// Remplacer la section des boutons existante
content = content.replace(/<Tooltip title="Collecter des informations supplémentaires sur Internet pour enrichir l'analyse">[\s\S]+?<\/Button>\s*<\/Tooltip>/,
  reasoningButton);

// Ajouter l'affichage du résultat du moteur de raisonnement
const reasoningResultSection = `
        {/* Résultat du moteur de raisonnement */}
        {showReasoning && results.reasoning && (
          <Box sx={{ mb: 3 }}>
            <Card sx={{ mb: 3 }}>
              <CardHeader 
                title="Analyse consolidée (Moteur de raisonnement)"
                sx={{ 
                  backgroundColor: '#FF5722',
                  color: 'white',
                  p: 1.5
                }}
              />
              <CardContent sx={{ overflow: 'auto', maxHeight: '800px' }}>
                <div ref={reasoningRef} dangerouslySetInnerHTML={{ __html: marked.parse(results.reasoning) }} />
              </CardContent>
            </Card>
            <Button 
              variant="outlined" 
              onClick={() => setShowReasoning(false)}
              sx={{ mt: 2 }}
            >
              Voir les analyses individuelles
            </Button>
          </Box>
        )}`;

// Insérer la section du résultat du moteur de raisonnement avant les résultats d'analyse individuels
content = content.replace(/{\/\* Résultats de l'analyse \*\/}[\s\S]+?<Box sx=\{\{ mt: 4 \}\}>/, 
  `{/* Résultats de l'analyse */}
        {(results.openai || results.anthropic || results.deepseek || results.gemini) && (
          <Box sx={{ mt: 4 }}>
            ${reasoningResultSection}`);

// Modifier l'affichage des résultats individuels pour les masquer lorsque le résultat du raisonnement est affiché
content = content.replace(/<Grid container spacing=\{3\}>[\s\S]+?<\/Grid>/, 
  `{!showReasoning && (
              <Grid container spacing={3}>
                {/* Résultat OpenAI */}
                <Grid item xs={12} md={6} lg={3}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardHeader 
                      title="OpenAI GPT" 
                      sx={{ 
                        backgroundColor: '#10a37f',
                        color: 'white',
                        p: 1.5
                      }}
                    />
                    <CardContent sx={{ flexGrow: 1, overflow: 'auto', maxHeight: '600px' }}>
                      {loadingStatus.openai ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                          <CircularProgress />
                        </Box>
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: marked.parse(results.openai) }} />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Résultat Claude */}
                <Grid item xs={12} md={6} lg={3}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardHeader 
                      title="Claude" 
                      sx={{ 
                        backgroundColor: '#5436da',
                        color: 'white',
                        p: 1.5
                      }}
                    />
                    <CardContent sx={{ flexGrow: 1, overflow: 'auto', maxHeight: '600px' }}>
                      {loadingStatus.anthropic ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                          <CircularProgress />
                        </Box>
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: marked.parse(results.anthropic) }} />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Résultat DeepSeek */}
                <Grid item xs={12} md={6} lg={3}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardHeader 
                      title="DeepSeek" 
                      sx={{ 
                        backgroundColor: '#0066ff',
                        color: 'white',
                        p: 1.5
                      }}
                    />
                    <CardContent sx={{ flexGrow: 1, overflow: 'auto', maxHeight: '600px' }}>
                      {loadingStatus.deepseek ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                          <CircularProgress />
                        </Box>
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: marked.parse(results.deepseek) }} />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Résultat Gemini */}
                <Grid item xs={12} md={6} lg={3}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardHeader 
                      title="Gemini" 
                      sx={{ 
                        backgroundColor: '#4285F4',
                        color: 'white',
                        p: 1.5
                      }}
                    />
                    <CardContent sx={{ flexGrow: 1, overflow: 'auto', maxHeight: '600px' }}>
                      {loadingStatus.gemini ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
                          <CircularProgress />
                        </Box>
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: marked.parse(results.gemini) }} />
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}`);

// Écrire le contenu mis à jour dans le fichier
fs.writeFileSync(filePath, content, 'utf8');

console.log('Le fichier AIAnalysis.js a été mis à jour avec succès pour inclure le bouton du moteur de raisonnement et l\'affichage des résultats consolidés.');

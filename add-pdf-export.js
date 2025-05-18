const fs = require('fs');
const path = require('path');

// Chemin vers le fichier AIAnalysis.js
const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'AIAnalysis.js');

// Lire le contenu actuel du fichier
let content = fs.readFileSync(filePath, 'utf8');

// Ajouter les fonctions d'export PDF
const pdfExportFunctions = `
  const handlePdfDialogOpen = () => {
    setOpenPdfDialog(true);
  };

  const handlePdfDialogClose = () => {
    setOpenPdfDialog(false);
  };

  const handleExportOptionChange = (event) => {
    setExportOption(event.target.value);
  };

  const handleExportPdf = async () => {
    setOpenPdfDialog(false);
    
    try {
      const elementToExport = exportOption === 'reasoning' ? reasoningRef.current : allAnalysesRef.current;
      
      if (!elementToExport) {
        console.error('Element to export not found');
        return;
      }
      
      const canvas = await html2canvas(elementToExport, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210; // A4 width in mm
      const imgHeight = canvas.height * imgWidth / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // Ajouter des métadonnées
      pdf.setProperties({
        title: \`Analyse IA - \${companyName}\`,
        subject: \`Rapport d'analyse pour \${companyName}\`,
        author: 'RiskAnalysis AI',
        keywords: 'analyse, risque, entreprise, IA',
        creator: 'RiskAnalysis Platform'
      });
      
      // Sauvegarder le PDF
      pdf.save(\`analyse-\${companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf\`);
      
      setNotification({
        open: true,
        message: 'Rapport PDF généré avec succès'
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      setNotification({
        open: true,
        message: 'Erreur lors de la génération du PDF'
      });
    }
  };
`;

// Insérer les fonctions d'export PDF après handleReasoningClick
content = content.replace(/  \};(\s*\/\/ Fonction pour récupérer les données financières)/, `  };${pdfExportFunctions}$1`);

// Ajouter le bouton d'export PDF dans la section du moteur de raisonnement
const pdfExportButton = `
              </CardContent>
            </Card>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button 
                variant="outlined" 
                onClick={() => setShowReasoning(false)}
              >
                Voir les analyses individuelles
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={handlePdfDialogOpen}
                startIcon={<PictureAsPdfIcon />}
              >
                Exporter en PDF
              </Button>
            </Box>`;

// Remplacer la section existante
content = content.replace(/<\/CardContent>\s*<\/Card>\s*<Button\s*variant="outlined"\s*onClick={\(\) => setShowReasoning\(false\)}\s*sx={\{ mt: 2 \}}\s*>\s*Voir les analyses individuelles\s*<\/Button>/,
  pdfExportButton);

// Ajouter la boîte de dialogue d'export PDF
const pdfDialog = `
      {/* Boîte de dialogue pour l'export PDF */}
      <Dialog open={openPdfDialog} onClose={handlePdfDialogClose}>
        <DialogTitle>Exporter en PDF</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Choisissez ce que vous souhaitez exporter en PDF :
          </DialogContentText>
          <FormControl component="fieldset" sx={{ mt: 2 }}>
            <RadioGroup
              aria-label="export-option"
              name="export-option"
              value={exportOption}
              onChange={handleExportOptionChange}
            >
              <FormControlLabel 
                value="reasoning" 
                control={<Radio />} 
                label="Analyse consolidée uniquement" 
                disabled={!results.reasoning}
              />
              <FormControlLabel 
                value="all" 
                control={<Radio />} 
                label="Toutes les analyses" 
              />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePdfDialogClose}>Annuler</Button>
          <Button onClick={handleExportPdf} variant="contained" color="primary">
            Exporter
          </Button>
        </DialogActions>
      </Dialog>`;

// Ajouter la boîte de dialogue avant la fermeture du Container
content = content.replace(/<\/Container>/,
  `${pdfDialog}\n    </Container>`);

// Ajouter la référence pour toutes les analyses
content = content.replace(/<Grid container spacing=\{3\}>/,
  `<Grid container spacing={3} ref={allAnalysesRef}>`);

// Écrire le contenu mis à jour dans le fichier
fs.writeFileSync(filePath, content, 'utf8');

console.log('Le bouton d\'export PDF a été ajouté avec succès à la section du moteur de raisonnement.');

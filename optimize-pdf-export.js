const fs = require('fs');
const path = require('path');

// Chemin vers le fichier AIAnalysis.js
const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'AIAnalysis.js');

// Lire le contenu actuel du fichier
let content = fs.readFileSync(filePath, 'utf8');

// Remplacer la fonction handleExportPdf par une version optimisée
const optimizedPdfExportFunction = `
  const handleExportPdf = async () => {
    setOpenPdfDialog(false);
    
    try {
      const elementToExport = exportOption === 'reasoning' ? reasoningRef.current : allAnalysesRef.current;
      
      if (!elementToExport) {
        console.error('Element to export not found');
        return;
      }
      
      // Créer un nouveau PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Ajouter des métadonnées
      pdf.setProperties({
        title: \`Analyse IA - \${companyName}\`,
        subject: \`Rapport d'analyse pour \${companyName}\`,
        author: 'RiskAnalysis AI',
        keywords: 'analyse, risque, entreprise, IA',
        creator: 'RiskAnalysis Platform'
      });
      
      // Obtenir le contenu HTML brut
      const htmlContent = exportOption === 'reasoning' ? results.reasoning : 
        \`# Analyse complète pour \${companyName}\\n\\n## OpenAI\\n\${results.openai}\\n\\n## Claude\\n\${results.anthropic}\\n\\n## DeepSeek\\n\${results.deepseek}\\n\\n## Gemini\\n\${results.gemini}\`;
      
      // Convertir le markdown en HTML
      const htmlText = marked.parse(htmlContent).replace(/Ø=ßà/g, "");
      
      // Configuration pour splitTextToSize
      const pageWidth = 170; // Largeur de la page A4 moins les marges
      const fontSize = 10;
      pdf.setFontSize(fontSize);
      
      // Ajouter un titre
      pdf.setFontSize(16);
      pdf.text(\`Analyse IA pour \${companyName}\`, 20, 20).replace(/Ø=ßà/g, "");
      pdf.setFontSize(12);
      pdf.text(\`Généré le \${new Date().replace(/Ø=ßà/g, "").toLocaleString()}\`, 20, 30);
      pdf.setFontSize(fontSize);
      
      // Ajouter une ligne de séparation
      pdf.line(20, 35, 190, 35);
      
      // Extraire le texte du HTML (version simplifiée)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlText;
      const text = tempDiv.textContent || tempDiv.innerText || '';
      
      // Diviser le texte en lignes qui tiennent sur la page
      const lines = pdf.splitTextToSize(text, pageWidth);
      
      // Variables pour la pagination
      let y = 40;
      const lineHeight = fontSize * 0.5;
      let pageNumber = 1;
      
      // Ajouter les lignes au PDF
      for (let i = 0; i < lines.length; i++) {
        // Si on atteint le bas de la page, créer une nouvelle page
        if (y > 270) {
          pdf.addPage();
          pageNumber++;
          // Ajouter un en-tête à la nouvelle page
          pdf.setFontSize(10);
          pdf.text(\`Analyse IA pour \${companyName} - Page \${pageNumber}\`, 20, 20).replace(/Ø=ßà/g, "");
          pdf.line(20, 25, 190, 25);
          pdf.setFontSize(fontSize);
          y = 30;
        }
        
        // Ajouter la ligne de texte
        pdf.text((lines[i] ? lines[i].replace(/Ø=ßà/g, "") : ""), 20, y).replace(/Ø=ßà/g, "");
        y += lineHeight;
      }
      
      // Ajouter le numéro de page sur chaque page
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.text(\`Page \${i} / \${totalPages}\`, pdf.internal.pageSize.width - 30, pdf.internal.pageSize.height - 10).replace(/Ø=ßà/g, "");
      }
      
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
  };`;

// Remplacer la fonction handleExportPdf existante
content = content.replace(/const handleExportPdf = async \(\) => \{[\s\S]+?\};/,
  optimizedPdfExportFunction);

// Écrire le contenu mis à jour dans le fichier
fs.writeFileSync(filePath, content, 'utf8');

console.log('La fonction d\'export PDF a été optimisée avec succès pour améliorer la qualité et réduire la taille.');

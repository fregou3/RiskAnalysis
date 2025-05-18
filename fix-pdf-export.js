/**
 * Solution pour corriger l'affichage des pastilles de couleur dans les PDF
 * 
 * Ce fichier contient la version corrigée de la fonction handleExportPdf
 * à intégrer dans le fichier frontend/src/pages/AIAnalysis.js
 */

// Fonction pour obtenir la couleur correspondant au niveau de risque
const getRiskColor = (score) => {
  if (score < 66) return '#4caf50'; // Vert pour risque faible
  if (score < 80) return '#ff9800'; // Orange pour risque moyen
  return '#f44336'; // Rouge pour risque élevé
};

// Fonction pour dessiner une pastille de couleur dans le PDF
const drawRiskIndicator = (pdf, x, y, score) => {
  const color = getRiskColor(score);
  
  // Sauvegarder l'état actuel
  pdf.saveGraphicsState();
  
  // Dessiner un cercle de couleur plus grand et plus visible
  pdf.setFillColor(color);
  pdf.circle(x, y, 3, 'F'); // Augmenter la taille du cercle pour meilleure visibilité
  
  // Ajouter une bordure noire pour améliorer la visibilité
  pdf.setDrawColor(0, 0, 0); // Noir
  pdf.setLineWidth(0.2);
  pdf.circle(x, y, 3, 'S');
  
  // Restaurer l'état
  pdf.restoreGraphicsState();
};

// Fonction principale d'export PDF corrigée
const handleExportPdf = async () => {
  setOpenPdfDialog(false);
  
  try {
    // Créer un nouveau document PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Ajouter des métadonnées
    pdf.setProperties({
      title: `Analyse IA - ${companyName}`,
      subject: `Rapport d'analyse pour ${companyName}`,
      author: 'RiskAnalysis AI',
      keywords: 'analyse, risque, entreprise, IA',
      creator: 'RiskAnalysis Platform'
    });
    
    // Obtenir le contenu HTML brut
    let htmlContent = exportOption === 'reasoning' ? results.reasoning : 
      `# Analyse complète pour ${companyName}\n\n## OpenAI\n${results.openai}\n\n## Claude\n${results.anthropic}\n\n## DeepSeek\n${results.deepseek}\n\n## Gemini\n${results.gemini}`;
    
    // Fonction pour pré-traiter le texte et remplacer les caractères spéciaux par des marqueurs
    const preprocessText = (text) => {
      if (!text) return '';
      
      let processedText = text;
      
      // Pattern 1: Note : XX Ø=ßà ou Ø=ßâ ou Ø=Ý4
      processedText = processedText.replace(/(Note\s*:?\s*)(\d+)(\s*Ø=ß[àâ]|Ø=Ý4)/gi, (match, prefix, score) => {
        return `${prefix}${score} [[RISK:${score}]]`;
      });
      
      // Pattern 2: Note de risque : XX Ø=ßà ou Ø=ßâ ou Ø=Ý4
      processedText = processedText.replace(/(Note\s+de\s+risque\s*:?\s*)(\d+)(\s*Ø=ß[àâ]|Ø=Ý4)/gi, (match, prefix, score) => {
        return `${prefix}${score} [[RISK:${score}]]`;
      });
      
      // Pattern 3: Note Globale : XX Ø=ßà ou Ø=ßâ ou Ø=Ý4
      processedText = processedText.replace(/(Note\s+Globale\s*:?\s*)(\d+)(\s*Ø=ß[àâ]|Ø=Ý4)/gi, (match, prefix, score) => {
        return `${prefix}${score} [[RISK:${score}]]`;
      });
      
      // Pattern 4: Risque XX (Ø=ßà XX)
      processedText = processedText.replace(/(Risque\s+[^(]*)\((Ø=ß[àâ]|Ø=Ý4)\s*(\d+)\)/gi, (match, prefix, specialChar, score) => {
        return `${prefix}(${score} [[RISK:${score}]])`;
      });
      
      // Pattern 5: Standalone Ø=ßà XX
      processedText = processedText.replace(/(Ø=ß[àâ]|Ø=Ý4)\s*(\d+)/gi, (match, specialChar, score) => {
        return `${score} [[RISK:${score}]]`;
      });
      
      // Supprimer tous les caractères spéciaux restants
      processedText = processedText.replace(/Ø=ß[àâ]|Ø=Ý4/g, '');
      
      return processedText;
    };
    
    // Pré-traiter le contenu pour remplacer les caractères spéciaux par des marqueurs
    htmlContent = preprocessText(htmlContent);
    
    // Convertir le markdown en HTML
    const htmlText = marked.parse(htmlContent);
    
    // Configuration pour splitTextToSize
    const pageWidth = 170; // Largeur de la page A4 moins les marges
    const fontSize = 10;
    pdf.setFontSize(fontSize);
    
    // Ajouter un titre
    pdf.setFontSize(16);
    pdf.text(`Analyse IA pour ${companyName}`, 20, 20);
    pdf.setFontSize(12);
    pdf.text(`Généré le ${new Date().toLocaleString()}`, 20, 30);
    pdf.setFontSize(fontSize);
    
    // Ajouter une ligne de séparation
    pdf.line(20, 35, 190, 35);
    
    // Extraire le texte du HTML (version simplifiée)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlText;
    const text = (tempDiv.textContent || tempDiv.innerText || '');
    
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
        pdf.text(`Analyse IA pour ${companyName} - Page ${pageNumber}`, 20, 20);
        pdf.line(20, 25, 190, 25);
        pdf.setFontSize(fontSize);
        y = 30;
      }
      
      // Ajouter la ligne de texte avec gestion des indicateurs de risque
      if (lines[i]) {
        // Vérifier si la ligne contient un marqueur d'indicateur de risque
        const riskMatch = lines[i].match(/\[\[RISK:(\d+)\]\]/);
        
        if (riskMatch) {
          // Extraire le score de risque
          const riskScore = parseInt(riskMatch[1], 10);
          
          // Remplacer le marqueur par un espace pour l'affichage du texte
          const cleanLine = lines[i].replace(/\[\[RISK:\d+\]\]/, "");
          
          // Afficher le texte
          pdf.text(cleanLine, 20, y);
          
          // Rechercher la position du score dans la ligne
          const scoreStr = riskScore.toString();
          const scoreIndex = cleanLine.indexOf(scoreStr);
          
          if (scoreIndex > 0) {
            // Calculer la largeur du texte jusqu'à la position après le score
            const textWidth = pdf.getStringUnitWidth(cleanLine.substring(0, scoreIndex + scoreStr.length)) * fontSize / pdf.internal.scaleFactor;
            
            // Dessiner la pastille de couleur juste après le score
            drawRiskIndicator(pdf, 20 + textWidth + 1, y - 1.5, riskScore);
          }
        } else {
          // Ligne normale sans indicateur de risque
          pdf.text(lines[i], 20, y);
        }
      }
      
      y += lineHeight;
    }
    
    // Ajouter le numéro de page sur chaque page
    const totalPages = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(`Page ${i} / ${totalPages}`, pdf.internal.pageSize.width - 30, pdf.internal.pageSize.height - 10);
    }
    
    // Sauvegarder le PDF
    pdf.save(`analyse-${companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    
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

/**
 * Instructions d'intégration:
 * 
 * 1. Remplacez la fonction handleExportPdf dans le fichier frontend/src/pages/AIAnalysis.js
 *    par la fonction ci-dessus.
 * 
 * 2. Assurez-vous que la fonction drawRiskIndicator est également mise à jour
 *    avec la version fournie dans ce fichier.
 * 
 * 3. Vérifiez que la fonction getRiskColor est correctement définie.
 * 
 * Cette solution résout les problèmes suivants:
 * - Remplacement des caractères spéciaux (Ø=ßà, Ø=ßâ, Ø=Ý4) par des pastilles de couleur
 * - Affichage correct des pastilles de couleur dans le PDF
 * - Positionnement des pastilles après les scores de risque
 * - Prise en compte de tous les formats de notation de risque
 */

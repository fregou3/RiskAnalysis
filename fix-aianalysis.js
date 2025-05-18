const fs = require('fs');
const path = require('path');

// Chemin vers le fichier AIAnalysis.js
const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'AIAnalysis.js');

// Lire le contenu actuel du fichier
let content = fs.readFileSync(filePath, 'utf8');

// Rechercher et supprimer la deuxième déclaration de fetchFinancialData
const fetchFinancialDataRegex = /\/\/ Fonction pour récupérer les données financières de l'entreprise\s+const fetchFinancialData = async \(\) => \{[\s\S]+?setFinancialDataLoading\(false\);\s+\};\s+/g;

// Compter les occurrences
const matches = content.match(fetchFinancialDataRegex);
if (matches && matches.length > 1) {
  // Supprimer la deuxième occurrence
  let firstOccurrenceFound = false;
  content = content.replace(fetchFinancialDataRegex, (match) => {
    if (!firstOccurrenceFound) {
      firstOccurrenceFound = true;
      return match;
    }
    return '';
  });
}

// Nettoyer les lignes corrompues
content = content.replace(/fetchFinancialData\(\);[\s\S]*?\}\s*\)\s*\}/g, '');

// Ajouter le composant CompanyFinancialData dans la section appropriée
const pappersDataDisplayRegex = /{\s*\/\* Données Pappers \*\/\s*}\s*{\s*\(pappersData \|\| pappersLoading\) && \(\s*<Grid item xs={12}>\s*<PappersDataDisplay data={pappersData} loading={pappersLoading} \/>\s*<\/Grid>\s*\)\s*}/;

const companyFinancialDataComponent = `{/* Données Pappers */}
          {(pappersData || pappersLoading) && (
            <Grid item xs={12}>
              <PappersDataDisplay data={pappersData} loading={pappersLoading} />
            </Grid>
          )}
          
          {/* Données financières */}
          {(financialData || financialDataLoading) && (
            <Grid item xs={12}>
              <CompanyFinancialData data={financialData} loading={financialDataLoading} />
            </Grid>
          )}`;

content = content.replace(pappersDataDisplayRegex, companyFinancialDataComponent);

// Écrire le contenu corrigé dans le fichier
fs.writeFileSync(filePath, content, 'utf8');

console.log('Le fichier AIAnalysis.js a été corrigé avec succès.');

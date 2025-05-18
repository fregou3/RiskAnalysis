const fs = require('fs');
const path = require('path');

// Chemins vers les fichiers à modifier
const pappersDisplayPath = path.join(__dirname, 'frontend', 'src', 'components', 'PappersDataDisplay.js');
const pappersServicePath = path.join(__dirname, 'backend', 'services', 'pappersEssentialService.js');

// Lire le contenu des fichiers
let pappersDisplayContent = fs.readFileSync(pappersDisplayPath, 'utf8');
let pappersServiceContent = fs.readFileSync(pappersServicePath, 'utf8');

// 1. Modifier le service backend pour utiliser l'option --full
pappersServiceContent = pappersServiceContent.replace(
  /const command = `node "\${scriptPath}" "\${query}" \${jsonOutput \? '--json' : ''}`/,
  'const command = `node "${scriptPath}" "${query}" ${jsonOutput ? \'--json\' : \'--full\'}`'
);

// 2. Simplifier le composant PappersDataDisplay pour afficher les résultats bruts
const newPappersDisplayContent = `import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Paper
} from '@mui/material';

const PappersDataDisplay = ({ data, loading }) => {
  console.log('PappersDataDisplay - Props reçus:', { data, loading });
  
  if (loading) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Résultats de la recherche Internet" 
          sx={{ 
            backgroundColor: '#1976d2',
            color: 'white',
            p: 1.5
          }}
        />
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!data || Object.keys(data).length === 0) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Résultats de la recherche Internet" 
          sx={{ 
            backgroundColor: '#1976d2',
            color: 'white',
            p: 1.5
          }}
        />
        <CardContent>
          <Typography variant="body1">
            Aucune donnée officielle disponible pour cette entreprise.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Afficher les résultats bruts
  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader title="Résultats de la recherche Internet" 
        sx={{ 
          backgroundColor: '#1976d2',
          color: 'white',
          p: 1.5
        }}
      />
      <CardContent>
        <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          {data.rawOutput ? (
            <Typography 
              variant="body2" 
              component="pre" 
              sx={{ 
                fontFamily: 'monospace', 
                whiteSpace: 'pre-wrap',
                fontSize: '0.9rem',
                lineHeight: 1.5
              }}
            >
              {data.rawOutput}
            </Typography>
          ) : (
            <Typography variant="body1">
              Aucune donnée brute disponible.
            </Typography>
          )}
        </Paper>
      </CardContent>
    </Card>
  );
};

export default PappersDataDisplay;`;

// 3. Modifier le backend pour retourner les résultats bruts
const updateBackendService = `const { exec } = require('child_process');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Exécute le script pappers-essentiel.js avec un SIREN ou un nom d'entreprise
 * @param {string} query - SIREN ou nom d'entreprise
 * @param {boolean} jsonOutput - Si true, retourne les résultats au format JSON
 * @returns {Promise<object>} - Les données financières essentielles de l'entreprise
 */
async function getPappersEssentialData(query, jsonOutput = false) {
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

// Écrire les contenus modifiés dans les fichiers
fs.writeFileSync(pappersDisplayPath, newPappersDisplayContent, 'utf8');
fs.writeFileSync(pappersServicePath, updateBackendService, 'utf8');

console.log('Les modifications ont été effectuées avec succès pour afficher les résultats bruts du script pappers-essentiel.js.');

const fs = require('fs');
const path = require('path');

// Chemin vers le fichier AIAnalysis.js
const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'AIAnalysis.js');

// Contenu complet du fichier AIAnalysis.js avec une structure JSX valide
const content = `import React, { useState, useRef } from 'react';
import {
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Box,
  CircularProgress,
  Divider,
  Alert,
  Card,
  CardContent,
  CardHeader,
  InputAdornment,
  Tooltip,
  Snackbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import BusinessIcon from '@mui/icons-material/Business';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import LanguageIcon from '@mui/icons-material/Language';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import FilterListIcon from '@mui/icons-material/FilterList';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CategoryIcon from '@mui/icons-material/Category';
import DescriptionIcon from '@mui/icons-material/Description';
import PappersDataDisplay from '../components/PappersDataDisplay';
import CompanyFinancialData from '../components/CompanyFinancialData';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import SecurityIcon from '@mui/icons-material/Security';
import ApartmentIcon from '@mui/icons-material/Apartment';
import WorkIcon from '@mui/icons-material/Work';
import NatureIcon from '@mui/icons-material/Nature';
import InfoIcon from '@mui/icons-material/Info';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { marked } from 'marked';
import { aiAnalysisService } from '../services/api';

// Fonction pour obtenir l'icône appropriée pour chaque catégorie de données
const getCategoryIcon = (category) => {
  const iconStyle = { mr: 1, fontSize: '1.2rem' };
  
  switch(category.toLowerCase()) {
    case 'legend':
      return <ListAltIcon sx={iconStyle} color="primary" />;
    case 'subsidiaries':
      return <AccountTreeIcon sx={iconStyle} color="primary" />;
    case 'riskassessments':
      return <AssessmentIcon sx={iconStyle} color="error" />;
    case 'sectorcodes':
      return <CategoryIcon sx={iconStyle} color="primary" />;
    case 'commercialdescription':
      return <DescriptionIcon sx={iconStyle} color="primary" />;
    case 'financialdata':
      return <AttachMoneyIcon sx={iconStyle} color="success" />;
    case 'contactinfo':
      return <ContactMailIcon sx={iconStyle} color="primary" />;
    case 'legalinfo':
      return <SecurityIcon sx={iconStyle} color="warning" />;
    case 'ownershipstructure':
      return <ApartmentIcon sx={iconStyle} color="primary" />;
    case 'sectoractivity':
      return <WorkIcon sx={iconStyle} color="primary" />;
    case 'esgscores':
      return <NatureIcon sx={iconStyle} color="success" />;
    case 'otherinfo':
      return <InfoIcon sx={iconStyle} color="primary" />;
    default:
      return <InfoIcon sx={iconStyle} color="primary" />;
  }
};

const AIAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [reasoningLoading, setReasoningLoading] = useState(false);
  const [scrapingLoading, setScrapingLoading] = useState(false);
  const [financialDataLoading, setFinancialDataLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [country, setCountry] = useState('France');
  const [identifier, setIdentifier] = useState('');
  const [results, setResults] = useState({
    openai: '',
    anthropic: '',
    deepseek: '',
    gemini: '',
    reasoning: ''
  });
  const [loadingStatus, setLoadingStatus] = useState({
    openai: false,
    anthropic: false,
    deepseek: false,
    gemini: false
  });
  
  // États pour l'exportation PDF
  const [openPdfDialog, setOpenPdfDialog] = useState(false);
  const [exportOption, setExportOption] = useState('reasoning');
  const reasoningRef = useRef(null);
  const allAnalysesRef = useRef(null);
  const [error, setError] = useState('');
  const [showReasoning, setShowReasoning] = useState(false);
  const [scrapedData, setScrapedData] = useState(null);
  const [pappersData, setPappersData] = useState(null);
  const [pappersLoading, setPappersLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '' });
  const [financialData, setFinancialData] = useState(null);
  
  // Prompt template pour l'analyse des entreprises
  const promptTemplate = \`Tu es un spécialiste de l'analyse d'entreprise avec une expertise particulière dans l'analyse de risque fournisseur et la collecte de données structurées sur les sociétés.

Nous avons besoin d'un rapport détaillé sur la société {{COMPANY_NAME}}.

IMPORTANT:
- Utilise un format structuré avec des titres et sous-titres clairs pour chaque catégorie
- Indique explicitement "Information non disponible" lorsque tu ne peux pas trouver une donnée spécifique
- Cite tes sources d'information lorsque c'est possible (rapports annuels, sites officiels, bases de données spécialisées)
- Fournis les données les plus récentes disponibles en précisant la date
- Utilise le format Markdown pour structurer ta réponse

Collecte et présente les informations suivantes sur {{COMPANY_NAME}}:

## 1. Informations sur la légende et le filtrage
- Statut des correspondances potentielles ou acceptées (pour les noms / entités)
- Types d'entités (individuel/famille, corporate)
- Filtres appliqués (ex : niveaux dépliés)

## 2. Filiales et entités liées
- Nom complet de la filiale
- Pays d'enregistrement
- Type (ex : Corporate, Joint Venture, etc.)
- Statut de propriété (directe/indirecte)
- Pourcentage de détention directe et totale (avec dates de mise à jour)
- Source de l'information

## 3. Modèles et évaluations risques (Risk assessments)
- Nom du modèle d'évaluation utilisé
- Date de début de l'évaluation
- Statut actuel du modèle (en cours/terminé)
- Nom de l'évaluateur ou de l'organisme responsable
- Version du modèle
- Niveau de risque associé (avec échelle et interprétation)

## 4. Codes sectoriels et classifications
- ONace code(s) avec description
- NACE Rev. 2 code(s) avec description
- NAICS 2022 code(s) avec description
- US SIC code(s) avec description
- Branche d'activité principale et secondaire
- Type de produits/services (catégorisation)

## 5. Description commerciale
- Description détaillée de l'activité (en anglais)
- Description de l'activité dans la langue originale si différente
- Description des principaux produits fabriqués ou services offerts
- Position sur le marché et avantages concurrentiels

## 6. Données financières clés
- Période de consolidation (exercice fiscal)
- Revenus d'exploitation (chiffre d'affaires) sur les 3 dernières années
- Résultat avant impôt sur les 3 dernières années
- Résultat net de la période sur les 3 dernières années
- Flux de trésorerie (avant D&A) sur les 3 dernières années
- Norme comptable appliquée (IFRS, GAAP, etc.)
- Tendances financières significatives

## 7. Données de localisation et contact
- Adresse complète du siège social
- Adresses des principaux sites d'exploitation
- Téléphone, fax
- Domaine/URL du site internet officiel
- Adresse e-mail de contact générale ou relations investisseurs
- Codes territoriaux/statistiques (ISO, NUTS)

## 8. Informations légales
- Statut légal actuel (actif/inactif)
- Type de société (par ex. GmbH, SA, SAS, Ltd, etc.)
- Année d'incorporation et juridiction
- Identifiants légaux (numéro registre, LEI, VAT, Orbis ID, autres ID spécifiques)
- Changements récents de statut juridique

## 9. Indicateurs d'indépendance et structures d'actionnariat
- Indicateur d'indépendance (structure d'actionnariat)
- Détail des actionnaires principaux (nom, pays, type, % de détention, date de l'information)
- Chemin vers l'ultimate owner (chaîne de propriété)
- Définition de l'ultimate owner (entité finale de contrôle)
- Évolution récente de l'actionnariat

## 10. Secteur d'activité et description produits/services
- Type d'entité (producteur, distributeur, prestataire de services, etc.)
- Secteur BvD avec code
- Section NACE Rev. 2 principale avec code
- Description détaillée des produits et services
- Part de marché et positionnement concurrentiel

## 11. Évolution des scores ESG
- Score ESG global par année (3 dernières années)
- Scores spécifiques : environnemental, social, gouvernance (avec tendance)
- Performances individuelles des domaines (forces et faiblesses)
- Détail des sous-domaines ESG (relations de travail, gestion, restructurations, santé/sécurité...)
- Initiatives ESG notables et objectifs déclarés

## 12. Autres informations pertinentes
- Détail de l'attribution/gestion du LEI
- Évolutions/approbations liées à l'entité ou l'évaluation
- Principaux dirigeants et membres du conseil d'administration
- Litiges ou controverses significatifs
- Projets d'expansion ou changements stratégiques annoncés

Fournis une analyse aussi complète et précise que possible, en structurant clairement les informations selon les catégories ci-dessus.\`;

  // Fonction pour vérifier si tous les modèles ont terminé leur analyse
  const areAllModelsFinished = (status) => {
    return !status.openai && !status.anthropic && !status.deepseek && !status.gemini;
  };

  const handleCompanyNameChange = (event) => {
    setCompanyName(event.target.value);
  };

  const handleCountryChange = (event) => {
    setCountry(event.target.value);
  };

  const handleIdentifierChange = (event) => {
    setIdentifier(event.target.value);
  };

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      setError('Veuillez saisir un nom de société');
      return;
    }

    setLoading(true);
    setError('');
    setResults({
      openai: '',
      anthropic: '',
      deepseek: '',
      gemini: ''
    });
    setLoadingStatus({
      openai: true,
      anthropic: true,
      deepseek: true,
      gemini: true
    });

    const companyNameTrimmed = companyName.trim();
    console.log('Sending company name:', companyNameTrimmed);

    // Remplacer le placeholder par le nom de la société
    const prompt = promptTemplate.replace(/{{COMPANY_NAME}}/g, companyNameTrimmed);

    // Lancer les analyses avec les quatre modèles en parallèle
    const models = ['openai', 'anthropic', 'deepseek', 'gemini'];
    
    models.forEach(async (model) => {
      try {
        const response = await aiAnalysisService.analyze(prompt, model, companyNameTrimmed, country, identifier);
        setResults(prev => ({
          ...prev,
          [model]: response.data.result
        }));
        setLoadingStatus(prev => {
          const newStatus = {
            ...prev,
            [model]: false
          };
          // Si tous les modèles ont terminé, désactiver l'indicateur de chargement global
          if (areAllModelsFinished(newStatus)) {
            setLoading(false);
          }
          return newStatus;
        });
      } catch (error) {
        console.error(\`Error analyzing text with \${model}:\`, error);
        setResults(prev => ({
          ...prev,
          [model]: \`Erreur lors de l'analyse avec \${model}. Veuillez vérifier que les clés API sont correctement configurées.\`
        }));
        setLoadingStatus(prev => {
          const newStatus = {
            ...prev,
            [model]: false
          };
          // Si tous les modèles ont terminé, désactiver l'indicateur de chargement global
          if (areAllModelsFinished(newStatus)) {
            setLoading(false);
          }
          return newStatus;
        });
      }
    });
  };

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
        message: 'Recherche Internet terminée avec succès. Les données seront utilisées par le moteur de raisonnement.'
      });
      setScrapingLoading(false);
      
      // Récupérer les données Pappers après le scraping
      await handlePappersDataFetch();
    } catch (error) {
      console.error('Error in scraping:', error);
      setError('Une erreur est survenue lors de la recherche Internet. Veuillez réessayer.');
      setScrapingLoading(false);
    }
  };

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
  
  // Fonction pour récupérer les données financières de l'entreprise
  const fetchFinancialData = async () => {
    if (!companyName.trim()) {
      return;
    }
    
    setFinancialDataLoading(true);
    
    try {
      const response = await aiAnalysisService.getCompanyFinancialData(
        companyName.trim(),
        identifier
      );
      
      if (response.data && response.data.success) {
        setFinancialData(response.data.data);
      } else {
        console.error('Erreur lors de la récupération des données financières:', response.data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données financières:', error);
    } finally {
      setFinancialDataLoading(false);
    }
  };
  
  // Fonction pour récupérer les données Pappers
  const handlePappersDataFetch = async () => {
    if (!companyName.trim()) {
      return;
    }
    
    setPappersLoading(true);
    
    try {
      // Utiliser les résultats des analyses IA comme texte d'analyse si disponibles
      let analysisText = '';
      if (results.openai) {
        analysisText += results.openai + '\\n\\n';
      }
      if (results.anthropic) {
        analysisText += results.anthropic + '\\n\\n';
      }
      
      const response = await aiAnalysisService.getPappersData(
        companyName.trim(),
        country,
        identifier,
        analysisText
      );
      
      setPappersData(response.data.data);
      setNotification({
        open: true,
        message: 'Données officielles récupérées avec succès via Pappers.'
      });
      
      // Récupérer les données financières
      fetchFinancialData();
    } catch (error) {
      console.error('Error fetching Pappers data:', error);
      // Ne pas afficher d'erreur à l'utilisateur, car cette fonctionnalité est complémentaire
    } finally {
      setPappersLoading(false);
    }
  };

  // Fonction de base pour le rendu
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
        message={notification.message}
      />
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Analyse IA
        </Typography>
        <Typography variant="body1" paragraph>
          Utilisez l'intelligence artificielle pour générer un rapport complet sur une société.
        </Typography>

        {/* Formulaire d'analyse */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <TextField
              label="Nom de la société"
              fullWidth
              value={companyName}
              onChange={handleCompanyNameChange}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <BusinessIcon />
                  </InputAdornment>
                ),
              }}
              required
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Pays"
              fullWidth
              value={country}
              onChange={handleCountryChange}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LanguageIcon />
                  </InputAdornment>
                ),
              }}
              placeholder="Ex: France, USA"
              helperText="Précise la recherche des moteurs IA"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Identifiant (SIREN, VAT, etc.)"
              fullWidth
              value={identifier}
              onChange={handleIdentifierChange}
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FilterListIcon />
                  </InputAdornment>
                ),
              }}
              placeholder="Ex: FR12345678901, 123456789"
              helperText="Utilisé pour la recherche internet si renseigné"
            />
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
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
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Résultats */}
      <Box sx={{ mt: 4 }}>
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
        )}

        {/* Résultats de l'analyse */}
        {(results.openai || results.anthropic || results.deepseek || results.gemini) && (
          <Box sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" component="div">
                Résultats de l'analyse
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
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
                </Button>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {new Date().toLocaleString()}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            {!showReasoning && (
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
            )}
          </Box>
        )}

        <Grid container spacing={3}>
          {/* Données Pappers */}
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
          )}
        </Grid>
      </Box>
    </Container>
  );
};

export default AIAnalysis;`;

// Écrire le contenu dans le fichier
fs.writeFileSync(filePath, content, 'utf8');

console.log('Le fichier AIAnalysis.js a été entièrement recréé avec une structure JSX valide.');

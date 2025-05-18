const fs = require('fs');
const path = require('path');

// Chemin vers le fichier AIAnalysis.js
const filePath = path.join(__dirname, 'frontend', 'src', 'pages', 'AIAnalysis.js');

// Contenu de base du fichier AIAnalysis.js
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
              onChange={(e) => setCompanyName(e.target.value)}
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
              onChange={(e) => setCountry(e.target.value)}
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
              onChange={(e) => setIdentifier(e.target.value)}
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
                onClick={() => {}}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <SendIcon />}
                size="large"
              >
                {loading ? 'Analyse en cours...' : 'Analyser'}
              </Button>
            </Box>
          </Grid>
        </Grid>

        {/* Résultats */}
        <Box sx={{ mt: 4 }}>
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
      </Paper>
    </Container>
  );
};

export default AIAnalysis;`;

// Écrire le contenu dans le fichier
fs.writeFileSync(filePath, content, 'utf8');

console.log('Le fichier AIAnalysis.js a été recréé avec succès.');

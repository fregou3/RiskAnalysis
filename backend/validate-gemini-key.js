const { GoogleGenerativeAI } = require('@google/generative-ai');

// Fonction pour valider la clé API Gemini
async function validateGeminiApiKey() {
  try {
    console.log('Démarrage de la validation de la clé API Gemini');
    
    // Clé API Gemini à tester
    const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyCZ9_mHqIwSW8cDugq0HiLkf8CO-p0VdfU';
    console.log('Utilisation de la clé API:', apiKey.substring(0, 10) + '...');
    
    // Initialiser l'API Gemini avec une configuration minimale
    console.log('Initialisation de l\'API Gemini');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Obtenir la liste des modèles disponibles
    console.log('Tentative de récupération des modèles disponibles');
    
    // Utiliser un modèle de base avec une requête simple
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 100,
      }
    });
    
    // Créer un prompt très simple
    const prompt = "Hello, world!";
    console.log('Envoi d\'un prompt simple:', prompt);
    
    // Générer du contenu
    console.log('Tentative de génération de contenu');
    const result = await model.generateContent(prompt);
    
    // Traiter la réponse
    console.log('Traitement de la réponse');
    const response = await result.response;
    const text = response.text();
    
    console.log('Réponse reçue avec succès, longueur:', text.length);
    console.log('Contenu de la réponse (premiers 100 caractères):');
    console.log(text.substring(0, 100) + (text.length > 100 ? '...' : ''));
    
    console.log('La clé API Gemini est valide et fonctionne correctement');
    return true;
  } catch (error) {
    console.error('Erreur lors de la validation de la clé API Gemini:');
    console.error('Message d\'erreur:', error.message);
    
    if (error.response) {
      console.error('Données de réponse d\'erreur:', error.response.data);
      console.error('Statut de réponse d\'erreur:', error.response.status);
    }
    
    console.error('Détails complets de l\'erreur:', error);
    
    console.error('La clé API Gemini n\'est pas valide ou n\'a pas les autorisations nécessaires');
    return false;
  }
}

// Exécuter la validation
validateGeminiApiKey()
  .then(isValid => {
    console.log('Résultat de la validation:', isValid ? 'Valide' : 'Non valide');
    process.exit(isValid ? 0 : 1);
  })
  .catch(error => {
    console.error('Erreur inattendue:', error);
    process.exit(1);
  });

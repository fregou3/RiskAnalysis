const { GoogleGenerativeAI } = require('@google/generative-ai');

// Fonction pour tester l'API Gemini
async function testGeminiAPI() {
  try {
    console.log('Démarrage du test de l\'API Gemini');
    
    // Clé API Gemini
    const apiKey = 'AIzaSyCZ9_mHqIwSW8cDugq0HiLkf8CO-p0VdfU';
    console.log('Utilisation de la clé API:', apiKey.substring(0, 5) + '...');
    
    // Initialiser l'API Gemini
    console.log('Initialisation de l\'API Gemini');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Obtenir le modèle
    console.log('Obtention du modèle gemini-pro');
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    // Créer un prompt simple
    const prompt = 'Bonjour, peux-tu me donner une courte analyse de l\'entreprise Apple?';
    console.log('Prompt:', prompt);
    
    // Générer du contenu
    console.log('Envoi de la requête à l\'API Gemini');
    const result = await model.generateContent(prompt);
    
    // Traiter la réponse
    console.log('Traitement de la réponse');
    const response = await result.response;
    const text = response.text();
    
    console.log('Réponse reçue avec succès, longueur:', text.length);
    console.log('Contenu de la réponse:');
    console.log(text);
    
    console.log('Test terminé avec succès');
  } catch (error) {
    console.error('Erreur lors du test de l\'API Gemini:');
    console.error('Message d\'erreur:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Afficher plus de détails sur l'erreur
    if (error.response) {
      console.error('Données de réponse d\'erreur:', error.response.data);
      console.error('Statut de réponse d\'erreur:', error.response.status);
      console.error('En-têtes de réponse d\'erreur:', error.response.headers);
    } else if (error.request) {
      console.error('Requête d\'erreur:', error.request);
    } else {
      console.error('Détails de l\'erreur:', error);
    }
  }
}

// Exécuter le test
testGeminiAPI();

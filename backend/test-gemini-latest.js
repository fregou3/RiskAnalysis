// Au tout début de votre application, chargez les variables d'environnement
require('dotenv').config();

const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");

// Récupérez la clé API depuis les variables d'environnement
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Erreur : La variable d'environnement GEMINI_API_KEY n'est pas définie.");
  process.exit(1); // Quitte le processus si la clé n'est pas trouvée
}

// Initialisez le client GoogleGenerativeAI avec votre clé API
const genAI = new GoogleGenerativeAI(apiKey);

async function runGeminiTest() {
  try {
    // Utiliser un modèle plus récent
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.8,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    const prompt = "Analyse de l'entreprise Apple. Fournis une analyse détaillée incluant les risques potentiels. Réponds en français.";

    console.log(`Envoi du prompt : "${prompt}"`);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("\nRéponse de Gemini :");
    console.log(text);

  } catch (error) {
    console.error("Erreur lors de l'appel à l'API Gemini :", error);
    if (error.message && error.message.includes("API key not valid")) {
        console.error("Veuillez vérifier que votre GEMINI_API_KEY est correcte et valide.");
    }
    // Afficher plus de détails sur l'erreur
    console.error("Détails de l'erreur :", JSON.stringify(error, null, 2));
  }
}

// Exécutez la fonction de test
runGeminiTest();

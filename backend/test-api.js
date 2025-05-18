// Script de test pour vérifier les API d'IA
require('dotenv').config();
const OpenAI = require('openai');
const { Anthropic } = require('@anthropic-ai/sdk');
const axios = require('axios');

// Initialiser les clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Fonction de test pour OpenAI
async function testOpenAI() {
  try {
    console.log('Testing OpenAI API...');
    console.log('API Key:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 5)}...` : 'Not set');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Utilisation de gpt-3.5-turbo qui est plus largement disponible
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello world" }
      ],
      temperature: 0.2,
    });
    
    console.log('OpenAI API response:', completion.choices[0].message.content);
    console.log('OpenAI test successful!');
    return true;
  } catch (error) {
    console.error('OpenAI API error:', error.message);
    if (error.response) {
      console.error('OpenAI API error details:', error.response.data);
    }
    return false;
  }
}

// Fonction de test pour Anthropic
async function testAnthropic() {
  try {
    console.log('Testing Anthropic API...');
    console.log('API Key:', process.env.ANTHROPIC_API_KEY ? `${process.env.ANTHROPIC_API_KEY.substring(0, 5)}...` : 'Not set');
    
    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      system: "You are a helpful assistant.",
      messages: [
        { role: "user", content: "Hello world" }
      ],
      max_tokens: 100,
      temperature: 0.2,
    });
    
    console.log('Anthropic API response:', message.content[0].text);
    console.log('Anthropic test successful!');
    return true;
  } catch (error) {
    console.error('Anthropic API error:', error.message);
    if (error.response) {
      console.error('Anthropic API error details:', error.response.data);
    }
    return false;
  }
}

// Fonction de test pour DeepSeek
async function testDeepseek() {
  try {
    console.log('Testing DeepSeek API...');
    console.log('API Key:', process.env.DEEPSEEK_API_KEY ? `${process.env.DEEPSEEK_API_KEY.substring(0, 5)}...` : 'Not set');
    
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Hello world" }
        ],
        temperature: 0.2,
        max_tokens: 100
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('DeepSeek API response:', response.data.choices[0].message.content);
    console.log('DeepSeek test successful!');
    return true;
  } catch (error) {
    console.error('DeepSeek API error:', error.message);
    if (error.response) {
      console.error('DeepSeek API error details:', error.response.data);
    }
    return false;
  }
}

// Exécuter les tests
async function runTests() {
  console.log('Starting API tests...');
  
  const openaiResult = await testOpenAI();
  console.log('-'.repeat(50));
  
  const anthropicResult = await testAnthropic();
  console.log('-'.repeat(50));
  
  const deepseekResult = await testDeepseek();
  console.log('-'.repeat(50));
  
  console.log('Test results:');
  console.log('OpenAI:', openaiResult ? 'SUCCESS' : 'FAILED');
  console.log('Anthropic:', anthropicResult ? 'SUCCESS' : 'FAILED');
  console.log('DeepSeek:', deepseekResult ? 'SUCCESS' : 'FAILED');
}

runTests();

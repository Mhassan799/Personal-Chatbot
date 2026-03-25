const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        // Purana method ListModels check karne ke liye
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();
        
        console.log("--- Available Models for your API Key ---");
        data.models.forEach(m => {
            if (m.supportedGenerationMethods.includes("embedContent")) {
                console.log(`✅ Embedding Model: ${m.name}`);
            }
        });
    } catch (error) {
        console.error("Error fetching models:", error);
    }
}

listModels();
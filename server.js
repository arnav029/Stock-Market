// server.js
const express = require('express');
const dotenv = require('dotenv');
const path = require('path'); // Import the path module

dotenv.config(); // This loads the variables from your .env file

const app = express();
app.use(express.json());

// This tells the server that your index.html is in the same folder as server.js
app.use(express.static(path.join(__dirname)));

// --- Deployment FIX: Use the port provided by Railway, or 3000 for local testing ---
const PORT = process.env.PORT || 3000;

// This is the endpoint your HTML file will call
app.post('/api/get-quiz-questions', async (req, res) => {
    // Use dynamic import() for node-fetch
    const fetch = (await import('node-fetch')).default;

    const { difficulty } = req.body;
    const apiKey = process.env.GEMINI_API_KEY; // Securely read the key from the environment

    if (!apiKey) {
        return res.status(500).json({ error: "API key not configured on the server." });
    }

    const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const prompt = `Generate exactly 10 multiple-choice quiz questions for a quiz about the stock market. The difficulty level must be '${difficulty}'. Topics should be appropriate for this level. Each question must have 4 options, one correct answer, and a brief, simple explanation for the answer.`;
    
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        question: { type: "STRING" },
                        options: { type: "ARRAY", items: { type: "STRING" } },
                        answer: { type: "STRING" },
                        explanation: { type: "STRING" }
                    },
                    required: ["question", "options", "answer", "explanation"]
                }
            }
        }
    };

    try {
        const apiResponse = await fetch(googleApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            throw new Error(`Google API error: ${apiResponse.status} - ${errorBody}`);
        }

        const data = await apiResponse.json();
        // Send the data from Google back to the browser
        res.json(data); 
        
    } catch (error) {
        console.error("Error fetching from Google API:", error);
        res.status(500).json({ error: "Failed to fetch quiz questions." });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


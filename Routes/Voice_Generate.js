const express = require('express')
const router = express.Router();
const { Groq } = require('groq-sdk');
const dotenv = require('dotenv');
const { ElevenLabsClient } = require('elevenlabs')
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY }); 
const client = new ElevenLabsClient({ apiKey: process.env.IIEVLEVENLABS_API_KEY });

// Import AINewsDetect directly - this ensures we have access to the latest analysis data
const AINewsDetect = require('./AINewsDetect');
let lastGeneratedSpeech = null;
let lastGeneratedAudio = null;

async function streamAudio(text) {
    try {
        const audioStream = await client.textToSpeech.convertAsStream('JBFqnCBsd6RMkjVDRZzb', {
            text: `${text}`,
            model_id: 'eleven_multilingual_v2'
        });

        const chunks = []
        for await (const chunk of audioStream) {
            chunks.push(Buffer.from(chunk))
        }
        return Buffer.concat(chunks)
    }
    catch (error) {
        console.log("Something Went Caused in streamAudio Function !", error)
        return null
    }
}

async function getMySpeech(analysisData) {
    const prompt = `You are an expert fact-checker and news analyst creating voice content for our AI Fake News Detection app. 

Transform the following news analysis data into a natural, engaging response in HINDI (not Hinglish). The response should help users understand our credibility assessment of the news.

Analysis Data: 
${JSON.stringify(analysisData)}

Your response should:
1. Start with a friendly greeting like "नमस्ते दोस्तों" or "सुनिए"
2. Clearly mention the news headline and state the authenticity score in simple terms
3. Highlight the key red flags or suspicious elements found in the news
4. Mention any elements of the news that appear to be factual
5. Provide a clear final verdict (REAL/FAKE/UNCERTAIN/MISLEADING)
6. End with practical advice for the user to verify such news

Make sure your response is in natural, conversational Hindi as if a real person is explaining the news. Use everyday Hindi expressions and avoid sounding robotic or overly formal. The goal is to make users feel like they're getting valuable information from a knowledgeable friend.`;

    try {
        const completions = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
            max_tokens: 4096,
        })
        return completions.choices[0].message.content
    }
    catch (error) {
        console.log("Something Went Caused in Voice Route Check Out !", error)
        return null
    }
}

router.post('/', async (req, res) => {
    // Set CORS headers immediately
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    console.log("Voice route called with authorization:", req.headers.authorization ? "Present" : "Missing");
    
    try {
        // Check if we have cached audio
        if (lastGeneratedAudio) {
            console.log("Returning cached audio");
            
            // Set proper headers and send cached audio
            res.set({
                'Content-Type': 'audio/mpeg',
                'Content-Length': lastGeneratedAudio.length
            });
            
            return res.send(lastGeneratedAudio);
        }
        
        // Get analysis data directly from AINewsDetect module
        let analysisData;
        
        if (AINewsDetect && typeof AINewsDetect.getLatestAnalysisData === 'function') {
            console.log("Getting analysis data directly from memory");
            analysisData = AINewsDetect.getLatestAnalysisData();
            console.log("Analysis data found:", !!analysisData);
        }
        
        // If no analysis data, return error
        if (!analysisData) {
            console.log("No analysis data available - returning error");
            return res.status(400).json({
                message: "No analysis data available. Please analyze a news article first.",
                status: 400
            });
        }

        // Generate speech - use cached if available
        let speechForTheAudio;
        if (lastGeneratedSpeech) {
            console.log("Using cached speech");
            speechForTheAudio = lastGeneratedSpeech;
        } else {
            console.log("Generating new speech");
            speechForTheAudio = await getMySpeech(analysisData);
            lastGeneratedSpeech = speechForTheAudio;
        }

        if (!speechForTheAudio) {
            return res.status(500).json({
                message: "Speech generation failed",
                advice: "Contact Backend Developer",
                status: 500
            });
        }

        // Convert speech to audio
        console.log("Converting speech to audio");
        const audioBuffer = await streamAudio(speechForTheAudio);
        
        if (!audioBuffer) {
            return res.status(500).json({
                message: "Audio generation failed",
                advice: "Check ElevenLabs API key",
                status: 500
            });
        }
        
        // Cache the audio for future requests
        lastGeneratedAudio = audioBuffer;
        
        // Set proper headers and send audio
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length
        });
        
        return res.send(audioBuffer);
    } catch (error) {
        console.error("Error in voice generation route:", error);
        return res.status(500).json({
            message: "Server error in voice generation",
            error: error.message,
            status: 500
        });
    }
});

// Add a GET handler for direct audio tag access
router.get('/', async (req, res) => {
    // Set CORS headers immediately
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    console.log("Voice GET route called");
    
    try {
        // Check if we have cached audio
        if (lastGeneratedAudio) {
            console.log("Returning cached audio for GET request");
            
            // Set proper headers and send cached audio
            res.set({
                'Content-Type': 'audio/mpeg',
                'Content-Length': lastGeneratedAudio.length
            });
            
            return res.send(lastGeneratedAudio);
        }
        
        // Get analysis data directly from AINewsDetect module
        let analysisData;
        
        if (AINewsDetect && typeof AINewsDetect.getLatestAnalysisData === 'function') {
            console.log("Getting analysis data directly from memory");
            analysisData = AINewsDetect.getLatestAnalysisData();
            console.log("Analysis data found:", !!analysisData);
        }
        
        // If no analysis data, return error
        if (!analysisData) {
            console.log("No analysis data available for GET request - returning error");
            return res.status(400).json({
                message: "No analysis data available. Please analyze a news article first.",
                status: 400
            });
        }

        // Generate speech - use cached if available
        let speechForTheAudio;
        if (lastGeneratedSpeech) {
            console.log("Using cached speech for GET request");
            speechForTheAudio = lastGeneratedSpeech;
        } else {
            console.log("Generating new speech for GET request");
            speechForTheAudio = await getMySpeech(analysisData);
            lastGeneratedSpeech = speechForTheAudio;
        }

        if (!speechForTheAudio) {
            return res.status(500).json({
                message: "Speech generation failed",
                advice: "Contact Backend Developer",
                status: 500
            });
        }

        // Convert speech to audio
        console.log("Converting speech to audio for GET request");
        const audioBuffer = await streamAudio(speechForTheAudio);
        
        if (!audioBuffer) {
            return res.status(500).json({
                message: "Audio generation failed",
                advice: "Check ElevenLabs API key",
                status: 500
            });
        }
        
        // Cache the audio for future requests
        lastGeneratedAudio = audioBuffer;
        
        // Set proper headers and send audio
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length
        });
        
        return res.send(audioBuffer);
    } catch (error) {
        console.error("Error in GET voice generation route:", error);
        return res.status(500).json({
            message: "Server error in voice generation",
            error: error.message,
            status: 500
        });
    }
});

// OPTIONS handler for CORS preflight requests
router.options('/', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.sendStatus(200);
});

module.exports = router
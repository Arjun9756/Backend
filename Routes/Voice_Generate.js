const express = require('express')
const router = express.Router();
const { Groq } = require('groq-sdk');
const dotenv = require('dotenv');
const { ElevenLabsClient } = require('elevenlabs')
const fetch = require('node-fetch')
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY }); 
const client = new ElevenLabsClient({ apiKey: process.env.IIEVLEVENLABS_API_KEY });

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
    if (!req.body) {
        return res.status(400).json({
            message: "Data not provided",
            status: 400
        });
    }

    try {
        // Fetch the analysis data
        let response = await fetch(`${process.env.API_URL}/ai-news-detect/voice`, {
            method: "POST"
        });
        
        let analysisResponse = await response.json();
        
        if (!analysisResponse.status || !analysisResponse.data) {
            return res.status(400).json({
                message: "Failed to get analysis data",
                status: 400
            });
        }

        // Generate speech from the analysis data
        let speechForTheAudio = await getMySpeech(analysisResponse.data);

        if (!speechForTheAudio) {
            return res.status(400).json({
                message: "Speech generation failed",
                advice: "Contact Backend Developer",
                status: 400
            });
        }

        console.log("Generated speech text:", speechForTheAudio);
        
        // Convert speech to audio
        const audioBuffer = await streamAudio(speechForTheAudio);
        
        if (!audioBuffer) {
            return res.status(400).json({
                message: "Audio generation failed",
                advice: "Check ElevenLabs API key",
                status: 400
            });
        }
        
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

module.exports = router
const express = require('express')
const router = express.Router();
const { Groq } = require('groq-sdk');
const dotenv = require('dotenv');
const { ElevenLabsClient } = require('elevenlabs')
const AINewsDetect = require('./AINewsDetect');
dotenv.config();

// Initialize API clients with longer timeouts
const groq = new Groq({ 
    apiKey: process.env.GROQ_API_KEY,
    timeout: 120000 // 2 minute timeout for Groq
}); 

const client = new ElevenLabsClient({ 
    apiKey: process.env.IIEVLEVENLABS_API_KEY
});

async function streamAudio(text) {
    try {
        // Add more logging
        console.log("Starting audio generation with ElevenLabs");
        console.log("Text length:", text.length);
        
        const audioStream = await client.textToSpeech.convertAsStream('JBFqnCBsd6RMkjVDRZzb', {
            text: `${text}`,
            model_id: 'eleven_multilingual_v2',
            // Smaller chunk of text if needed
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75
            }
        });

        const chunks = []
        for await (const chunk of audioStream) {
            chunks.push(Buffer.from(chunk))
        }
        console.log("Audio generation completed successfully");
        return Buffer.concat(chunks)
    }
    catch (error) {
        console.error("Error in streamAudio Function:", error);
        return null
    }
}

async function getMySpeech(analysisData) {
    try {
        console.log("Starting speech generation with Groq");
        
        // Simplify the prompt to reduce generation time
        const prompt = `Create a brief Hindi explanation (100-150 words) of this news analysis:
        
Analysis: ${JSON.stringify(analysisData)}

Your response should:
1. Start with "नमस्ते"
2. Mention if the news is real/fake and the authenticity score
3. Briefly mention 1-2 key factors that led to this conclusion
4. End with advice on verifying such news

Keep it simple, natural and conversational in pure Hindi.`;

        const completions = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
            max_tokens: 1024, // Reduce tokens for faster response
        });
        
        console.log("Speech generation completed successfully");
        return completions.choices[0].message.content;
    }
    catch (error) {
        console.error("Error in getMySpeech:", error);
        return "नमस्ते, हमें खेद है कि इस समय हिंदी में विश्लेषण उपलब्ध नहीं है। कृपया बाद में पुनः प्रयास करें।";
    }
}

router.post('/', async (req, res) => {
    // Set a longer timeout for this request (30 seconds)
    req.setTimeout(30000);
    res.setTimeout(30000);
    
    console.log("Voice generation request received");
    
    try {
        // Get analysis data directly from AINewsDetect
        console.log("Retrieving analysis data");
        const analysisData = AINewsDetect.getLatestAnalysisData();
        
        if (!analysisData) {
            console.log("No analysis data available, generating fallback data");
            // Create fallback analysis data
            const fallbackData = {
                "authenticity_score": 50,
                "final_verdict": "UNCERTAIN",
                "summary": "Unable to retrieve analysis data"
            };
            
            // Generate speech from the fallback data
            let speechForTheAudio = await getMySpeech(fallbackData);
            
            if (!speechForTheAudio) {
                return res.status(400).json({
                    message: "Speech generation failed",
                    status: 400
                });
            }
            
            // Convert speech to audio
            const audioBuffer = await streamAudio(speechForTheAudio);
            
            if (!audioBuffer) {
                return res.status(400).json({
                    message: "Audio generation failed",
                    status: 400
                });
            }
            
            // Set proper headers and send audio
            res.set({
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.length
            });
            
            return res.send(audioBuffer);
        }
        
        // Generate speech from the analysis data
        console.log("Generating speech from analysis data");
        let speechForTheAudio = await getMySpeech(analysisData);
        
        if (!speechForTheAudio) {
            return res.status(400).json({
                message: "Speech generation failed",
                status: 400
            });
        }
        
        // Convert speech to audio
        console.log("Converting speech to audio");
        const audioBuffer = await streamAudio(speechForTheAudio);
        
        if (!audioBuffer) {
            return res.status(400).json({
                message: "Audio generation failed",
                status: 400
            });
        }
        
        // Set proper headers and send audio
        console.log("Sending audio response");
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
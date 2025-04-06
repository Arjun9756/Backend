const express = require('express')
const router = express.Router()
const { Groq } = require('groq-sdk')
const dotenv = require('dotenv')
dotenv.config()
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

let dataforvoiceroute

function extractAndParseJson(text) {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error("No JSON found in the given text.");
    }

    const jsonString = text.slice(jsonStart, jsonEnd + 1);

    try {
        return JSON.parse(jsonString);
    } catch (error) {
        throw new Error("Invalid JSON format: " + error.message);
    }
}

async function detectNews(newsText, newsLink) {
    const prompt = `You are a search query optimizer. Based on the following news content, generate ONLY a short, factual search query (5-8 words) that captures the main claim or topic. Do not include any URLs, analysis, or additional text. The query will be used for Google search to verify this news:

    News Content: "${newsText}"
    Please Proide the better title for the news
    Respond with ONLY the search query, nothing else.`;

    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
            max_tokens: 4096,
        })
        return completion.choices[0].message.content
    } catch (error) {
        console.error("Error in detecting news:", error)
        return null
    }
}

async function detectNewsFromGoogle(newsText , newsLink , googleSearchResult) {
    const prompt = `You are a professional fact-checker and news authenticity expert. Analyze the provided news content and compare it with the latest Google search results to determine if it's REAL or FAKE news.

    News Content: "${newsText}"
    News URL: "${newsLink}"

    Google Search Results (Latest Data):
    ${googleSearchResult}

    Analyze both the news content and Google search results to provide a detailed fact-check. Focus on:
    1. Factual consistency between the news and search results
    2. Presence of the news on reputable sources
    3. Timeline consistency (when was the news first reported vs. claimed date)
    4. Language patterns that may indicate misinformation
    5. Suspicious claims not supported by search results
    Provide your analysis in EXACTLY the following JSON format without any additional text:
    {
        "authenticity_score": [0-100 number: use 0-30 for clearly fake, 40-60 for uncertain/unverified, 70-100 for verified real news],
        "red_flags": [array of specific suspicious elements found, keep empty if none],
        "credibility_indicators": [array of elements supporting authenticity, keep empty if none],
        "url_credibility": {
        "is_suspicious": [true/false],
        "domain_analysis": [brief domain credibility assessment]
    },
    "confidence_level": [0-100 number indicating your confidence in this assessment],
    "final_verdict": [either "FAKE" or "REAL" in uppercase],
    "summary": [brief summary of your analysis],
    "detailed_reasoning": [more detailed explanation of your decision with evidence from the search results],
    "verification_recommendations": [array of 2-3 specific actions to further verify this news]
    }
    Focus on providing strong evidence-based reasoning. If the news is FAKE, clearly explain which specific details contradict reliable sources. If the news is REAL, explain which trusted sources confirm it.`

    try{
        const completion = await groq.chat.completions.create({
            messages:[{role:"user",content:prompt}],
            model:"llama-3.3-70b-versatile",
            temperature:0.3,
            max_tokens:2048
        })
        return completion.choices[0].message.content
    }
    catch(error){
        console.error("Error in detecting news from google:",error)
        return null
    }
}

router.post('/', async (req, res) => {
    let newsText = req.body.newsText
    let newsLink = req.body.newsLink

    let result = await detectNews(newsText, newsLink)
    if (!result) {
        return res.status(500).json({
            message: "Error in detecting news",
            status: false,
            advice: "Please Contact Backend Developer Its an Server Error",
            AI_RESPONSE: "Failed to Detect News AI Error"
        })
    }
    console.log(result)
    return res.status(200).json({
        status: true,
        data: result
    })
})

router.post('/v2', async (req, res) => {
    try {
        let newsText = req.body.newsText
        let newsLink = req.body.newsLink || ""
        let googleSearchResult = req.body.googleSearchResult
        
        // Check if inputs are present
        if (!newsText) {
            return res.status(400).json({
                message: "News text is required",
                status: false
            })
        }
        
        // Format the Google search results in a structured way
        let formattedSearchResults = ""
        
        if (Array.isArray(googleSearchResult.data)) {
            formattedSearchResults = googleSearchResult.data.map((snippet, index) => {
                return `Result ${index + 1}: ${snippet}`
            }).join("\n\n")
            
            // Add metadata about the search
            formattedSearchResults += `\n\nTotal Results Found: ${googleSearchResult.totalResults || "Unknown"}`
            formattedSearchResults += `\nSearch Time: ${googleSearchResult.searchTime || "Unknown"} seconds`
        } else {
            formattedSearchResults = "No search results available or results in unexpected format."
        }
        
        console.log("Formatted search results:", formattedSearchResults.substring(0, 200) + "...")
        
        // Now pass the formatted search results to the AI
        let result = await detectNewsFromGoogle(newsText, newsLink, formattedSearchResults)
        dataforvoiceroute = result
        
        if (!result) {
            return res.status(500).json({
                message: "Error in detecting news",
                status: false,
                advice: "Please Contact Backend Developer Its an Server Error",
                AI_RESPONSE: "Failed to Detect News AI Error",
                version: "v2"
            })
        }
        
        // Try to parse the result as JSON
        try {
            const jsonResult = extractAndParseJson(result)
            return res.status(200).json({
                status: true,
                data: jsonResult 
            })
        } catch (e) {
            console.error("Failed to parse result as JSON:", e)
            return res.status(200).json({
                status: true,
                data: result
            })
        }
    } catch (error) {
        console.error("Error in v2 endpoint:", error)
        return res.status(500).json({
            message: "Server error",
            status: false,
            error: error.message
        })
    }
})

router.post('/voice',(req,res)=>{
    return res.status(200).json({
        data:dataforvoiceroute,
        status:200
    })
})

module.exports = router
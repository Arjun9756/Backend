const express = require('express')
const router = express.Router()
const tokenVerify = require('../MiddleWares/TokenVerify')
const fetch = require('node-fetch')
const AINewsDetectHandler = require('./AINewsDetect')
const SearchAPIHandler = require('./SearchAPI')

function extractNewsLink(text) {
    if (!text) return [];
    
    const urlRegex = /(https?:\/\/(?:www\.)?([-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)))/gi;
    
    let links = text.match(urlRegex) || [];
    
    links = links.map(link => {
        return link.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]+$/, '');
    }).filter(link => {
        return link && link.length > 0;
    });
    
    return [...new Set(links)];
}

router.get('/' , (req , res)=>{
    res.status(200).json({
        message:"This is GET Request Make Post Request",
        status:true
    })
})

// Direct API call handler - for serverless compatibility
async function handleAINewsDetect(req, data) {
    try {
        // Create a mock request object with the necessary data
        const mockReq = {
            body: {
                newsText: data.newsText,
                newsLink: data.newsLink
            },
            user: req.user,
            headers: req.headers
        }
        
        // Create a mock response object to capture the response
        const mockRes = {
            status: function(code) {
                this.statusCode = code
                return this
            },
            json: function(data) {
                this.data = data
                return this
            }
        }
        
        // Call the AI News Detect handler directly
        await AINewsDetectHandler.route.post(mockReq, mockRes)
        
        // Return the response data
        return mockRes.data
    } catch (error) {
        console.error("Error in handleAINewsDetect:", error)
        throw error
    }
}

// Direct search API handler - for serverless compatibility
async function handleSearch(req, query) {
    try {
        // Create a mock request object with the necessary data
        const mockReq = {
            body: {
                query: query
            },
            user: req.user,
            headers: {
                ...req.headers,
                version: "v1"
            }
        }
        
        // Create a mock response object to capture the response
        const mockRes = {
            status: function(code) {
                this.statusCode = code
                return this
            },
            json: function(data) {
                this.data = data
                return this
            }
        }
        
        // Call the Search API handler directly
        await SearchAPIHandler.route.post(mockReq, mockRes)
        
        // Return the response data
        return mockRes.data
    } catch (error) {
        console.error("Error in handleSearch:", error)
        throw error
    }
}

// Direct AI News Detect V2 handler - for serverless compatibility
async function handleAINewsDetectV2(req, data) {
    try {
        // Create a mock request object with the necessary data
        const mockReq = {
            body: {
                newsText: data.newsText,
                newsLink: data.newsLink,
                googleSearchResult: data.googleSearchResult
            },
            user: req.user,
            headers: {
                ...req.headers,
                version: "v2"
            }
        }
        
        // Create a mock response object to capture the response
        const mockRes = {
            status: function(code) {
                this.statusCode = code
                return this
            },
            json: function(data) {
                this.data = data
                return this
            }
        }
        
        // Call the AI News Detect V2 handler directly
        await AINewsDetectHandler.route.post(mockReq, mockRes)
        
        // Return the response data
        return mockRes.data
    } catch (error) {
        console.error("Error in handleAINewsDetectV2:", error)
        throw error
    }
}

router.post('/' , tokenVerify  , async (req,res)=>{
    try {
        let text = req.body.text
        if(!text){
            return res.status(400).json({
                message:"News Text is Required",
                status:false
            })
        }

        let newsLinks = extractNewsLink(text)
        let textwithoutLink = text
        
        newsLinks.forEach(link => {
            textwithoutLink = textwithoutLink.replace(link, '').trim()
        })

        // OPTION 1: Direct API call for serverless compatibility
        let result
        try {
            result = await handleAINewsDetect(req, {
                newsText: textwithoutLink,
                newsLink: newsLinks
            })
        } catch (error) {
            console.error("Error in first AI call:", error)
            // FALLBACK OPTION: Try HTTP fetch if direct call fails
            try {
                const response = await fetch(`${process.env.API_URL}/ai-news-detect`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${req.user.token}`
                    },
                    body: JSON.stringify({
                        newsText: textwithoutLink,
                        newsLink: newsLinks
                    })
                })
                result = await response.json()
            } catch (fetchError) {
                console.error("Both direct call and fetch failed:", fetchError)
                return res.status(500).json({
                    message: "Error in detecting news",
                    status: false,
                    advice: "Please contact Backend Developer - API call failed",
                    error: error.message
                })
            }
        }

        console.log("AI Title Result:", result)
        
        if(!result || !result.status){
            return res.status(500).json({
                message:"Error in detecting news",
                status:false,
                advice:"Please Contact Backend Developer Its an Server Error",
                AI_RESPONSE:"Failed to Detect News AI Error",
                Route:"/ai-news-detect"
            })
        }

        // Clean up the query by removing quotes
        const cleanQuery = result.data.replace(/["']/g, '').trim()
        console.log("Clean search query:", cleanQuery)
        
        // Google search with clean query
        let googleSearchResult
        try {
            googleSearchResult = await handleSearch(req, cleanQuery)
        } catch (error) {
            console.error("Error in search call:", error)
            // FALLBACK OPTION: Try HTTP fetch if direct call fails
            try {
                const googleSearchQuery = await fetch(`${process.env.API_URL}/search`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${req.user.token}`,
                        version: "v1"
                    },
                    body: JSON.stringify({
                        query: cleanQuery
                    })
                })
                googleSearchResult = await googleSearchQuery.json()
            } catch (fetchError) {
                console.error("Both direct call and fetch failed for search:", fetchError)
                return res.status(500).json({
                    message: "Error in searching news",
                    status: false,
                    advice: "Please contact Backend Developer - Search API call failed",
                    error: error.message
                })
            }
        }

        console.log("Google search result:", googleSearchResult)
        
        if(!googleSearchResult){
            return res.status(500).json({
                message:"Error in searching news",
                status:false,
                advice:"Please Contact Backend Developer Its an Server Error",
                AI_RESPONSE:"Failed to Search News AI Error",
                Route:"/search"
            })
        }

        // Final AI analysis with Google results
        let mixtralResult
        try {
            mixtralResult = await handleAINewsDetectV2(req, {
                newsText: textwithoutLink,
                newsLink: newsLinks,
                googleSearchResult: googleSearchResult
            })
        } catch (error) {
            console.error("Error in final AI call:", error)
            // FALLBACK OPTION: Try HTTP fetch if direct call fails
            try {
                const mixtralResponse = await fetch(`${process.env.API_URL}/ai-news-detect/v2`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${req.user.token}`,
                        version: "v2"
                    },
                    body: JSON.stringify({
                        newsText: textwithoutLink,
                        newsLink: newsLinks,
                        googleSearchResult: googleSearchResult
                    })
                })
                mixtralResult = await mixtralResponse.json()
            } catch (fetchError) {
                console.error("Both direct call and fetch failed for final AI:", fetchError)
                return res.status(500).json({
                    message: "Error in final analysis",
                    status: false,
                    advice: "Please contact Backend Developer - Final AI call failed",
                    error: error.message
                })
            }
        }

        console.log("Final AI analysis:", mixtralResult)
        
        if(mixtralResult.status === true){
            return res.status(200).json({
                status:true,
                data:mixtralResult.data
            })
        }
        return res.status(500).json({
            status:false,
            message:"Error in detecting news",
            advice:"Please Contact Backend Developer Its an Server Error",
            AI_RESPONSE:"Failed to Detect News AI Error"
        })
    } catch (error) {
        console.error("Uncaught error in DataExtractor:", error)
        return res.status(500).json({
            status: false,
            message: "Server error",
            error: error.message
        })
    }
})

module.exports = router
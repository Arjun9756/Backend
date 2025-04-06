const express = require('express')
const router = express.Router()
const tokenVerify = require('../MiddleWares/TokenVerify')

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

        // First AI call to get title
        let response = await fetch(`${process.env.API_URL}/ai-news-detect`,{
            method:"POST",
            headers:{
                "Content-Type":"application/json",
                "Authorization":`Bearer ${req.user.token}`
            },
            body:JSON.stringify({
                newsText:textwithoutLink,
                newsLink:newsLinks
            })
        })

        let result = await response.json()
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
        let googleSearchQuery = await fetch(`${process.env.API_URL}/search`,{
            method:"POST",
            headers:{
                "Content-Type":"application/json",
                "Authorization":`Bearer ${req.user.token}`,
                version:"v1"
            },
            body:JSON.stringify({
                query:cleanQuery
            })
        })

        let googleSearchResult = await googleSearchQuery.json()
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
        let mixtralResponse = await fetch(`${process.env.API_URL}/ai-news-detect/v2`,{
            method:"POST",
            headers:{
                "Content-Type":"application/json",
                "Authorization":`Bearer ${req.user.token}`,
                version:"v2"
            },
            body:JSON.stringify({
                newsText:textwithoutLink,
                newsLink:newsLinks,
                googleSearchResult:googleSearchResult
            })
        })

        let mixtralResult = await mixtralResponse.json()
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
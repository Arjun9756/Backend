const express = require('express')
const router = express.Router()
const axios = require('axios')
const dotenv = require('dotenv')
dotenv.config()

const SEARCH_API_KEY = process.env.SEARCH_API_KEY
const SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID

async function searchGoogle(query , numResults = 2){
    try
    {
        const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${SEARCH_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&num=${numResults}`
        const response = await axios.get(searchUrl)

        return{
            success:true,
            result:response.data.items || [],
            totalResults:response.data.searchInformation?.totalResults || 0,
            searchTime: response.data.searchInformation?.searchTime || 0
        }
    }
    catch(error){
        return{
            success:false,
            error:error.message || "An error occurred while searching"
        }
    }
}

router.post('/' , async (req,res)=>{
    try{
        const query = req.body.query
        if(!query){
            return res.status(400).json({
                success:false,
                error:"Query is required"
            })
        }

        const searchResult = await searchGoogle(query , 2)
        let objectOfData = searchResult.result || []

        let googleSearchObjectData = []
        for(let i=0 ; i<objectOfData.length ; i++)
        {
            googleSearchObjectData.push(objectOfData[i].snippet)
        }

        if(searchResult.success){
            return res.status(200).json({
                data:googleSearchObjectData,
                totalResults:searchResult.totalResults,
                searchTime:searchResult.searchTime
            })
        }
        else{
            return res.status(500).json({
                success:false,
                error:searchResult.error
            })
        }
    }
    catch(error){
        return res.status(500).json({
            success:false,
            error:error.message || "An error occurred while processing the request"
        })
    }
})

module.exports = router
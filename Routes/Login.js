const express = require('express')
const router = express.Router()
const user = require('../Models/UserSchema')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

router.get('/' , (req,res)=>{
    res.status(200).json({
        message:"This is GET Request Make Post Request",
        status:true
    })
})

router.post('/',async(req,res)=>{
    const {email , password , confirmPassword} = req.body
    if(!email || !password || !confirmPassword){
        return res.status(400).json({
            message:"All Fields are Required",
            status:false
        })
    }

    if(password !== confirmPassword){
        return res.status(400).json({
            message:"Password and Confirm Password do not match",
            status:false
        })
    }

    let existingUser = await user.findOne({email})

    if(!existingUser){
        return res.status(400).json({
            message:"User does not exist",
            status:false
        })
    }   

    // Compare password with hashed password in DB
    const isMatch = await bcrypt.compare(password, existingUser.password)
    if(!isMatch){
        return res.status(400).json({
            message:"Invalid credentials",
            status:false
        })
    }

    let token = jwt.sign(
        {email:existingUser.email, userId:existingUser._id}, 
        process.env.JWT_SECRET, 
        {expiresIn:'24h'}
    )

    return res.status(200).json({
        message:"Login Successful",
        status:true,
        token:token,
        user:existingUser
    })
})

module.exports = router
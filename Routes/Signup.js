const express = require('express')
const router = express.Router()
const user = require('../Models/UserSchema')
const bcrypt = require('bcryptjs')

router.get('/' , (req,res)=>{
    res.status(200).json({
        message:"This is GET Request Make Post Request",
        status:true
    })
})

router.post('/' , async(req,res)=>{
    const {name , email , password} = req.body
    if(!name || !email || !password){
        return res.status(400).json({
            message:"All Fields are Required",
            status:false
        })
    }

    let existingUser = await user.findOne({email})

    if(existingUser){
        return res.status(400).json({
            message:"User Already Exists",
            status:false
        })
    }

    let hashedPassword = await bcrypt.hash(password , 10);    

    let newUser = await user.create({
        name,
        email,
        password:hashedPassword
    })

    if(!newUser){
        return res.status(400).json({
            message:"User Creation Failed",
            status:false
        })
    }

    return res.status(201).json({
        message:"User Created Successfully",
        status:true,
        user:newUser
    })
})

module.exports = router
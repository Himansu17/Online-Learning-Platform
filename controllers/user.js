import { User } from "../models/User.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sendMail from "../middlewares/sendMail.js";
import TryCatch from "../middlewares/TryCatch.js";


//register User
export const register = TryCatch(async(req,res)=>{
    const { email, name, password } = req.body;
       let user = await User.findOne({ email });
       if(user)
           return res.status(400).json({ 
           message: "Email already exists" 
        });
        const hashPassword = await bcrypt.hash(password, 10);

        user = { 
            name,
            email,
            password: hashPassword
         };

         const otp = Math.floor(Math.random() * 1000000);
         const activationToken = jwt.sign({
            user,
            otp,
         }, process.env.Activation_Secret,
        {
            expiresIn: '1hr',
        });
        const data = {
            name,
            otp,
        };
        await sendMail(
            email,
            "OnlineLearningPlatform",
            data
        )
        res.status(200).json({
            message:"otp send to your mail successfully",
            activationToken,
        })
});

//Verify User
export const verifyUser = TryCatch(async(req,res) =>{
const {otp, activationToken} = req.body

const verify = jwt.verify(activationToken,process.env.Activation_Secret)

if(!verify)
     return res.status(400).json({
    message: "Otp Is Expired",
});
if(verify.otp !== otp)
     return res.status(400).json({
    message: "Invalid Otp",
 });
 await User.create({
    name: verify.user.name,
    email: verify.user.email,
    password: verify.user.password,
 })
 res.json({
    message: "User created successfully",
 })
});

//User Login

export const loginUser = TryCatch(async(req,res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
        return res.status(400).json({ 
        message: "User not found with this email",
     });

     const isMatch = await bcrypt.compare(password, user.password);
     if (!isMatch) return res.status(400).json({
        message: "Incorrect password",
     })

     const token =jwt.sign({_id: user._id}, process.env.jwt_Sec,{
        expiresIn: '15d',
     })

     res.json({
        message: `Welcome Back ${user.name}`,
        token,
        user,
     })
});

//catch the id
export const myProfile = TryCatch(async(req,res)=>{
    const user = await User.findById(req.user._id);
    res.json({ user })
})

import { instance } from "../index.js";
import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { Payment } from "../models/Payment.js";
import { Progress } from "../models/Progress.js";
import { User } from "../models/User.js";
import crypto from 'crypto';

export const getAllCourses = TryCatch(async(req,res)=>{
    const courses = await Courses.find()
    res.json({
        courses,
    })
    
})

export const getSingleCourse = TryCatch(async(req,res)=>{
    const course = await Courses.findById(req.params.id)
    res.json({
        course,
    })
})

export const fetchLectures = TryCatch(async(req,res)=>{
   // console.log("Course ID:", req.params.id);
    const lectures = await Lecture.find({course: req.params.id})
    //console.log("Fetched lectures:", lectures);
    const user = await User.findById(req.user._id)
   // console.log("Fetched user:", user);

    if(user.role === "admin"){
        return res.json({lectures});
    }

    if(!user.subscription.includes(req.params.id))
        return res.status(400).json({
    message: "You are not subscribed to this course",
     });

     res.json({lectures})

})

export const fetchLecture = TryCatch(async(req,res)=>{
    
    const lecture = await Lecture.findById(req.params.id)
    
    const user = await User.findById(req.user._id)
   

    if(user.role === "admin"){
        return res.json({lecture});
    }

    if(!user.subscription.includes(lecture.course))
        return res.status(400).json({
    message: "You are not subscribed to this course",
     });

     res.json({lecture})

})

export const getMyCourses = TryCatch(async(req,res)=>{
    const courses = await Courses.find({_id: req.user.subscription})
    res.json({
        courses,
    });
        
})

export const checkout = TryCatch(async(req,res)=>{
    const user = await User.findById(req.user._id)

    const course = await Courses.findById(req.params.id)

    if(user.subscription.includes(course._id)){
        return res.status(400).json({
            message: "You are already subscribed to this course",
            });
    }
    const options = {
        amount: Number(course.price * 100),
        currency: "INR",
    };

    const order = await instance.orders.create(options);

    res.status(201).json({
        order,
        course,
    })

});

export const paymentVerification = TryCatch(async(req,res)=>{
    const {razorpay_order_id,razorpay_payment_id,razorpay_signature} = req.body;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
    .createHmac("sha256",process.env.Razorpay_Secret)
    .update(body)
    .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if(isAuthentic){
        await Payment.create({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        })

        const user = await User.findById(req.user._id);
        const course = await Courses.findById(req.params.id);
        user.subscription.push(course._id);

        await Progress.create({
            course: course._id,
            completedLectures: [],
            user: req.user._id,
        })

        await user.save();
        res.status(200).json({
            message: " Course Payment successfully",
        })

    }else{
        return res.status(400).json({
            message: "Invalid payment signature",
        })
    }

})

export const addProgress = TryCatch(async(req,res)=>{
    const progress =  await Progress.findOne({
        user: req.user._id,
        course: req.query.course,
    });

    const {lectureId} = req.query
    if(progress.completedLectures.includes(lectureId)){
        res.json({
            message: "Progress recorded",
        })
    }
    progress.completedLectures.push(lectureId);

    await progress.save()
    res.status(201).json({
        message: "New Progress recorded",
    })
})

export const getYourProgress = TryCatch(async(req,res)=>{
    const progress =  await Progress.find({
        user: req.user._id,
        course: req.query.course,
    });
    if(!progress) return res.status(404).json({
        message: "null"
    });
    const allLectures = (await Lecture.find({course: req.query.course})).length;

    const completedLectures = progress[0].completedLectures.length;

    const courseProgressPercentage = (completedLectures *100) / allLectures;
    res.json({
        courseProgressPercentage,
        completedLectures,
        allLectures,
        progress,
    })
})
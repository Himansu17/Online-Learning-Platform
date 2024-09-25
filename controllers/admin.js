import { Courses } from '../models/Courses.js';
import TryCatch from '../middlewares/TryCatch.js';
import { Lecture } from '../models/Lecture.js';
import { rm } from "fs";
import { promisify } from 'util';
import fs from 'fs';
import { User } from '../models/User.js';

//course create
export const createCourse = async (req, res) => {
    try {
        const { title, description, price, duration, category, createdBy } = req.body;

        // Check if any field is missing
        if (!title || !description || !price || !duration || !category || !createdBy) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Handle file upload (file will be available in req.file)
        const filePath = req.file ? req.file.path : null;

        // Create a new course with the form data and the file path
        const newCourse = new Courses({
            title,
            description,
            price,
            duration,
            category,
            createdBy,
            image: filePath // Save the uploaded file's path
        });

        // Save the course to the database
        await newCourse.save();

        res.status(201).json({ message: "Course created successfully", course: newCourse });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error creating course", error: error.message });
    }
};

//lecture create
export const addLectures = TryCatch(async(req,res) => {
    const course = await Courses.findById(req.params.id);
    if(!course) 
        return res.status(404).json({ 
         message: "Course not found",
        });
        const {title,description} =req.body
        const file = req.file
        const lecture = await Lecture.create({
            title,
            description,
            video: file?.path,
            course: course._id,
        })
        res.status(201).json({
            message:"Lecture created successfully",
            lecture,
        })
})

//delete lecture
export const deleteLecture = TryCatch(async(req,res) => {
    const lecture = await Lecture.findById(req.params.id);
    rm(lecture.video,()=>{
        console.log("Deleted Video")
    });
    await lecture.deleteOne()
    res.json({message:"Lecture deleted successfully"})
})

//delete course
const unlinkAsync = promisify(fs.unlink);

export const deleteCourse = TryCatch(async(req,res)=>{
    const course = await Courses.findById(req.params.id);
    const lectures = await Lecture.find({course: course._id})

    await Promise.all(
        lectures.map(async(lecture) => {
            await unlinkAsync(lecture.video);
            console.log("video deleted")
        })
        
    )
    rm(course.image,()=>{
        console.log("Image deleted")
    });
    await Lecture.find({ course: req.params.id}).deleteMany();
    await course.deleteOne()
    await User.updateMany({},{ $pull: { subscription: req.params.id } });
    res.json({
        message:"Course deleted successfully"
    })
})

export const getAllStats = TryCatch(async(req,res)=>{
    const totalCourses = (await Courses.find()).length;
    const totalLectures = (await Lecture.find()).length;
    const totalUsers = (await User.find()).length;

    const stats = {
        totalCourses,
        totalLectures,
        totalUsers,
    };
    res.json({
        stats,
    });
})


export const getAllUser = TryCatch(async(req,res)=>{
    const users = await User.find({_id:{$ne: req.user._id}}).select("-password");
    res.json({ users });
    
})

export const updateRole = TryCatch(async(req,res)=>{
    const user = await User.findById(req.params.id);

    if(user.role === "user"){
        user.role = "admin";
        await user.save();

        return res.status(200).json({
            message: "Role Updated to Admin"
        })
    }

    if(user.role === "admin"){
        user.role = "user";
        await user.save();

        return res.status(200).json({
            message: "Role Updated"
        })
    }

    
})




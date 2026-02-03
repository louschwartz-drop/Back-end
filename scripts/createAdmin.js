import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import { connectDB } from "../config/db.js";

const createAdmin = async () => {
    try {
        await connectDB();

        const email = "admin@droppr.ai";
        const password = "password123";
        const name = "Super Admin";

        // Check if admin exists
        const adminExists = await Admin.findOne({ email });

        if (adminExists) {
            console.log("Admin user already exists");
            process.exit();
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create admin
        await Admin.create({
            name,
            email,
            password: hashedPassword,
        });

        console.log("Admin user created successfully");
        console.log("Email:", email);
        console.log("Password:", password);

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

createAdmin();

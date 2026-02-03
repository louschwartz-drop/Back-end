import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Admin from "../../models/Admin.js";

// @desc    Auth admin & get token
// @route   POST /api/v1/admin/auth/login
// @access  Public
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1) Validate email & password
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email and password",
            });
        }

        // 2) Check if admin exists
        const admin = await Admin.findOne({ email }).select("+password");

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        // 3) Check if password is correct
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials",
            });
        }

        // 4) Create token
        const token = jwt.sign(
            { id: admin._id, role: "admin" },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d", // Admin session lasts 1 day
            },
        );

        // 5) Send response
        res.status(200).json({
            success: true,
            token,
            data: {
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: "admin",
            },
            message: "Admin login successful",
        });
    } catch (error) {
        console.error("Admin Login Error:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

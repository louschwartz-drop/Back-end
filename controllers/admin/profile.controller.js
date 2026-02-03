import Admin from "../../models/Admin.js";

export const updateProfile = async (req, res) => {
    try {
        console.log("called")
        const { id } = req.params;
        const { name, phone, avatar } = req.body;

        if (!id) {
            return res.status(400).json({ success: false, message: "Admin ID is required" });
        }

        const updatedAdmin = await Admin.findByIdAndUpdate(
            id,
            { name, phone, avatar },
            { new: true, runValidators: true }
        );

        if (!updatedAdmin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedAdmin
        });
    } catch (error) {
        console.error("Admin Profile update error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update profile",
            error: error.message
        });
    }
};

export const getProfile = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, message: "Admin ID is required" });
        }

        const admin = await Admin.findById(id);

        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        return res.status(200).json({
            success: true,
            data: admin
        });
    } catch (error) {
        console.error("Get admin profile error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch profile",
            error: error.message
        });
    }
};

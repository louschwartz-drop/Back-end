import User from "../../models/User.js"; // Adjust path as needed
import Campaign from "../../models/Campaign.js";

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select("name email createdAt")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch users" });
  }
};

export const getUserCampaigns = async (req, res) => {
  try {
    const { id } = req.params;
    const campaigns = await Campaign.find({ userId: id })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: campaigns.length,
      data: campaigns,
    });
  } catch (err) {
    console.error("Error fetching user campaigns:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch user campaigns" });
  }
};

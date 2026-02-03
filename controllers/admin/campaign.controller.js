import Campaign from "../../models/Campaign.js";
import User from "../../models/User.js";

export const getAllCampaigns = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search } = req.query;
        const query = {};

        if (status) query.status = status;

        // If search is provided, we might need to search by Campaign ID or User Name
        if (search) {
            // Search logic can be complex with populate, for now simplify to campaignId
            query.campaignId = { $regex: search, $options: "i" };
        }

        const total = await Campaign.countDocuments(query);
        const campaigns = await Campaign.find(query)
            .populate("userId", "name email")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        return res.json({
            success: true,
            data: {
                campaigns,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            },
        });
    } catch (err) {
        console.error("Error fetching admin campaigns:", err);
        return res
            .status(500)
            .json({ success: false, message: "Failed to fetch campaigns" });
    }
};

export const getCampaignById = async (req, res) => {
    try {
        const { id } = req.params;
        const campaign = await Campaign.findById(id).populate("userId", "name email");

        if (!campaign) {
            return res.status(404).json({ success: false, message: "Campaign not found" });
        }

        return res.json({ success: true, data: campaign });
    } catch (err) {
        console.error("Error fetching campaign:", err);
        return res.status(500).json({ success: false, message: "Failed to fetch campaign" });
    }
};

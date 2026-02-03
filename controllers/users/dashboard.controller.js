import Campaign from "../../models/Campaign.js";

export const getDashboardStats = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        const stats = {
            total: await Campaign.countDocuments({ userId }),
            failed: await Campaign.countDocuments({ userId, status: "failed" }),
            inProgress: await Campaign.countDocuments({
                userId,
                status: { $in: ["uploading", "uploaded", "transcribing", "generating"] }
            }),
            pressReleases: 0,
            distributed: 0
        };

        const lastCampaigns = await Campaign.find({ userId, status: "finished" })
            .sort({ createdAt: -1 })
            .limit(5);

        return res.status(200).json({
            success: true,
            data: {
                stats,
                lastCampaigns
            }
        });
    } catch (error) {
        console.error("Dashboard stats error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard stats",
            error: error.message
        });
    }
};

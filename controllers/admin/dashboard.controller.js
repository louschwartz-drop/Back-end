import User from "../../models/User.js";
import Campaign from "../../models/Campaign.js";

export const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({});
        const totalCampaigns = await Campaign.countDocuments({});

        // Recent Campaigns (Last 5)
        const recentCampaigns = await Campaign.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("userId", "name email");

        // Generated Articles (Last 7 Days) for Graph
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const generatedArticlesRaw = await Campaign.aggregate([
            {
                $match: {
                    createdAt: { $gte: sevenDaysAgo },
                    "article.headline": { $exists: true, $ne: null } // Assuming generated if headline exists
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Format for recharts
        const salesData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const found = generatedArticlesRaw.find(item => item._id === dateStr);
            salesData.push({
                date: d.toLocaleDateString('en-US', { weekday: 'short' }),
                articles: found ? found.count : 0
            });
        }

        // Mock data for other fields required by frontend structure (cleaning up unused ones)
        const stats = {
            users: {
                total: totalUsers,
                newLast30Days: 0,
            },
            campaigns: {
                total: totalCampaigns,
                today: 0,
                byStatus: {
                    draft: 0,
                    inProgress: 0,
                    distributed: 0,
                    failed: 0
                }
            },
            revenue: {
                total: 0,
                today: 0
            },
            recentCampaigns,
            salesData
        };

        return res.status(200).json({
            success: true,
            data: { stats }
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

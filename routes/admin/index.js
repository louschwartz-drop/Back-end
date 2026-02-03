import express from "express";
import adminAuthRoutes from "./auth.route.js";
import adminProfileRoutes from "./profile.route.js";
import adminUserRoutes from "./user.routes.js";

import adminDashboardRoutes from "./dashboard.routes.js";
import adminCampaignRoutes from "./campaign.routes.js";

const router = express.Router();

router.use("/auth", adminAuthRoutes);
router.use("/profile", adminProfileRoutes);
router.use("/users", adminUserRoutes);
router.use("/dashboard", adminDashboardRoutes);
router.use("/campaigns", adminCampaignRoutes);

export default router;

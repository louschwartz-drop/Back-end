import express from "express";

import authRoutes from "./auth.route.js";
import campaignRoutes from "./campaigns.routes.js";
import dashboardRoutes from "./dashboard.route.js";
import profileRoutes from "./profile.route.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/profile", profileRoutes);

export default router;

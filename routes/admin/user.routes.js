import express from "express";
import { getAllUsers, getUserCampaigns } from "../../controllers/admin/user.controller.js";

const router = express.Router();

router.get("/", getAllUsers);
router.get("/:id/campaigns", getUserCampaigns);

export default router;

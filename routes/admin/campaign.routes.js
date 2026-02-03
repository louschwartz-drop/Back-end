import express from "express";
import { getAllCampaigns, getCampaignById } from "../../controllers/admin/campaign.controller.js";

const router = express.Router();

router.get("/", getAllCampaigns);
router.get("/:id", getCampaignById);

export default router;

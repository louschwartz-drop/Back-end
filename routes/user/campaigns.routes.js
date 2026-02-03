import express from "express";
import {
  createCampaign,
  updateVideoUrl,
  getCampaign,
  getUserCampaigns,
  updateCampaign,
  startTranscription,
  handleAiEdit,
  deleteCampaign,
  createCampaignFromLink,
  uploadThumbnail,
  uploadOptimized,
} from "../../controllers/users/campaign.controller.js";
import multer from "multer";
import os from "os";

const upload = multer({ dest: os.tmpdir() });

const router = express.Router();

// Campaign routes
router.post("/", createCampaign);
router.get("/", getUserCampaigns);
router.get("/:id", getCampaign);
router.patch("/:id", updateCampaign);
router.patch("/:id/video-url", updateVideoUrl);
router.patch("/:id/thumbnail", upload.single("thumbnail"), uploadThumbnail);
router.post("/:id/upload-optimized", upload.single("video"), uploadOptimized);
router.post("/:id/transcribe", startTranscription);
router.post("/:id/ai-edit", handleAiEdit);
router.post("/link", createCampaignFromLink);
router.delete("/:id", deleteCampaign);

export default router;

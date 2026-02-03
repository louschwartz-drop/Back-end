import express from "express";
import { updateProfile, getProfile } from "../../controllers/admin/profile.controller.js";

const router = express.Router();

router.get("/:id", getProfile);
router.put("/:id", updateProfile);

export default router;

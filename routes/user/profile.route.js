import express from "express";
import { updateProfile, getProfile } from "../../controllers/users/profile.controller.js";

const router = express.Router();

router.get("/:userId", getProfile);
router.put("/:userId", updateProfile);

export default router;

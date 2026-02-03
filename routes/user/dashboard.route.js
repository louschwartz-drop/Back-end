import express from "express";
import { getDashboardStats } from "../../controllers/users/dashboard.controller.js";

const router = express.Router();

router.get("/stats/:userId", getDashboardStats);

export default router;

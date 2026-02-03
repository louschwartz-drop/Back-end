import express from "express";

import usersRoutes from "./user/index.js";
import adminRoutes from "./admin/index.js";

const router = express.Router();

router.use("/user", usersRoutes);
router.use("/admin", adminRoutes);

export default router;

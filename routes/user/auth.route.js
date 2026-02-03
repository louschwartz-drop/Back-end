import express from "express";
import { loginWithGoogle } from "../../controllers/users/auth.controller.js";

const router = express.Router();

router.post("/login/google", loginWithGoogle);

export default router;

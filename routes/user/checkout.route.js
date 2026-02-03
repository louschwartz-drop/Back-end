import express from "express";
import {
  createStripePaymentIntent,
  placeOrder,
} from "../../controllers/client/checkoutController.js";

const router = express.Router();

// POST /api/payment/stripe-intent
router.post("/stripe-intent", createStripePaymentIntent);
router.post("/place-order", placeOrder);

export default router;

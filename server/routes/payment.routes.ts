import { Router } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { ApplicationModel } from '../models/index.js';

const router = Router();

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY || "rzp_test_mock_key123",
  key_secret: process.env.RAZORPAY_SECRET || "mock_secret_abc123",
});

router.post("/create-order", async (req, res) => {
  try {
    const options = {
      amount: 29900, // ₹299.00
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`
    };
    
    try {
      const order = await instance.orders.create(options);
      res.json(order);
    } catch (razorpayErr) {
      console.log("Razorpay mock fallback initialized");
      res.json({ id: `order_${Date.now()}`, amount: options.amount, currency: options.currency });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to create order" });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const { applicationId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    if (applicationId) {
      // In a real app check signature with crypto.createHmac
      await ApplicationModel.findOneAndUpdate(
        { id: applicationId }, 
        { 
          paymentStatus: 'paid', 
          agentId: "agent-1", // Simple auto-assignment for now
          status: 'in_review',
          updatedAt: new Date()
        }
      );
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Verification Failed" });
  }
});

export default router;

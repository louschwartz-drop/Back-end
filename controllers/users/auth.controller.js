import User from "../../models/User.js";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const loginWithGoogle = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res
        .status(400)
        .json({ success: false, message: "idToken is required" });
    }

    // Verify Google token
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      console.error("Google token verification error:", err);
      return res
        .status(401)
        .json({ success: false, message: "Invalid Google token" });
    }

    const { email, name } = payload;

    // Check if user exists or create new user
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({ name, email });
    }

    // Issue JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name, phone: user.phone, avatar: user.avatar },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.json({
      success: true,
      message: "Login successful",
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Unexpected server error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong" });
  }
};

export { User };

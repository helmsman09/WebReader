import express from "express";
import { User } from "../models/User";
import { generateApiKey } from "../utils/apiKey";

const router = express.Router();

router.post("/device", async (req, res) => {
  try {
    const { deviceLabel } = req.body || {};
    const apiKey = generateApiKey();

    const user = await User.create({
      apiKey,
      deviceLabel: deviceLabel || "Unnamed device"
    });

    res.json({
      apiKey: user.apiKey,
      userId: user._id.toString()
    });
  } catch (e) {
    console.error(e);
    res.status(500).send("Failed to create device user");
  }
});

export default router;

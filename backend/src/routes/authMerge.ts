import express from "express";
import { apiKeyAuth, AuthedRequest } from "../middleware/auth";
import { User } from "../models/User";
import { Page } from "../models/Page"; // adjust import path

const router = express.Router();

/**
 * Merge a device-user into the current root user.
 * Body: { deviceApiKey: string }
 */
router.post(
  "/merge-device",
  apiKeyAuth,
  async (req: AuthedRequest, res) => {
    try {
      const rootUser = req.user!;
      const { deviceApiKey } = req.body || {};
      if (!deviceApiKey) {
        return res.status(400).send("deviceApiKey is required.");
      }

      const deviceUser = await User.findOne({ apiKey: deviceApiKey }).exec();
      if (!deviceUser) {
        return res.status(404).send("Device user not found.");
      }

      // If it's already the same root, nothing to do
      if (deviceUser._id.equals(rootUser._id)) {
        return res.json({ ok: true, merged: false });
      }

      // Repoint all pages from deviceUser → rootUser
      await Page.updateMany(
        { userId: deviceUser._id },
        { $set: { userId: rootUser._id } }
      ).exec();

      deviceUser.upgradeParentUserId = rootUser._id;
      await deviceUser.save();

      res.json({
        ok: true,
        merged: true,
        deviceUserId: deviceUser._id
      });
    } catch (e) {
      console.error(e);
      res.status(500).send("Failed to merge device user.");
    }
  }
);

export default router;

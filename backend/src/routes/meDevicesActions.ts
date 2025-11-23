import express from "express";
import { apiKeyAuth, AuthedRequest } from "../middleware/auth";
import { User } from "../models/User";

const router = express.Router();

router.post(
  "/me/devices/revoke",
  apiKeyAuth,
  async (req: AuthedRequest, res) => {
    try {
      const root = req.user!;
      const { deviceId } = req.body || {};
      if (!deviceId) {
        return res.status(400).send("deviceId is required.");
      }

      const device = await User.findById(deviceId).exec();
      if (!device) return res.status(404).send("Device not found.");

      // Must belong to this root
      if (
        !device._id.equals(root._id) &&
        (!device.upgradeParentUserId ||
          !device.upgradeParentUserId.equals(root._id))
      ) {
        return res.status(403).send("Not your device.");
      }

      device.isRevoked = true;
      await device.save();

      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).send("Failed to revoke device.");
    }
  }
);

router.post(
  "/me/devices/rotate-key",
  apiKeyAuth,
  async (req: AuthedRequest, res) => {
    try {
      const root = req.user!;
      const { deviceId } = req.body || {};
      if (!deviceId) {
        return res.status(400).send("deviceId is required.");
      }

      const device = await User.findById(deviceId).exec();
      if (!device) return res.status(404).send("Device not found.");

      if (
        !device._id.equals(root._id) &&
        (!device.upgradeParentUserId ||
          !device.upgradeParentUserId.equals(root._id))
      ) {
        return res.status(403).send("Not your device.");
      }

      // generate new apiKey
      const { generateApiKey } = await import("../utils/apiKey");
      device.apiKey = generateApiKey();
      device.isRevoked = false;
      await device.save();

      res.json({ ok: true, apiKey: device.apiKey });
    } catch (e) {
      console.error(e);
      res.status(500).send("Failed to rotate key.");
    }
  }
);

export default router;

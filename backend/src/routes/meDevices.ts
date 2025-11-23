import express from "express";
import { apiKeyAuth, AuthedRequest } from "../middleware/auth";
import { User } from "../models/User";

const router = express.Router();

router.get(
  "/me/devices",
  apiKeyAuth,
  async (req: AuthedRequest, res) => {
    try {
      const root = req.user!;
      const devices = await User.find({
        $or: [
          { _id: root._id },
          { upgradeParentUserId: root._id }
        ]
      })
        .sort({ createdAt: 1 })
        .lean()
        .exec();

      res.json(
        devices.map((d) => ({
          id: d._id.toString(),
          label: d.deviceLabel || (d._id.equals(root._id) ? "Primary account" : "Device"),
          isPrimary: d._id.equals(root._id),
          isRevoked: !!d.isRevoked,
          createdAt: d.createdAt,
          lastSeenAt: d.lastSeenAt,
          hasEmail: !!d.email
        }))
      );
    } catch (e) {
      console.error(e);
      res.status(500).send("Failed to load devices.");
    }
  }
);

export default router;

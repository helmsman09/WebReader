import express from "express";
import bcrypt from "bcryptjs";
import { apiKeyAuth, AuthedRequest } from "../middleware/auth";
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

router.post(
  "/upgrade",
  apiKeyAuth,
  async (req: AuthedRequest, res) => {
    try {
      const root = req.user!;
      const { email, password } = req.body || {};

      if (!email || !password) {
        return res.status(400).send("Email and password are required.");
      }

      const existing = await User.findOne({ email }).exec();
      if (existing && existing._id.toString() !== root._id.toString()) {
        return res.status(400).send("Email already in use.");
      }

      // Upgrade the root user in place
      const hash = await bcrypt.hash(password, 12);
      root.email = email;
      root.passwordHash = hash;
      await root.save();

      res.json({
        ok: true,
        userId: root._id,
        email: root.email
      });
    } catch (e) {
      console.error(e);
      res.status(500).send("Failed to upgrade account.");
    }
  }
);

/**
 * Email/password login.
 *
 * Body:
 *  - email: string
 *  - password: string
 *  - deviceLabel?: string
 *  - mergeFromApiKey?: string  (optional: device key to merge into this account)
 */
router.post("/login-email", async (req, res) => {
  try {
    const { email, password, deviceLabel, mergeFromApiKey } = req.body || {};
    if (!email || !password) {
      return res.status(400).send("Email and password are required.");
    }

    const rootUser = await User.findOne({ email }).exec();
    if (!rootUser || !rootUser.passwordHash) {
      return res.status(400).send("Invalid email or password.");
    }

    const ok = await bcrypt.compare(password, rootUser.passwordHash);
    if (!ok) {
      return res.status(400).send("Invalid email or password.");
    }

    // Optional: merge current device (if we came from a device-only account)
    if (mergeFromApiKey && typeof mergeFromApiKey === "string") {
      const deviceUser = await User.findOne({ apiKey: mergeFromApiKey }).exec();
      if (deviceUser && !deviceUser._id.equals(rootUser._id)) {
        // Move pages to root user
        await Page.updateMany(
          { userId: deviceUser._id },
          { $set: { userId: rootUser._id } }
        ).exec();

        deviceUser.upgradeParentUserId = rootUser._id;
        await deviceUser.save();
      }
    }

    // Create a new device record for this browser
    const newApiKey = generateApiKey();
    const deviceUser = await User.create({
      apiKey: newApiKey,
      deviceLabel: deviceLabel || "Web dashboard",
      upgradeParentUserId: rootUser._id
    });

    res.json({
      ok: true,
      apiKey: deviceUser.apiKey,
      rootUserId: rootUser._id,
      deviceUserId: deviceUser._id
    });
  } catch (e) {
    console.error(e);
    res.status(500).send("Login failed.");
  }
});


export default router;

import { Schema, model, type Document, type Types } from "mongoose";

export interface IUser extends Document {
  email?: string;
  passwordHash?: string;
  apiKey: string;
  deviceLabel?: string;
  upgradeParentUserId?: Types.ObjectId | null;  // <— correct TS type
  authProvider: string,
  isRevoked?: boolean;
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    // For login-based users (future feature)
    email: { type: String, required: false, unique: true, sparse: true, trim: true },
    passwordHash: { type: String },

    // For device-based no-login auth
    apiKey: { type: String, required: true, unique: true },
    deviceLabel: { type: String },

    // If this is a child device user linked to a full account
    upgradeParentUserId: { type: Schema.Types.ObjectId, ref: "User" },

    authProvider: {
      type: String,
      enum: ["password", "google", "device"],
      required: false,
    },
    // For revocation
    isRevoked: { type: Boolean, default: false },

    lastSeenAt: { type: Date }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export const User = model<IUser>("User", UserSchema);

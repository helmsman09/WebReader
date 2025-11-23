import { Schema, model, Document, Types } from "mongoose";

export interface IUser extends Document {
  email?: string;
  passwordHash?: string;
  apiKey: string;
  createdAt: Date;
  deviceLabel?: string;
  upgradeParentUserId?: Types.ObjectId | null;  // <— correct TS type
}

const UserSchema = new Schema<IUser>(
  {
    // For login-based users (future feature)
    email: { type: String, required: false, unique: true, sparse: true },
    passwordHash: { type: String },

    // For device-based no-login auth
    apiKey: { type: String, required: true, unique: true },
    deviceLabel: { type: String },

    // Later, if user upgrades to email login
    upgradeParentUserId: { type: Schema.Types.ObjectId }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export const User = model<IUser>("User", UserSchema);

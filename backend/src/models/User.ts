import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  apiKey: string;
  createdAt: Date;
  deviceLabel?: string;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    apiKey: { type: String, required: true, unique: true },
    deviceLabel: { type: String }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export const User = model<IUser>("User", UserSchema);

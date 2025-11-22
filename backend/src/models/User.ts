import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  apiKey: string;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    apiKey: { type: String, required: true, unique: true }
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);

import mongoose, { Schema, Document, Model } from "mongoose";

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  COMPANY_ADMIN = "COMPANY_ADMIN",
  HR = "HR",
  ACCOUNTANT = "ACCOUNTANT",
  MAINTAINER = "MAINTAINER",
}

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  companyId?: mongoose.Types.ObjectId; // Null for Super Admin
  isActive: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  isEmailVerified: boolean;
  verificationOtp?: string;
  verificationOtpExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional in case of SSO later, required for credentials
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.MAINTAINER,
    },
    companyId: { type: Schema.Types.ObjectId, ref: "Company" },
    isActive: { type: Boolean, default: true },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    isEmailVerified: { type: Boolean, default: false },
    verificationOtp: { type: String },
    verificationOtpExpires: { type: Date },
  },
  { timestamps: true }
);

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

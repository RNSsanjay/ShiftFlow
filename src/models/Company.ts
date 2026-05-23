import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICompany extends Document {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  pfEnabled: boolean;
  esiEnabled: boolean;
  pfPercentage: number;
  esiPercentage: number;
  pfEmployerPercentage: number;
  esiEmployerPercentage: number;
  salaryCycle: "monthly" | "weekly" | "bi-weekly";
  salaryCycleStartDay: number; // e.g., 1 for 1st of month
  otType: "normal" | "fixed";
  fixedOtRate: number;
  workingHours: number; // default daily working hours, e.g., 8
  currency: string; // e.g., "INR", "USD"
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    address: { type: String },
    pfEnabled: { type: Boolean, default: false },
    esiEnabled: { type: Boolean, default: false },
    pfPercentage: { type: Number, default: 12 },
    esiPercentage: { type: Number, default: 0.75 },
    pfEmployerPercentage: { type: Number, default: 13 },
    esiEmployerPercentage: { type: Number, default: 3.25 },
    salaryCycle: { type: String, enum: ["monthly", "weekly", "bi-weekly"], default: "monthly" },
    salaryCycleStartDay: { type: Number, default: 1 },
    otType: { type: String, enum: ["normal", "fixed"], default: "normal" },
    fixedOtRate: { type: Number, default: 0 },
    workingHours: { type: Number, default: 8 },
    currency: { type: String, default: "INR" },
  },
  { timestamps: true }
);

export const Company: Model<ICompany> =
  mongoose.models.Company || mongoose.model<ICompany>("Company", CompanySchema);

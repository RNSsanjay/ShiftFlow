import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPayroll extends Document {
  month: number; // 1-12
  year: number;
  employeeId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  baseSalary: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  halfDays: number;
  otHours: number;
  otAmount: number;
  pfDeduction: number; // Employee PF share
  esiDeduction: number; // Employee ESI share
  pfEmployerShare: number;
  esiEmployerShare: number;
  advanceDeduction: number;
  bonus: number;
  incentives: number;
  netSalary: number;
  status: "draft" | "approved" | "paid";
  generatedBy?: mongoose.Types.ObjectId;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollSchema: Schema = new Schema(
  {
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    baseSalary: { type: Number, required: true, default: 0 },
    workingDays: { type: Number, required: true, default: 0 },
    presentDays: { type: Number, required: true, default: 0 },
    absentDays: { type: Number, required: true, default: 0 },
    halfDays: { type: Number, required: true, default: 0 },
    otHours: { type: Number, default: 0 },
    otAmount: { type: Number, default: 0 },
    pfDeduction: { type: Number, default: 0 },
    esiDeduction: { type: Number, default: 0 },
    pfEmployerShare: { type: Number, default: 0 },
    esiEmployerShare: { type: Number, default: 0 },
    advanceDeduction: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    incentives: { type: Number, default: 0 },
    netSalary: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ["draft", "approved", "paid"], default: "draft" },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

// Ensure only one payroll sheet per employee per month
PayrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
PayrollSchema.index({ companyId: 1, month: 1, year: 1 });

export const Payroll: Model<IPayroll> =
  mongoose.models.Payroll || mongoose.model<IPayroll>("Payroll", PayrollSchema);

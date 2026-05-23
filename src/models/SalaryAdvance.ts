import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISalaryAdvance extends Document {
  employeeId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
  status: "pending" | "approved" | "deducted";
  createdAt: Date;
  updatedAt: Date;
}

const SalaryAdvanceSchema: Schema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "approved", "deducted"],
      default: "pending",
    },
  },
  { timestamps: true }
);

SalaryAdvanceSchema.index({ companyId: 1 });

export const SalaryAdvance: Model<ISalaryAdvance> =
  mongoose.models.SalaryAdvance ||
  mongoose.model<ISalaryAdvance>("SalaryAdvance", SalaryAdvanceSchema);

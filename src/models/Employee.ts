import mongoose, { Schema, Document, Model } from "mongoose";

export type EmployeeType = "staff" | "worker";

export interface IEmployee extends Document {
  name: string;
  phone: string;
  employeeType: EmployeeType;
  department: string;
  salary: number; // Staff: Fixed Monthly Salary, Worker: Daily rate or baseline salary
  joiningDate: Date;
  status: "active" | "inactive";
  otEligible: boolean;
  pfEnabled: boolean;
  esiEnabled: boolean;
  shift: string;
  companyId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    employeeType: { type: String, enum: ["staff", "worker"], required: true },
    department: { type: String, required: true },
    salary: { type: Number, required: true, default: 0 },
    joiningDate: { type: Date, required: true, default: Date.now },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    otEligible: { type: Boolean, default: true },
    pfEnabled: { type: Boolean, default: true },
    esiEnabled: { type: Boolean, default: true },
    shift: { type: String, default: "General Shift (09:00 AM - 05:00 PM)" },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
  },
  { timestamps: true }
);

// Compounded index to ensure phone numbers are unique within a single company
EmployeeSchema.index({ companyId: 1, phone: 1 }, { unique: true });

export const Employee: Model<IEmployee> =
  mongoose.models.Employee || mongoose.model<IEmployee>("Employee", EmployeeSchema);

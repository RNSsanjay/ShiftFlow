import mongoose, { Schema, Document, Model } from "mongoose";

export type AttendanceStatus = "present" | "absent" | "half_day" | "leave" | "holiday";

export interface IAttendance extends Document {
  date: Date;
  employeeId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  status: AttendanceStatus;
  checkIn?: string; // HH:MM format
  checkOut?: string; // HH:MM format
  otHours: number; // custom OT hours for the day
  notes?: string;
  markedBy?: mongoose.Types.ObjectId; // User Ref
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema: Schema = new Schema(
  {
    date: { type: Date, required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    status: {
      type: String,
      enum: ["present", "absent", "half_day", "leave", "holiday"],
      required: true,
    },
    checkIn: { type: String },
    checkOut: { type: String },
    otHours: { type: Number, default: 0 },
    notes: { type: String },
    markedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Ensure only one attendance record exists per employee per day
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
// Index for query optimization
AttendanceSchema.index({ companyId: 1, date: 1 });

export const Attendance: Model<IAttendance> =
  mongoose.models.Attendance || mongoose.model<IAttendance>("Attendance", AttendanceSchema);

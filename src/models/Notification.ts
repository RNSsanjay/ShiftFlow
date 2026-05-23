import mongoose, { Schema, Document, Model } from "mongoose";

export interface INotification extends Document {
  title: string;
  message: string;
  type: "attendance_reminder" | "payroll_alert" | "missing_attendance" | "system";
  companyId: mongoose.Types.ObjectId;
  targetRole?: string; // If target is a specific role
  readBy: mongoose.Types.ObjectId[]; // List of user IDs who read it
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["attendance_reminder", "payroll_alert", "missing_attendance", "system"],
      default: "system",
    },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    targetRole: { type: String },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

NotificationSchema.index({ companyId: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

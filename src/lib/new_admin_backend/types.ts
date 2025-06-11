
import { Timestamp } from 'firebase/firestore';
import { z } from 'zod';

// Base Employee Schema (for data input and core structure)
export const BaseEmployeeSchema = z.object({
  empNo: z.string().min(1, "Employee Number is required"),
  empName: z.string().min(1, "Employee Name is required"),
  designation: z.string().min(1, "Designation is required"),
  department: z.string().min(1, "Department is required"),
  station: z.string().min(1, "Station is required"),
  dob: z.union([z.date(), z.instanceof(Timestamp)], { required_error: "Date of Birth is required" }),
  address: z.string().min(1, "Address is required"),
  rlyNumber: z.string().optional(),
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, "Valid 10-digit mobile number required"),
  emergencyContactName: z.string().min(1, "Emergency Contact Name is required"),
  emergencyContactNo: z.string().regex(/^[6-9]\d{9}$/, "Valid 10-digit emergency contact number required"),
  deptSlNo: z.string().optional(),
  qrCode: z.string().optional(),
  photoURL: z.string().url("Invalid photo URL").optional().nullable(),
  signatureURL: z.string().url("Invalid signature URL").optional().nullable(),
  applicationDate: z.union([z.date(), z.instanceof(Timestamp)], { required_error: "Application Date is required" }),
  status: z.enum(["Pending", "Printing (Draft)", "Printing (To be Sent)", "Printing (Sent)", "Closed", "Rejected"]),
  bloodGroup: z.string().optional(),
  identificationMarks: z.array(z.string()).optional().default([]),
  familyMembers: z.array(z.object({
    name: z.string().min(1, "Family member name is required"),
    relationship: z.string().min(1, "Family member relationship is required"),
    dob: z.union([z.date(), z.instanceof(Timestamp)], { required_error: "Family member Date of Birth is required" }),
  })).optional().default([]),
});

export type InputEmployeeData = z.infer<typeof BaseEmployeeSchema>;

// StoredEmployee: Represents how employee data is structured in Firestore, including server-generated timestamps.
export interface StoredEmployee extends Omit<InputEmployeeData, 'dob' | 'applicationDate' | 'familyMembers'> {
  id?: string; // Firestore document ID
  dob: Timestamp;
  applicationDate: Timestamp;
  familyMembers: Array<{
    name: string;
    relationship: string;
    dob: Timestamp;
  }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Admin User Schema
export const AdminUserSchema = z.object({
  email: z.string().email("Invalid email format"),
  role: z.enum(["super_admin", "admin", "operator"]),
  name: z.string().min(1, "Admin name is required"),
  permissions: z.array(z.string()).optional().default([]),
});

export type InputAdminUserData = z.infer<typeof AdminUserSchema>;

export interface StoredAdminUser extends InputAdminUserData {
  id?: string; // Firestore document ID
  createdAt: Timestamp;
}

// Application Statistics Schema
export const ApplicationStatsSchema = z.object({
  totalApplications: z.number().int().nonnegative(),
  pendingCount: z.number().int().nonnegative(),
  approvedCount: z.number().int().nonnegative(),
  rejectedCount: z.number().int().nonnegative(),
});

export interface StoredApplicationStats extends z.infer<typeof ApplicationStatsSchema> {
  lastUpdated: Timestamp;
}

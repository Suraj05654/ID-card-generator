
import { z } from 'zod';
import { isValid, parseISO } from 'date-fns';

// File Upload Constants - These are safe as they are just values
export const MAX_FILE_SIZE_PROFILE_DOCS = 2 * 1024 * 1024; // 2MB
export const ACCEPTED_IMAGE_TYPES_PROFILE = ["image/jpeg", "image/jpg", "image/png"];

// Universal Schemas and Types
export const NewFamilyMemberSchema = z.object({
  id: z.string().optional(), // Used by useFieldArray, can be undefined initially
  name: z.string().min(1, "Name is required"),
  bloodGroup: z.string().optional().default(''),
  relationship: z.string().min(1, "Relationship is required"),
  // For client-side, react-hook-form manages this as a Date object.
  // For server-side, it will be transformed from a string.
  dob: z.date({ required_error: "Date of birth is required" }),
  identificationMarks: z.string().optional().default(''),
});
export type NewFamilyMember = z.infer<typeof NewFamilyMemberSchema>;

export const DepartmentEnum = z.enum([
  "ACCOUNTS", "COMMERCIAL", "ELECTRICAL", "ENGINEERING", "GA",
  "MECHANICAL", "MEDICAL", "OPERATING", "PERSONNEL", "RRB",
  "S&T", "SAFETY", "SECURITY", "STORES"
]);
export type Department = z.infer<typeof DepartmentEnum>;

export const BillUnitEnum = z.enum([
  "3101001", "3101002", "3101003", "3101004", "3101010", "3101023",
  "3101024", "3101025", "3101026", "3101027", "3101065", "3101066",
  "3101165", "3101166", "3101285", "3101286", "3101287", "3101288",
  "3101470"
]);
export type BillUnit = z.infer<typeof BillUnitEnum>;

// Base schema, server-safe (no FileList or other browser-specific types)
// Defines the core data structure without file representations.
export const BaseApplicationSchema = z.object({
  applicantType: z.enum(['gazetted', 'non-gazetted']),
  // Fields like applicationId, status, submissionDate are typically added/managed by server or not part of initial form.
  // They can be part of StoredApplication type.

  // Employee Details
  employeeName: z.string().min(1, "Employee name is required").regex(/^[a-zA-Z\s.]+$/, "Employee name should contain only letters, spaces, and periods"),
  designation: z.string().min(1, "Designation is required"),
  employeeNo: z.string().optional(), // Conditional based on applicantType
  ruidNo: z.string().optional(),     // Conditional based on applicantType
  dateOfBirth: z.date({ required_error: "Date of Birth is required" }),
  department: DepartmentEnum,
  station: z.string().min(1, "Station is required").default("BHUBANESWAR"),
  billUnit: BillUnitEnum,
  residentialAddress: z.string().min(1, "Residential address is required"),
  rlyContactNumber: z.string().optional().default('').nullable(),
  mobileNumber: z.string().min(10, "Mobile number must be 10 digits").max(10, "Mobile number must be 10 digits").regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number starting with 6-9"),
  reasonForApplication: z.string().min(1, "Reason for application is required"),
  
  // Family Members
  // On the client, this will be Array<NewFamilyMember>
  // On the server, during processing, DOBs might be strings initially from FormData
  familyMembers: z.array(NewFamilyMemberSchema).optional().default([]),
  
  // Additional Details
  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  emergencyContactNumber: z.string().min(10, "Emergency contact number must be 10 digits").max(10, "Emergency contact number must be 10 digits").regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit emergency contact number"),

  // File fields are NOT defined here. They will be added by client/server specific schemas.
});


export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

// Type for data stored in Firestore (includes URLs for files, Timestamps for dates)
export interface StoredApplication extends Omit<z.infer<typeof BaseApplicationSchema>, 'dateOfBirth' | 'familyMembers' | 'uploadPhoto' | 'uploadSignature' | 'uploadHindiName' | 'uploadHindiDesignation' > {
  applicationId: string;
  submissionDate: Date; // Will be Firestore Timestamp, converted to Date on retrieval
  status: ApplicationStatus;
  dateOfBirth: Date; // Will be Firestore Timestamp
  familyMembers: Array<Omit<NewFamilyMember, 'dob'> & { dob: Date }>; // DOB will be Firestore Timestamp

  // URLs for files stored in Cloud Storage
  uploadPhotoUrl?: string;
  uploadSignatureUrl?: string;
  uploadHindiNameUrl?: string;
  uploadHindiDesignationUrl?: string;
}

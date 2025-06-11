
'use server';

import { z } from 'zod';
import {
  BaseApplicationSchema, 
  type StoredApplication,
  type ApplicationStatus,
  MAX_FILE_SIZE_PROFILE_DOCS,
  ACCEPTED_IMAGE_TYPES_PROFILE,
  NewFamilyMemberSchema, 
  DepartmentEnum, 
  BillUnitEnum, 
} from '@/lib/types';
import { revalidatePath } from 'next/cache';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  Timestamp,
  query,
  orderBy,
  where,
  type DocumentData,
  type DocumentSnapshot
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { format, parseISO, isValid } from 'date-fns';

const APPLICATIONS_COLLECTION = 'applications';
const applicationsCollectionRef = collection(firestore, APPLICATIONS_COLLECTION);

const generateApplicationId = () => `ECR-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

// Server-side Zod schema for individual file metadata (from FormData)
const ServerFileMetadataSchema = z.object({
  name: z.string().min(1, "File name cannot be empty."),
  type: z.string().min(1, "File type cannot be empty."),
  size: z.number().positive("File size must be positive.")
    .max(MAX_FILE_SIZE_PROFILE_DOCS, `Max file size is ${MAX_FILE_SIZE_PROFILE_DOCS / (1024 * 1024)}MB.`),
});
const OptionalServerFileSchema = ServerFileMetadataSchema.optional().nullable();
const RequiredServerFileSchema = ServerFileMetadataSchema;

// Server-side Zod schema for processing
// Extends the server-safe BaseApplicationSchema
const serverApplicationProcessingSchema = BaseApplicationSchema.extend({
  // Server expects file metadata objects, not FileList
  uploadPhoto: RequiredServerFileSchema,
  uploadSignature: RequiredServerFileSchema,
  uploadHindiName: OptionalServerFileSchema,
  uploadHindiDesignation: OptionalServerFileSchema,
  
  // Family members from FormData will have DOB as string 'yyyy-MM-dd'
  // Transform to Date for validation consistency with BaseApplicationSchema
  familyMembers: z.array(
    NewFamilyMemberSchema.extend({ 
      dob: z.string()
             .refine(val => isValid(parseISO(val)), { message: "Invalid date format for family member DOB."})
             .transform(val => parseISO(val)) 
    })
  ).optional().default([]),

  // dateOfBirth from FormData will be an ISO string. Transform to Date.
  dateOfBirth: z.preprocess((arg) => {
    if (typeof arg === 'string') {
        const parsedDate = parseISO(arg);
        if (isValid(parsedDate)) return parsedDate;
    }
    if (arg instanceof Date && isValid(arg)) return arg;
    console.warn(`[serverApplicationProcessingSchema] Invalid dateOfBirth preprocess input: ${JSON.stringify(arg)}`);
    return undefined; 
  }, z.date({ required_error: "Date of Birth is required" })),

}).superRefine((data, ctx) => {
  const checkFileTypeAndSize = (file: z.infer<typeof ServerFileMetadataSchema> | null | undefined, path: string[], acceptedTypes: string[]) => {
    if (file) { 
      if (!acceptedTypes.includes(file.type)) {
        ctx.addIssue({
          path,
          message: `Unsupported file type. Accepted: ${acceptedTypes.join(', ')}`,
          code: z.ZodIssueCode.custom,
        });
      }
      if (file.size > MAX_FILE_SIZE_PROFILE_DOCS) {
         ctx.addIssue({
          path,
          message: `File too large. Max size: ${MAX_FILE_SIZE_PROFILE_DOCS / (1024*1024)}MB.`,
          code: z.ZodIssueCode.custom,
        });
      }
    }
  };

  checkFileTypeAndSize(data.uploadPhoto, ['uploadPhoto'], ACCEPTED_IMAGE_TYPES_PROFILE);
  checkFileTypeAndSize(data.uploadSignature, ['uploadSignature'], ACCEPTED_IMAGE_TYPES_PROFILE);

  if (data.applicantType === 'gazetted') {
    if (!data.ruidNo || data.ruidNo.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ruidNo'], message: 'RUID No is required for Gazetted applicants.' });
    }
    if (!data.uploadHindiName) { 
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['uploadHindiName'], message: 'Upload Hindi Name is required for Gazetted applicants.' });
    } else {
      checkFileTypeAndSize(data.uploadHindiName, ['uploadHindiName'], ACCEPTED_IMAGE_TYPES_PROFILE);
    }
    if (!data.uploadHindiDesignation) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['uploadHindiDesignation'], message: 'Upload Hindi Designation is required for Gazetted applicants.' });
    } else {
      checkFileTypeAndSize(data.uploadHindiDesignation, ['uploadHindiDesignation'], ACCEPTED_IMAGE_TYPES_PROFILE);
    }
  } else { 
    if (!data.employeeNo || data.employeeNo.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['employeeNo'], message: 'Employee No is required for Non-Gazetted applicants.' });
    }
  }
});

const safeTimestampToDate = (timestamp: any, fieldName: string, docId: string): Date | null => {
    if (!timestamp) {
        console.warn(`[safeTimestampToDate] Field "${fieldName}" for doc "${docId}" is null or undefined.`);
        return null;
    }
    if (timestamp instanceof Timestamp) {
        const date = timestamp.toDate();
        if (isValid(date)) return date;
        console.warn(`[safeTimestampToDate] Field "${fieldName}" for doc "${docId}" was a Firestore Timestamp but produced an invalid Date object. Timestamp: s=${timestamp.seconds}, ns=${timestamp.nanoseconds}`);
        return null;
    }
    if (typeof timestamp === 'string') {
        const date = parseISO(timestamp); // Prefer parseISO for ISO strings
        if (isValid(date)) return date;
        // Try generic Date constructor as fallback for other string formats
        const genericDate = new Date(timestamp);
        if (isValid(genericDate)) return genericDate;
        console.warn(`[safeTimestampToDate] Field "${fieldName}" for doc "${docId}" was a string ("${timestamp}") but could not be parsed into a valid Date.`);
        return null;
    }
    if (typeof timestamp === 'number') { // Assuming it's a Unix epoch milliseconds
        const date = new Date(timestamp);
        if (isValid(date)) return date;
        console.warn(`[safeTimestampToDate] Field "${fieldName}" for doc "${docId}" was a number (${timestamp}) but could not be converted into a valid Date.`);
        return null;
    }
    if (typeof timestamp === 'object' && timestamp !== null && 
        typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
        try {
            const date = new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
            if (isValid(date)) return date;
            console.warn(`[safeTimestampToDate] Field "${fieldName}" for doc "${docId}" was a plain object resembling a Timestamp but produced an invalid Date. Object: ${JSON.stringify(timestamp)}`);
            return null;
        } catch (e: any) {
            console.warn(`[safeTimestampToDate] Error converting pseudo-timestamp for field "${fieldName}" in doc "${docId}": ${e.message}. Value: ${JSON.stringify(timestamp)}`);
            return null;
        }
    }
    console.warn(`[safeTimestampToDate] Field "${fieldName}" for doc "${docId}" has an unrecognized type or value. Received: ${JSON.stringify(timestamp)} (type: ${typeof timestamp}).`);
    return null;
};


function docToStoredApplication(documentSnapshot: DocumentSnapshot<DocumentData>): StoredApplication | null {
  const data = documentSnapshot.data();
  const docId = documentSnapshot.id;

  if (!data) {
    console.error(`[docToStoredApplication] No data found for document ID: ${docId}`);
    return null;
  }
  
  const familyMembersRaw = data.familyMembers || [];
  const familyMembers: StoredApplication['familyMembers'] = [];
  familyMembersRaw.forEach((fm: any, index: number) => {
    const dob = safeTimestampToDate(fm.dob, `familyMembers[${index}].dob`, docId);
    if (!dob) {
        console.warn(`[docToStoredApplication] Invalid DOB for family member ${index} in doc ${docId}. Skipping member.`);
        return; // Skip this family member if DOB is invalid
    }
    if (!fm.name || !fm.relationship) {
        console.warn(`[docToStoredApplication] Missing name or relationship for family member ${index} in doc ${docId}. Skipping member.`);
        return;
    }
    familyMembers.push({
      id: fm.id || `fm_${index}_${docId}`, // Ensure an ID
      name: fm.name,
      bloodGroup: fm.bloodGroup || '',
      relationship: fm.relationship,
      dob: dob, 
      identificationMarks: fm.identificationMarks || '',
    });
  });

  const dateOfBirth = safeTimestampToDate(data.dateOfBirth, 'dateOfBirth', docId);
  const submissionDate = safeTimestampToDate(data.submissionDate, 'submissionDate', docId);

  if (!dateOfBirth) {
    console.error(`[docToStoredApplication] CRITICAL: Invalid or missing 'dateOfBirth' for doc ${docId}. Application cannot be processed.`);
    return null;
  }
  if (!submissionDate) {
    console.error(`[docToStoredApplication] CRITICAL: Invalid or missing 'submissionDate' for doc ${docId}. Application cannot be processed.`);
    return null;
  }
  
  if (!data.applicantType || !data.employeeName || !data.designation || !data.status) {
      console.error(`[docToStoredApplication] CRITICAL: Missing one or more required fields (applicantType, employeeName, designation, status) for doc ${docId}. Application cannot be processed.`);
      return null;
  }

  const appData: StoredApplication = {
    applicationId: docId,
    applicantType: data.applicantType,
    employeeName: data.employeeName,
    designation: data.designation,
    employeeNo: data.employeeNo,
    ruidNo: data.ruidNo,
    dateOfBirth: dateOfBirth, 
    department: data.department,
    station: data.station,
    billUnit: data.billUnit,
    residentialAddress: data.residentialAddress,
    rlyContactNumber: data.rlyContactNumber,
    mobileNumber: data.mobileNumber,
    reasonForApplication: data.reasonForApplication,
    familyMembers,
    emergencyContactName: data.emergencyContactName,
    emergencyContactNumber: data.emergencyContactNumber,
    submissionDate: submissionDate, 
    status: data.status as ApplicationStatus,
    uploadPhotoUrl: data.uploadPhotoUrl,
    uploadSignatureUrl: data.uploadSignatureUrl,
    uploadHindiNameUrl: data.uploadHindiNameUrl,
    uploadHindiDesignationUrl: data.uploadHindiDesignationUrl,
  };
  
  // Optional: Validate the constructed object against a Zod schema if you have one for StoredApplication
  // This can help catch inconsistencies between Firestore data and expected structure.
  // For example:
  // const storedAppSchema = z.object({ /* define StoredApplication schema here */ });
  // const validation = storedAppSchema.safeParse(appData);
  // if (!validation.success) {
  //   console.error(`[docToStoredApplication] Constructed appData for doc ${docId} failed Zod validation:`, validation.error.flatten());
  //   return null;
  // }

  return appData; // or validation.data if using Zod validation
}

export async function submitApplication(formData: FormData) {
  console.log('[SUBMIT_ACTION] Server action invoked.');
  const dataToValidate: Record<string, any> = {
    familyMembers: [] 
  };

  try {
    formData.forEach((value, key) => {
      if (key === 'familyMembers') {
        try {
          const member = JSON.parse(value as string);
          dataToValidate.familyMembers.push(member);
        } catch (e) {
          console.error(`[SUBMIT_ACTION] Error parsing family member JSON for key ${key}:`, value, e);
        }
      } else if (value instanceof File) {
        dataToValidate[key] = { name: value.name, type: value.type, size: value.size };
      } else if (key === 'dateOfBirth') { 
        dataToValidate[key] = value as string; 
      } else {
        dataToValidate[key] = value === 'undefined' ? undefined : value;
      }
    });
    
    if (!dataToValidate.applicantType) {
       dataToValidate.applicantType = formData.get('applicantType');
    }

    console.log('[SUBMIT_ACTION] Data prepared for Zod validation:', JSON.stringify(dataToValidate, null, 2));

    const validationResult = serverApplicationProcessingSchema.safeParse(dataToValidate);

    if (!validationResult.success) {
      console.error("[SUBMIT_ACTION] Server-side Zod validation failed.");
      const formattedErrors = validationResult.error.flatten();
      console.error("[SUBMIT_ACTION] Zod Errors (formatted):", JSON.stringify(formattedErrors, null, 2));
      return { success: false, errors: formattedErrors.fieldErrors as Record<string, string[] | undefined>, applicationId: null };
    }

    const validatedData = validationResult.data;
    console.log('[SUBMIT_ACTION] Zod validation successful. Validated data (dates should be Date objects):', {
        ...validatedData,
        dateOfBirth: validatedData.dateOfBirth.toISOString(),
        familyMembers: validatedData.familyMembers.map(fm => ({...fm, dob: fm.dob.toISOString()}))
    });


    const applicationId = generateApplicationId();
    const submissionTimestamp = Timestamp.fromDate(new Date());
    
    const mockFileBaseUrl = `https://storage.googleapis.com/YOUR_MOCK_BUCKET/uploads/${applicationId}/`; // Replace with actual bucket
    
    const applicationDataForFirestore: any = {
      ...validatedData,
      applicationId: applicationId,
      submissionDate: submissionTimestamp, // Already a Firestore Timestamp
      status: 'pending' as ApplicationStatus,
      dateOfBirth: Timestamp.fromDate(validatedData.dateOfBirth), // Convert Date to Firestore Timestamp
      familyMembers: (validatedData.familyMembers || []).map(fm => ({
        ...fm,
        id: fm.id || `fm_${Date.now()}_${Math.random().toString(36).substring(2,7)}`, // ensure ID
        dob: Timestamp.fromDate(fm.dob), // Convert Date to Firestore Timestamp
      })),
      uploadPhotoUrl: validatedData.uploadPhoto?.name ? `${mockFileBaseUrl}${encodeURIComponent(validatedData.uploadPhoto.name)}` : null,
      uploadSignatureUrl: validatedData.uploadSignature?.name ? `${mockFileBaseUrl}${encodeURIComponent(validatedData.uploadSignature.name)}` : null,
      uploadHindiNameUrl: validatedData.uploadHindiName?.name ? `${mockFileBaseUrl}${encodeURIComponent(validatedData.uploadHindiName.name)}` : null,
      uploadHindiDesignationUrl: validatedData.uploadHindiDesignation?.name ? `${mockFileBaseUrl}${encodeURIComponent(validatedData.uploadHindiDesignation.name)}` : null,
    };
    
    delete applicationDataForFirestore.uploadPhoto;
    delete applicationDataForFirestore.uploadSignature;
    delete applicationDataForFirestore.uploadHindiName;
    delete applicationDataForFirestore.uploadHindiDesignation;
    
    Object.keys(applicationDataForFirestore).forEach(key => {
      if (applicationDataForFirestore[key] === undefined) {
        applicationDataForFirestore[key] = null; 
      }
    });
    
    console.log('[SUBMIT_ACTION] Data prepared for Firestore:', JSON.stringify(applicationDataForFirestore, (key, value) => {
        if (value instanceof Timestamp) return `Timestamp(s:${value.seconds},ns:${value.nanoseconds})`;
        return value;
    }, 2));
        
    const appDocRef = doc(applicationsCollectionRef, applicationId);
    await setDoc(appDocRef, applicationDataForFirestore);
    console.log('[SUBMIT_ACTION] Application submitted to Firestore successfully:', applicationId);

    revalidatePath('/admin/dashboard');
    revalidatePath('/'); 
    revalidatePath('/status');
    console.log('[SUBMIT_ACTION] Revalidation paths triggered.');

    return { success: true, errors: null, applicationId: applicationId };

  } catch (error: any) {
    console.error("[SUBMIT_ACTION] CRITICAL ERROR in submitApplication:", error.name, error.message, error.stack);
    
    let clientErrorObject: Record<string, string[]> = { _form: ["An unexpected server error occurred. Please try again later."] };
    if (error instanceof z.ZodError) { 
        clientErrorObject = error.flatten().fieldErrors as Record<string, string[] | undefined>;
        if (Object.keys(clientErrorObject).length === 0 && error.flatten().formErrors.length > 0){
            clientErrorObject['_form'] = error.flatten().formErrors;
        }
    } else if (typeof error.message === 'string') {
        clientErrorObject._form = [error.message];
    }
    
    return { success: false, errors: clientErrorObject, applicationId: null };
  }
}


export async function getAllApplications(): Promise<StoredApplication[]> {
  console.log('[GET_ALL_APPLICATIONS] Fetching all applications for admin dashboard.');
  try {
    const q = query(applicationsCollectionRef, orderBy('submissionDate', 'desc'));
    const querySnapshot = await getDocs(q);
    console.log(`[GET_ALL_APPLICATIONS] Found ${querySnapshot.docs.length} documents in Firestore.`);
    
    const applications: StoredApplication[] = [];
    querySnapshot.forEach((docSnap) => {
      console.log(`[GET_ALL_APPLICATIONS] Processing document ID: ${docSnap.id}`);
      const appData = docToStoredApplication(docSnap);
      if (appData) {
        applications.push(appData);
        console.log(`[GET_ALL_APPLICATIONS] Successfully processed document ID: ${docSnap.id}`);
      } else {
        console.warn(`[GET_ALL_APPLICATIONS] Failed to process document ID: ${docSnap.id}. It will be excluded from the list.`);
      }
    });
    
    console.log(`[GET_ALL_APPLICATIONS] Returning ${applications.length} processed applications.`);
    return applications;
  } catch (error: any) {
    console.error('[GET_ALL_APPLICATIONS] Error fetching all applications:', error.message, error.stack);
    return []; // Return empty array on error
  }
}

export async function getApplicationById(applicationId: string): Promise<StoredApplication | null> {
  console.log(`[GET_APPLICATION_BY_ID] Fetching application by ID: ${applicationId}`);
  try {
    const appDocRef = doc(applicationsCollectionRef, applicationId);
    const docSnap = await getDoc(appDocRef);
    if (docSnap.exists()) {
      console.log(`[GET_APPLICATION_BY_ID] Document found for ID: ${applicationId}`);
      const appData = docToStoredApplication(docSnap);
      if (appData) {
        console.log(`[GET_APPLICATION_BY_ID] Successfully processed document ID: ${applicationId}`);
        return appData;
      } else {
        console.warn(`[GET_APPLICATION_BY_ID] Failed to process document ID: ${applicationId}, though it exists.`);
        return null;
      }
    }
    console.log(`[GET_APPLICATION_BY_ID] No document found for ID: ${applicationId}`);
    return null;
  } catch (error: any) {
    console.error(`[GET_APPLICATION_BY_ID] Error fetching application ${applicationId}:`, error.message, error.stack);
    return null;
  }
}


export async function updateApplicationStatus(
  applicationId: string,
  newStatus: ApplicationStatus
): Promise<{ success: boolean; message: string }> {
  console.log(`[UPDATE_APP_STATUS] Updating status for App ID: ${applicationId} to ${newStatus}`);
  try {
    const appDocRef = doc(applicationsCollectionRef, applicationId);
    await updateDoc(appDocRef, { status: newStatus });
    console.log(`[UPDATE_APP_STATUS] Status updated successfully for App ID: ${applicationId}`);
    revalidatePath('/admin/dashboard');
    revalidatePath(`/admin/dashboard/applications/${applicationId}`);
    revalidatePath('/status');
    console.log('[UPDATE_APP_STATUS] Revalidation paths triggered.');
    return { success: true, message: `Application status updated to ${newStatus} successfully.` };
  } catch (error: any) {
    console.error(`[UPDATE_APP_STATUS] Error updating status for ${applicationId}:`, error.message, error.stack);
    return { success: false, message: `Failed to update status. ${error.message}` };
  }
}

export async function getApplicationStatus(applicationId: string, dateOfBirthString: string): Promise<{ success: boolean; message: string; status?: ApplicationStatus | null; applicantName?: string | null; submissionDate?: string | null; }> {
  console.log(`[GET_APP_STATUS] Checking App ID: ${applicationId}, DOB (string from client): ${dateOfBirthString}`);
  try {
    let normalizedInputDOB: string;
    try {
      const parsedInputDOB = parseISO(dateOfBirthString); 
      if (!isValid(parsedInputDOB)) {
        console.warn(`[GET_APP_STATUS] Invalid dateOfBirth string format provided: "${dateOfBirthString}"`);
        throw new Error('Invalid dateOfBirth string format provided for status check.');
      }
      normalizedInputDOB = format(parsedInputDOB, "yyyy-MM-dd");
      console.log(`[GET_APP_STATUS] Normalized input DOB: ${normalizedInputDOB}`);
    } catch (e: any) {
      console.error(`[GET_APP_STATUS] Error parsing input DOB "${dateOfBirthString}": ${e.message}`);
      return { success: false, message: "Invalid Date of Birth format provided." };
    }

    const appData = await getApplicationById(applicationId);

    if (!appData) {
      // getApplicationById logs "No document found" or "Failed to process"
      return { success: false, message: "Application ID not found or data is invalid." };
    }
    
    // appData.dateOfBirth is already a Date object from docToStoredApplication
    if (!(appData.dateOfBirth instanceof Date) || !isValid(appData.dateOfBirth)) {
        console.error(`[GET_APP_STATUS] Retrieved application data for ${applicationId} has an invalid DOB type or value. DOB:`, appData.dateOfBirth);
        return { success: false, message: "Error retrieving application details: invalid date format in record." };
    }
    
    const normalizedStoredDOB = format(appData.dateOfBirth, "yyyy-MM-dd");
    console.log(`[GET_APP_STATUS] Normalized stored DOB for App ID ${applicationId}: ${normalizedStoredDOB}`);

    if (normalizedStoredDOB !== normalizedInputDOB) {
      console.log(`[GET_APP_STATUS] DOB mismatch for App ID ${applicationId}. Input: ${normalizedInputDOB}, Stored: ${normalizedStoredDOB}`);
      return { success: false, message: "Application ID and Date of Birth do not match." };
    }

    console.log(`[GET_APP_STATUS] Status for App ID ${applicationId}: ${appData.status}`);
    return {
      success: true,
      message: "Status retrieved successfully.",
      status: appData.status,
      applicantName: appData.employeeName,
      submissionDate: appData.submissionDate && isValid(appData.submissionDate) ? format(appData.submissionDate, 'dd MMM yyyy, p') : 'N/A'
    };

  } catch (error: any) {
    console.error(`[GET_APP_STATUS] CRITICAL Error for App ID ${applicationId}:`, error.message, error.stack);
    return { success: false, message: `An critical error occurred: ${error.message}` };
  }
}

    
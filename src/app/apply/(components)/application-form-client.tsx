
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { 
  BaseApplicationSchema, 
  DepartmentEnum, 
  BillUnitEnum,
  MAX_FILE_SIZE_PROFILE_DOCS,
  ACCEPTED_IMAGE_TYPES_PROFILE,
  type NewFamilyMember // Import for defaultValues type
} from '@/lib/types';
import { submitApplication } from '@/lib/actions/application';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ApplicationFormFields } from './application-form-fields';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

interface ApplicationFormClientProps {
  applicantType: 'gazetted' | 'non-gazetted';
}

// Define client-specific file schema locally
const clientFileSchema = (isRequired = true) => {
  const base = z.instanceof(FileList)
    .refine((files) => files?.length > 0, "File is required.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE_PROFILE_DOCS, `Max file size is 2MB.`)
    .refine(
      (files) => ACCEPTED_IMAGE_TYPES_PROFILE.includes(files?.[0]?.type),
      `Unsupported file type. Accepted: JPG, JPEG, PNG.`
    );
  return isRequired ? base : base.optional().or(z.literal(null)).or(z.literal(undefined));
};

// Define the complete client-side Zod schema for the form
export const ClientApplicationFormSchema = BaseApplicationSchema.extend({
  uploadPhoto: clientFileSchema(true),
  uploadSignature: clientFileSchema(true),
  uploadHindiName: clientFileSchema(false), // Optional, refined below
  uploadHindiDesignation: clientFileSchema(false), // Optional, refined below
}).superRefine((data, ctx) => {
  if (data.applicantType === 'non-gazetted') {
    if (!data.employeeNo || data.employeeNo.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['employeeNo'],
        message: 'Employee No is required for Non-Gazetted applicants.',
      });
    }
  } else if (data.applicantType === 'gazetted') {
    if (!data.ruidNo || data.ruidNo.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ruidNo'],
        message: 'RUID No is required for Gazetted applicants.',
      });
    }
    // Conditionally require Hindi uploads for Gazetted
    if (!(data.uploadHindiName instanceof FileList && data.uploadHindiName.length > 0)) {
       ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['uploadHindiName'],
        message: 'Upload Hindi Name is required for Gazetted applicants.',
      });
    }
    if (!(data.uploadHindiDesignation instanceof FileList && data.uploadHindiDesignation.length > 0)) {
       ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['uploadHindiDesignation'],
        message: 'Upload Hindi Designation is required for Gazetted applicants.',
      });
    }
  }
});

export type ClientApplicationFormData = z.infer<typeof ClientApplicationFormSchema>;

export function ApplicationFormClient({ applicantType }: ApplicationFormClientProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ClientApplicationFormData>({
    resolver: zodResolver(ClientApplicationFormSchema),
    defaultValues: {
      applicantType: applicantType,
      // Employee Details
      employeeName: '',
      designation: '',
      employeeNo: applicantType === 'non-gazetted' ? '' : undefined,
      ruidNo: applicantType === 'gazetted' ? '' : undefined,
      dateOfBirth: undefined, // User will pick
      department: undefined, // Will be set by Select
      station: 'BHUBANESWAR',
      billUnit: undefined, // Will be set by Select
      residentialAddress: '',
      rlyContactNumber: '',
      mobileNumber: '',
      reasonForApplication: '',
      
      // Family Members: DOB needs to be undefined or Date. Explicitly cast if needed.
      familyMembers: [{ name: '', bloodGroup: '', relationship: 'SELF', dob: undefined as unknown as Date, identificationMarks: '' }],
      
      // Additional Details
      emergencyContactName: '',
      emergencyContactNumber: '',
      
      // File Uploads - react-hook-form will handle FileList
      uploadPhoto: undefined,
      uploadSignature: undefined,
      uploadHindiName: applicantType === 'gazetted' ? undefined : null, 
      uploadHindiDesignation: applicantType === 'gazetted' ? undefined : null,
    },
  });

  async function onSubmit(data: ClientApplicationFormData) {
    setIsSubmitting(true);
    const formData = new FormData();
    
    // Map ClientApplicationFormData to FormData
    (Object.keys(data) as Array<keyof ClientApplicationFormData>).forEach((key) => {
      const value = data[key];
      if (key === 'familyMembers' && Array.isArray(value)) {
        const validFamilyMembers = value
          .map(member => ({
            ...member,
            // Ensure dob is valid Date before formatting, send as YYYY-MM-DD string
            dob: member.dob && isValid(member.dob) ? format(member.dob, 'yyyy-MM-dd') : null 
          }))
          .filter(member => member.name && member.relationship && member.dob); 
        
        validFamilyMembers.forEach(member => formData.append('familyMembers', JSON.stringify(member)));

      } else if (value instanceof FileList && value.length > 0) {
        formData.append(key, value[0]);
      } else if (value instanceof Date) {
        formData.append(key, value.toISOString()); // Main dateOfBirth
      } else if (value !== undefined && value !== null && typeof value !== 'object') {
        formData.append(key, String(value));
      } else if ((key === 'department' || key === 'billUnit') && value) { // For enum values
         formData.append(key, String(value));
      }
    });
    
    formData.set('applicantType', applicantType); // Ensure applicantType is explicitly set

    try {
      const result = await submitApplication(formData);
      if (result.success && result.applicationId) {
        toast({
          title: 'Application Submitted Successfully!',
          description: `Your Application ID is ${result.applicationId}. Please save it for future reference.`,
          variant: 'default',
          duration: 10000,
        });
        form.reset({ 
            applicantType: applicantType,
            employeeName: '',
            designation: '',
            employeeNo: applicantType === 'non-gazetted' ? '' : undefined,
            ruidNo: applicantType === 'gazetted' ? '' : undefined,
            dateOfBirth: undefined,
            department: undefined,
            station: 'BHUBANESWAR',
            billUnit: undefined,
            residentialAddress: '',
            rlyContactNumber: '',
            mobileNumber: '',
            reasonForApplication: '',
            familyMembers: [{ name: '', bloodGroup: '', relationship: 'SELF', dob: undefined as unknown as Date, identificationMarks: '' }],
            emergencyContactName: '',
            emergencyContactNumber: '',
            uploadPhoto: undefined,
            uploadSignature: undefined,
            uploadHindiName: applicantType === 'gazetted' ? undefined : null,
            uploadHindiDesignation: applicantType === 'gazetted' ? undefined : null,
        });
        // Ensure data.dateOfBirth is valid before using it for routing
        const dobForQuery = data.dateOfBirth && isValid(data.dateOfBirth) ? format(data.dateOfBirth, "yyyy-MM-dd") : '';
        router.push(`/status?appId=${result.applicationId}&dob=${dobForQuery}`);
      } else {
        toast({
          title: 'Error Submitting Application',
          description: result.errors ? Object.values(result.errors).flat().join('\n') : 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
          duration: 10000,
        });
         if (result.errors) {
          (Object.keys(result.errors) as Array<keyof ClientApplicationFormData>).forEach(key => {
            const fieldErrors = result.errors![key];
            if (fieldErrors) {
              form.setError(key, { type: 'server', message: fieldErrors.join(', ') });
            }
          });
        }
      }
    } catch (error) {
      console.error("Submission error (client-side catch):", error);
      toast({
        title: 'Submission Failed',
        description: 'An unexpected error occurred on the client. Please try again later.',
        variant: 'destructive',
        duration: 10000,
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const handleClear = () => {
     form.reset({
        applicantType: applicantType,
        employeeName: '',
        designation: '',
        employeeNo: applicantType === 'non-gazetted' ? '' : undefined,
        ruidNo: applicantType === 'gazetted' ? '' : undefined,
        dateOfBirth: undefined,
        department: undefined,
        station: 'BHUBANESWAR',
        billUnit: undefined,
        residentialAddress: '',
        rlyContactNumber: '',
        mobileNumber: '',
        reasonForApplication: '',
        familyMembers: [{ name: '', bloodGroup: '', relationship: 'SELF', dob: undefined as unknown as Date, identificationMarks: '' }],
        emergencyContactName: '',
        emergencyContactNumber: '',
        uploadPhoto: undefined,
        uploadSignature: undefined,
        uploadHindiName: applicantType === 'gazetted' ? undefined : null,
        uploadHindiDesignation: applicantType === 'gazetted' ? undefined : null,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <ApplicationFormFields form={form} applicantType={applicantType} />
        <div className="flex justify-end pt-6 border-t space-x-3">
          <Button type="button" variant="outline" size="lg" onClick={handleClear} disabled={isSubmitting} className="min-w-[150px] bg-blue-500 text-white hover:bg-blue-600 border-blue-500 hover:border-blue-600">
            CLEAR
          </Button>
          <Button type="submit" size="lg" disabled={isSubmitting} className="min-w-[150px] bg-blue-500 text-white hover:bg-blue-600">
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'SUBMIT'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}


'use server';

import {
  getEmployeesService, // Correctly import getEmployeesService
  getEmployeeService,  // Correctly import getEmployeeService
  updateEmployeeApplicationStatus as updateEmployeeStatusService,
} from '@/lib/new_admin_backend/services';
import type { StoredEmployee, InputEmployeeData } from '@/lib/new_admin_backend/types';
import { Timestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';

// Helper function to convert StoredEmployee Timestamps to Dates for client-side
const convertEmployeeTimestamps = (employee: StoredEmployee): StoredEmployee => {
  return {
    ...employee,
    // Ensure that dob, applicationDate, createdAt, and updatedAt are Dates.
    // Firestore Timestamps are converted by the service layer before they get here,
    // but if they are already dates, this won't hurt.
    // The service layer for new_admin_backend should return StoredEmployee with Timestamps.
    // This action layer is responsible for converting them to Date for client components.
    dob: employee.dob instanceof Timestamp ? employee.dob.toDate() : employee.dob,
    applicationDate: employee.applicationDate instanceof Timestamp ? employee.applicationDate.toDate() : employee.applicationDate,
    createdAt: employee.createdAt instanceof Timestamp ? employee.createdAt.toDate() : employee.createdAt,
    updatedAt: employee.updatedAt instanceof Timestamp ? employee.updatedAt.toDate() : employee.updatedAt,
    familyMembers: (employee.familyMembers || []).map(fm => ({
      ...fm,
      dob: fm.dob instanceof Timestamp ? fm.dob.toDate() : fm.dob,
    })),
  };
};


export async function getAllEmployeesAction(): Promise<StoredEmployee[]> {
  console.log('[GET_ALL_EMPLOYEES_ACTION] Fetching all employees for admin dashboard.');
  try {
    // The service function getEmployeesService already handles Firestore interaction.
    // It returns StoredEmployee which might have Firestore Timestamps.
    const { employees: employeesFromService } = await getEmployeesService({}, null, 100); // Fetch up to 100 for now
    console.log(`[GET_ALL_EMPLOYEES_ACTION] Found ${employeesFromService.length} employee documents from service.`);
    
    // Convert Timestamps to Dates for each employee before sending to client.
    return employeesFromService.map(convertEmployeeTimestamps);
  } catch (error: any) {
    console.error('[GET_ALL_EMPLOYEES_ACTION] Error fetching all employees:', error.message, error.stack);
    return [];
  }
}

export async function getEmployeeByIdAction(employeeId: string): Promise<StoredEmployee | null> {
  console.log(`[GET_EMPLOYEE_BY_ID_ACTION] Fetching employee by ID: ${employeeId}`);
  try {
    const employeeFromService = await getEmployeeService(employeeId);
    if (employeeFromService) {
      console.log(`[GET_EMPLOYEE_BY_ID_ACTION] Successfully processed employee ID: ${employeeId}`);
      // Convert Timestamps to Dates before sending to client.
      return convertEmployeeTimestamps(employeeFromService);
    }
    console.log(`[GET_EMPLOYEE_BY_ID_ACTION] No employee found for ID: ${employeeId}`);
    return null;
  } catch (error: any) {
    console.error(`[GET_EMPLOYEE_BY_ID_ACTION] Error fetching employee ${employeeId}:`, error.message, error.stack);
    return null;
  }
}

export async function updateEmployeeStatusAction(
  employeeId: string,
  newStatus: StoredEmployee['status']
): Promise<{ success: boolean; message: string }> {
  console.log(`[UPDATE_EMPLOYEE_STATUS_ACTION] Updating status for Employee ID: ${employeeId} to ${newStatus}`);
  try {
    // The service function already handles the Firestore update.
    await updateEmployeeStatusService(employeeId, newStatus);
    console.log(`[UPDATE_EMPLOYEE_STATUS_ACTION] Status updated successfully for Employee ID: ${employeeId}`);
    revalidatePath('/admin/dashboard');
    revalidatePath(`/admin/dashboard/employee/${employeeId}`);
    return { success: true, message: `Employee status updated to ${newStatus} successfully.` };
  } catch (error: any) {
    console.error(`[UPDATE_EMPLOYEE_STATUS_ACTION] Error updating status for ${employeeId}:`, error.message, error.stack);
    return { success: false, message: `Failed to update status. ${error.message}` };
  }
}

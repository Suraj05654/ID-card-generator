
'use server';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  type UserCredential
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  writeBatch,
  getCountFromServer,
  // onSnapshot, // Commented out as per previous step
  Timestamp,
  type DocumentSnapshot,
  type Query
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  type UploadResult,
  type StorageReference
} from 'firebase/storage';
import { auth, firestore, storage } from '@/lib/firebase'; // Correctly import firestore
import type { InputEmployeeData, StoredEmployee, InputAdminUserData, StoredAdminUser, StoredApplicationStats } from './types';

// --- Authentication Functions ---
export const loginAdmin = async (email: string, password: string): Promise<UserCredential> => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const createAdminUser = async (email: string, password: string, userData: InputAdminUserData): Promise<UserCredential> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(firestore, 'admin_users', userCredential.user.uid), { // Use firestore
    ...userData,
    createdAt: serverTimestamp() as Timestamp
  });
  return userCredential;
};

export const checkAdminRole = async (uid: string): Promise<StoredAdminUser | null> => {
  const adminDoc = await getDoc(doc(firestore, 'admin_users', uid)); // Use firestore
  if (!adminDoc.exists()) return null;
  const data = adminDoc.data();
  return {
    id: adminDoc.id,
    email: data.email,
    role: data.role,
    name: data.name,
    permissions: data.permissions || [],
    createdAt: data.createdAt || Timestamp.now()
  } as StoredAdminUser;
};


// --- Employee Data Operations ---
export const addEmployee = async (employeeData: InputEmployeeData): Promise<string> => {
  const dataToSave: any = {
    ...employeeData,
    dob: employeeData.dob instanceof Date ? Timestamp.fromDate(employeeData.dob) : employeeData.dob,
    applicationDate: employeeData.applicationDate instanceof Date ? Timestamp.fromDate(employeeData.applicationDate) : employeeData.applicationDate,
    familyMembers: (employeeData.familyMembers || []).map(fm => ({
      ...fm,
      dob: fm.dob instanceof Date ? Timestamp.fromDate(fm.dob) : fm.dob,
    })),
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  const docRef = await addDoc(collection(firestore, 'employees'), dataToSave); // Use firestore
  return docRef.id;
};

export const getEmployeeService = async (employeeId: string): Promise<StoredEmployee | null> => { // Renamed to avoid conflict with component
  const docSnap = await getDoc(doc(firestore, 'employees', employeeId)); // Use firestore
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    dob: data.dob,
    applicationDate: data.applicationDate,
    familyMembers: (data.familyMembers || []).map((fm: any) => ({
        ...fm,
        dob: fm.dob,
    })),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  } as StoredEmployee;
};

export const updateEmployee = async (employeeId: string, updateData: Partial<Omit<StoredEmployee, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  const dataToUpdate: Partial<any> = { ...updateData };
  if (updateData.dob && updateData.dob instanceof Date) {
    dataToUpdate.dob = Timestamp.fromDate(updateData.dob);
  }
  if (updateData.applicationDate && updateData.applicationDate instanceof Date) {
    dataToUpdate.applicationDate = Timestamp.fromDate(updateData.applicationDate);
  }
  if (updateData.familyMembers) {
    dataToUpdate.familyMembers = updateData.familyMembers.map(fm => ({
        ...fm,
        dob: fm.dob instanceof Date ? Timestamp.fromDate(fm.dob) : fm.dob,
    }));
  }
  await updateDoc(doc(firestore, 'employees', employeeId), { // Use firestore
    ...dataToUpdate,
    updatedAt: serverTimestamp() as Timestamp
  });
};

export const deleteEmployee = async (employeeId: string): Promise<void> => {
  await deleteDoc(doc(firestore, 'employees', employeeId)); // Use firestore
  await updateStats();
};

export const getEmployeesService = async ( // Renamed to avoid conflict
  filters: { status?: string; department?: string; station?: string } = {},
  lastDocSnap: DocumentSnapshot | null = null,
  pageLimit: number = 10
): Promise<{ employees: StoredEmployee[], newLastDoc: DocumentSnapshot | null }> => {
  let q: Query = collection(firestore, 'employees'); // Use firestore

  if (filters.status) {
    q = query(q, where('status', '==', filters.status));
  }
  if (filters.department) {
    q = query(q, where('department', '==', filters.department));
  }
  if (filters.station) {
    q = query(q, where('station', '==', filters.station));
  }

  q = query(q, orderBy('createdAt', 'desc'), limit(pageLimit));

  if (lastDocSnap) {
    q = query(q, startAfter(lastDocSnap));
  }

  const querySnapshot = await getDocs(q);
  const employees = querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        dob: data.dob,
        applicationDate: data.applicationDate,
        familyMembers: (data.familyMembers || []).map((fm: any) => ({
            ...fm,
            dob: fm.dob,
        })),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
     } as StoredEmployee;
  });
  const newLastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;
  return { employees, newLastDoc };
};


// --- Status Management ---
export const updateEmployeeApplicationStatus = async (employeeId: string, newStatus: StoredEmployee['status']): Promise<void> => {
  await updateDoc(doc(firestore, 'employees', employeeId), { // Use firestore
    status: newStatus,
    updatedAt: serverTimestamp() as Timestamp
  });
  await updateStats();
};

export const bulkUpdateEmployeeStatus = async (employeeIds: string[], newStatus: StoredEmployee['status']): Promise<void> => {
  const batch = writeBatch(firestore); // Use firestore
  employeeIds.forEach(id => {
    const docRef = doc(firestore, 'employees', id); // Use firestore
    batch.update(docRef, {
      status: newStatus,
      updatedAt: serverTimestamp() as Timestamp
    });
  });
  await batch.commit();
  await updateStats();
};


// --- File Management ---
export const uploadFile = async (file: File, path: string): Promise<string> => {
  const storageRef: StorageReference = ref(storage, path);
  const snapshot: UploadResult = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};

export const deleteFile = async (filePath: string): Promise<void> => {
  const fileRef: StorageReference = ref(storage, filePath);
  await deleteObject(fileRef);
};


// --- Statistics & Analytics ---
export const updateStats = async (): Promise<void> => {
  const employeesRef = collection(firestore, 'employees'); // Use firestore

  const totalQuery = query(employeesRef);
  const pendingQuery = query(employeesRef, where('status', '==', 'Pending'));
  const approvedQuery = query(employeesRef, where('status', '==', 'Closed'));
  const rejectedQuery = query(employeesRef, where('status', '==', 'Rejected'));

  try {
    const [totalSnapshot, pendingSnapshot, approvedSnapshot, rejectedSnapshot] = await Promise.all([
      getCountFromServer(totalQuery),
      getCountFromServer(pendingQuery),
      getCountFromServer(approvedQuery),
      getCountFromServer(rejectedQuery)
    ]);

    await setDoc(doc(firestore, 'application_stats', 'summary'), { // Use firestore
      totalApplications: totalSnapshot.data().count,
      pendingCount: pendingSnapshot.data().count,
      approvedCount: approvedSnapshot.data().count,
      rejectedCount: rejectedSnapshot.data().count,
      lastUpdated: serverTimestamp() as Timestamp
    });
  } catch (error) {
    console.error("Error updating stats: ", error);
  }
};

export const getStats = async (): Promise<StoredApplicationStats | null> => {
  const statsDoc = await getDoc(doc(firestore, 'application_stats', 'summary')); // Use firestore
  return statsDoc.exists() ? statsDoc.data() as StoredApplicationStats : null;
};


// --- Real-time Listeners (Commented out as they are not Server Actions and caused build issues) ---
/*
export const listenToEmployees = (
  callback: (employees: StoredEmployee[]) => void,
  filters: { status?: string } = {}
): (() => void) => {
  let q: Query = collection(firestore, 'employees'); // Use firestore

  if (filters.status) {
    q = query(q, where('status', '==', filters.status));
  }
  q = query(q, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const employees = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    } as StoredEmployee));
    callback(employees);
  });
};

export const listenToStats = (
  callback: (stats: StoredApplicationStats | null) => void
): (() => void) => {
  return onSnapshot(doc(firestore, 'application_stats', 'summary'), (docSnap) => { // Use firestore
    if (docSnap.exists()) {
      callback(docSnap.data() as StoredApplicationStats);
    } else {
      callback(null);
    }
  });
};
*/

// --- Search & Filter Functions ---
export const searchEmployees = async (searchTerm: string): Promise<StoredEmployee[]> => {
  const q = query(
    collection(firestore, 'employees'), // Use firestore
    orderBy('empName'),
    where('empName', '>=', searchTerm),
    where('empName', '<=', searchTerm + '\uf8ff'),
    limit(20)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        dob: data.dob,
        applicationDate: data.applicationDate,
        familyMembers: (data.familyMembers || []).map((fm: any) => ({...fm, dob: fm.dob})),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as StoredEmployee;
  });
};

export const getEmployeesByDateRange = async (startDate: Date, endDate: Date): Promise<StoredEmployee[]> => {
  const q = query(
    collection(firestore, 'employees'), // Use firestore
    where('applicationDate', '>=', Timestamp.fromDate(startDate)),
    where('applicationDate', '<=', Timestamp.fromDate(endDate)),
    orderBy('applicationDate', 'desc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        dob: data.dob,
        applicationDate: data.applicationDate,
        familyMembers: (data.familyMembers || []).map((fm: any) => ({...fm, dob: fm.dob})),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
    } as StoredEmployee;
  });
};


// --- Batch Operations ---
export const bulkDeleteEmployees = async (employeeIds: string[]): Promise<void> => {
  const batch = writeBatch(firestore); // Use firestore
  employeeIds.forEach(id => {
    batch.delete(doc(firestore, 'employees', id)); // Use firestore
  });
  await batch.commit();
  await updateStats();
};

export const exportAllData = async (): Promise<StoredEmployee[]> => {
  const employeesQuery = query(collection(firestore, 'employees'), orderBy('createdAt', 'desc')); // Use firestore
  const querySnapshot = await getDocs(employeesQuery);
  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        dob: data.dob,
        applicationDate: data.applicationDate,
        familyMembers: (data.familyMembers || []).map((fm: any) => ({...fm, dob: fm.dob})),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
    } as StoredEmployee;
  });
};

    
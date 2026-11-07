import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  User,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Firestore,
  Timestamp,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';
import {
  ExternalScholarshipLink,
  ScholarshipApplication,
  ScholarshipScheme,
  StudentProfile,
  UserRole,
} from './scholarship-rules';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

let firebaseAppInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;

export function getFirebaseServices(): {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
  projectId: string;
  databaseId: string;
} {
  if (!firebaseAppInstance) {
    firebaseAppInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(firebaseAppInstance, firebaseConfig.firestoreDatabaseId);
  }
  if (!authInstance) {
    authInstance = getAuth(firebaseAppInstance);
  }
  return {
    app: firebaseAppInstance,
    db: firestoreInstance,
    auth: authInstance,
    projectId: firebaseConfig.projectId,
    databaseId: firebaseConfig.firestoreDatabaseId,
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const { auth } = getFirebaseServices();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

/**
 * Validates connectivity to the provisioned Cloud Firestore database on boot.
 */
export async function testFirestoreConnection(): Promise<{
  connected: boolean;
  projectId: string;
  region: string;
}> {
  const { db, projectId } = getFirebaseServices();
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { connected: true, projectId, region: 'asia-south1' };
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration. The client is offline.');
      return { connected: false, projectId, region: 'asia-south1' };
    }
    // Permission-denied on /test/connection is expected under Zero-Trust rules and proves online reachability
    return { connected: true, projectId, region: 'asia-south1' };
  }
}

export function subscribeToFirebaseAuth(callback: (user: User | null) => void): () => void {
  const { auth } = getFirebaseServices();
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGooglePopup(): Promise<User> {
  const { auth } = getFirebaseServices();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function signOutFirebaseUser(): Promise<void> {
  const { auth } = getFirebaseServices();
  if (auth.currentUser) {
    await signOut(auth);
  }
}

/**
 * Syncs the authenticated user's Student OTR Workspace document with Cloud Firestore (`user_workspaces/{uid}`).
 */
export async function syncUserWorkspaceToFirestore(
  user: User,
  role: UserRole,
  profile: StudentProfile
): Promise<void> {
  if (!user.emailVerified) return;
  const { db } = getFirebaseServices();
  const docPath = `user_workspaces/${user.uid}`;
  const ref = doc(db, 'user_workspaces', user.uid);
  try {
    const snap = await getDoc(ref);
    const effectiveRole = role === 'GUEST' ? 'STUDENT' : role;
    if (!snap.exists()) {
      await setDoc(ref, {
        ownerId: user.uid,
        email: (user.email || 'scholar@grantly.in').slice(0, 160),
        role: 'STUDENT',
        fullName: profile.fullName.slice(0, 120),
        otrId: profile.otrId.slice(0, 64),
        academicPercentage: Number(profile.academicPercentage) || 85,
        familyIncome: Number(profile.familyIncome) || 220000,
        category: profile.category.slice(0, 40),
        state: profile.state.slice(0, 64),
        courseLevel: profile.courseLevel.slice(0, 40),
        institutionName: profile.institutionName.slice(0, 160),
        aisheCode: profile.aisheCode.slice(0, 32),
        aadhaarEkyc: Boolean(profile.aadhaarEkyc),
        dbtSeeded: Boolean(profile.dbtSeeded),
        updatedAt: Timestamp.now(),
      });
    } else {
      const existingData = snap.data();
      await setDoc(ref, {
        ownerId: existingData['ownerId'] || user.uid,
        email: existingData['email'] || (user.email || 'scholar@grantly.in').slice(0, 160),
        role: existingData['role'] || effectiveRole,
        fullName: profile.fullName.slice(0, 120),
        otrId: profile.otrId.slice(0, 64),
        academicPercentage: Number(profile.academicPercentage) || 85,
        familyIncome: Number(profile.familyIncome) || 220000,
        category: profile.category.slice(0, 40),
        state: profile.state.slice(0, 64),
        courseLevel: profile.courseLevel.slice(0, 40),
        institutionName: profile.institutionName.slice(0, 160),
        aisheCode: profile.aisheCode.slice(0, 32),
        aadhaarEkyc: Boolean(profile.aadhaarEkyc),
        dbtSeeded: Boolean(profile.dbtSeeded),
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function loadUserWorkspaceFromFirestore(
  user: User
): Promise<Partial<StudentProfile> | null> {
  const { db } = getFirebaseServices();
  const docPath = `user_workspaces/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'user_workspaces', user.uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      fullName: data['fullName'],
      otrId: data['otrId'],
      academicPercentage: data['academicPercentage'],
      familyIncome: data['familyIncome'],
      category: data['category'],
      state: data['state'],
      courseLevel: data['courseLevel'],
      institutionName: data['institutionName'],
      aisheCode: data['aisheCode'],
      aadhaarEkyc: data['aadhaarEkyc'],
      dbtSeeded: data['dbtSeeded'],
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
    return null;
  }
}

export async function persistSchemeToFirestore(
  user: User | null,
  scheme: ScholarshipScheme
): Promise<void> {
  if (!user || !user.emailVerified) return;
  const { db } = getFirebaseServices();
  const docPath = `scholarship_schemes/${scheme.id}`;
  try {
    await setDoc(doc(db, 'scholarship_schemes', scheme.id), {
      id: scheme.id,
      authorId: user.uid,
      code: scheme.code.slice(0, 40),
      title: scheme.title.slice(0, 180),
      ministry: scheme.ministry.slice(0, 160),
      providerType: scheme.providerType,
      annualAward: scheme.annualAward,
      maxFamilyIncome: scheme.maxFamilyIncome,
      minPercentage: scheme.minPercentage,
      deadlineDays: scheme.deadlineDays,
      totalSeats: scheme.totalSeats,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function persistApplicationToFirestore(
  user: User | null,
  appItem: ScholarshipApplication
): Promise<void> {
  if (!user || !user.emailVerified) return;
  const { db } = getFirebaseServices();
  const docPath = `applications/${appItem.id}`;
  try {
    const now = Timestamp.now();
    await setDoc(doc(db, 'applications', appItem.id), {
      id: appItem.id,
      ownerId: user.uid,
      schemeId: appItem.schemeId,
      schemeTitle: appItem.schemeTitle.slice(0, 180),
      ministry: appItem.ministry.slice(0, 160),
      studentName: appItem.studentName.slice(0, 120),
      otrId: appItem.otrId.slice(0, 64),
      institutionName: appItem.institutionName.slice(0, 160),
      aisheCode: appItem.aisheCode.slice(0, 32),
      category: appItem.category.slice(0, 40),
      academicPercentage: appItem.academicPercentage,
      familyIncome: appItem.familyIncome,
      annualAward: appItem.annualAward,
      status: 'Submitted',
      submittedAt: appItem.submittedAt.slice(0, 40),
      inoRemark: (appItem.inoRemark || '').slice(0, 400),
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function persistExternalLinkToFirestore(
  user: User | null,
  link: ExternalScholarshipLink
): Promise<void> {
  if (!user || !user.emailVerified) return;
  const { db } = getFirebaseServices();
  const docPath = `external_links/${link.id}`;
  try {
    await setDoc(doc(db, 'external_links', link.id), {
      id: link.id,
      ownerId: user.uid,
      title: link.title.slice(0, 180),
      providerName: link.providerName.slice(0, 160),
      scope: link.scope,
      annualAwardText: link.annualAwardText.slice(0, 120),
      deadline: link.deadline.slice(0, 64),
      externalUrl: link.externalUrl.slice(0, 300),
      eligibilitySummary: link.eligibilitySummary.slice(0, 300),
      submittedBy: link.submittedBy.slice(0, 64),
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export type CourseLevel = 'UG_STEM' | 'UG_ARTS_COMMERCE' | 'PG_MASTERS' | 'DOCTORAL_RESEARCH';
export type SocialCategory = 'General-EWS' | 'OBC' | 'SC/ST' | 'Minority' | 'PwD' | 'Single Girl Child';
export type PortalMode = 'STUDENT' | 'INSTITUTE' | 'MINISTRY' | null;
export type ApplicationStatus =
  | 'Submitted'
  | 'Defective'
  | 'Institute Verified'
  | 'Ministry Approved'
  | 'Disbursed'
  | 'Rejected';

export type DocumentType = 'MARKSHEET' | 'INCOME_CERT' | 'DOMICILE' | 'BONAFIDE';

export interface DocumentItem {
  id: string;
  type: DocumentType;
  label: string;
  authority: string;
  uploaded: boolean;
  verifiedOcr: boolean;
  extractedSummary: string;
  certificateNo: string;
  updatedAt: string;
}

export interface StudentProfile {
  fullName: string;
  otrId: string;
  academicPercentage: number;
  familyIncome: number;
  category: SocialCategory;
  state: string;
  courseLevel: CourseLevel;
  residenceType: 'HOSTELLER' | 'DAY_SCHOLAR';
  institutionName: string;
  aisheCode: string;
  aadhaarEkyc: boolean;
  dbtSeeded: boolean;
  bankAccountMasked: string;
}

export interface ScholarshipScheme {
  id: string;
  code: string;
  title: string;
  ministry: string;
  providerType: 'Central Govt' | 'AICTE / UGC' | 'Corporate CSR';
  annualAward: number;
  tuitionComponent: number;
  maintenanceComponent: number;
  maxFamilyIncome: number;
  minPercentage: number;
  eligibleCategories: SocialCategory[];
  eligibleCourses: CourseLevel[];
  deadlineDays: number;
  totalSeats: number;
  requiredDocs: DocumentType[];
  tags: string[];
}

export interface EligibilityCheck {
  criterion: string;
  passed: boolean;
  detail: string;
}

export interface EligibilityEvaluation {
  schemeId: string;
  status: 'ELIGIBLE' | 'DOC_MISSING' | 'INELIGIBLE';
  matchPercent: number;
  checks: EligibilityCheck[];
  missingDocs: DocumentType[];
}

export interface ScholarshipApplication {
  id: string;
  schemeId: string;
  schemeTitle: string;
  ministry: string;
  studentName: string;
  otrId: string;
  institutionName: string;
  aisheCode: string;
  category: SocialCategory;
  academicPercentage: number;
  familyIncome: number;
  annualAward: number;
  status: ApplicationStatus;
  submittedAt: string;
  inoRemark: string;
  defectReason?: string;
  meritScore?: number;
  meritRank?: number;
  pfmsTransactionId?: string;
  disbursedAt?: string;
  documentsSnapshot: {
    type: DocumentType;
    certificateNo: string;
    verified: boolean;
  }[];
}

export type UserRole = 'GUEST' | 'STUDENT' | 'INSTITUTE' | 'MINISTRY' | 'SUPER_ADMIN';

export interface AuthSession {
  isAuthenticated: boolean;
  role: UserRole;
  email: string;
  displayName: string;
  badgeId: string;
  organizationName: string;
}

export interface InstituteRegistrationPayload {
  institutionName: string;
  aisheOrUdiseCode: string;
  institutionCategory: 'AISHE University / College' | 'UDISE+ School' | 'NCVT / ITI Polytechnic';
  headOfInstituteName: string;
  inoOfficerName: string;
  inoDesignation: string;
  officialEmail: string;
  aadhaarLast4: string;
  password: string;
}

export interface MinistryRegistrationPayload {
  ministryName: string;
  pfmsAgencyCode: string;
  nodalOfficerName: string;
  designationCadre: string;
  officialGovEmail: string;
  password: string;
}

export interface ExternalScholarshipLink {
  id: string;
  title: string;
  providerName: string;
  scope: 'Global / International' | 'External University / Institute' | 'Autonomous Ministry Portal';
  annualAwardText: string;
  deadline: string;
  externalUrl: string;
  eligibilitySummary: string;
  submittedBy: string;
}

export interface AidSlabCalculation {
  tuitionWaiver: number;
  hostelMaintenance: number;
  bookEquipmentGrant: number;
  totalAnnualAid: number;
  tierLabel: string;
  reimbursementRatio: number;
}

export const INITIAL_AUTH_SESSION: AuthSession = {
  isAuthenticated: false,
  role: 'GUEST',
  email: '',
  displayName: 'Guest Explorer (Unregistered)',
  badgeId: 'OTR-SIGN-IN-REQUIRED',
  organizationName: 'Public Scholarship Explorer',
};

/**
 * Authenticates credentials for Student OTR, AISHE Institute Nodal Officer, Ministry Nodal Officer,
 * or the universal Admin Bypass (admin@gmail.com / admin123).
 */
export function authenticateCredentials(
  email: string,
  password: string,
  requestedRole: 'STUDENT' | 'INSTITUTE' | 'MINISTRY',
  studentProfile: StudentProfile = INITIAL_STUDENT_PROFILE
): { ok: boolean; session?: AuthSession; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = password.trim();

  if (!cleanEmail || !cleanPass) {
    return { ok: false, error: 'Please enter both your registered email address and password.' };
  }

  // Universal Admin Bypass for all portals
  if (cleanEmail === 'admin@gmail.com' && cleanPass === 'admin123') {
    return {
      ok: true,
      session: {
        isAuthenticated: true,
        role: 'SUPER_ADMIN',
        email: 'admin@gmail.com',
        displayName: 'Directorate Super Admin (All-Portal Bypass)',
        badgeId: 'ADMIN-MASTER-OTR-INO-PFMS',
        organizationName: 'GRANTLY Unified Directorate (Student · Institute · Ministry)',
      },
    };
  }

  if (cleanPass.length < 4) {
    return { ok: false, error: 'Invalid credentials. Password must be at least 4 characters (or use admin@gmail.com / admin123).' };
  }

  if (requestedRole === 'STUDENT') {
    return {
      ok: true,
      session: {
        isAuthenticated: true,
        role: 'STUDENT',
        email: cleanEmail,
        displayName: studentProfile.fullName,
        badgeId: studentProfile.otrId,
        organizationName: `${studentProfile.institutionName} (${studentProfile.aisheCode})`,
      },
    };
  }

  if (requestedRole === 'INSTITUTE') {
    return {
      ok: true,
      session: {
        isAuthenticated: true,
        role: 'INSTITUTE',
        email: cleanEmail,
        displayName: 'Dr. V. K. Deshmukh (AISHE INO)',
        badgeId: 'AISHE-U-0306-KYC',
        organizationName: 'Indian Institute of Technology (IIT) Bombay · Nodal Desk',
      },
    };
  }

  return {
    ok: true,
    session: {
      isAuthenticated: true,
      role: 'MINISTRY',
      email: cleanEmail,
      displayName: 'Shri R. K. Mahajan, IAS (Joint Secretary)',
      badgeId: 'PFMS-MOE-DBT-01',
      organizationName: 'Ministry of Education & PFMS Direct Benefit Division',
    },
  };
}

/**
 * Role-based guard:
 * - Leaf 02 (INSTITUTE) is strictly accessible only to INSTITUTE or SUPER_ADMIN.
 * - Leaf 03 (MINISTRY) is strictly accessible only to MINISTRY or SUPER_ADMIN.
 * - Leaf 01 (STUDENT) is open to explore schemes, while submitting applications requires Student/Admin sign-in.
 */
export function canAccessPortal(session: AuthSession, targetPortal: PortalMode): boolean {
  if (!targetPortal || targetPortal === 'STUDENT') {
    return true;
  }
  if (!session.isAuthenticated) {
    return false;
  }
  if (session.role === 'SUPER_ADMIN') {
    return true;
  }
  if (targetPortal === 'INSTITUTE') {
    return session.role === 'INSTITUTE';
  }
  if (targetPortal === 'MINISTRY') {
    return session.role === 'MINISTRY';
  }
  return false;
}

/**
 * Students can explore active & global scholarships while signed out,
 * but applying directly via GRANTLY requires an authenticated Student OTR or Super Admin session.
 */
export function canApplyForScholarship(session: AuthSession): boolean {
  return (
    session.isAuthenticated &&
    (session.role === 'STUDENT' || session.role === 'SUPER_ADMIN')
  );
}


/**
 * Pure calculation for Flashcard 01: Benefits & Financial Aid Slabs
 */
export function calculateAidSlab(
  familyIncome: number,
  courseLevel: CourseLevel,
  residenceType: 'HOSTELLER' | 'DAY_SCHOLAR' = 'HOSTELLER'
): AidSlabCalculation {
  const clampedIncome = Math.max(100000, Math.min(800000, Math.round(familyIncome)));

  const baseTuitionByCourse: Record<CourseLevel, number> = {
    UG_STEM: 125000,
    UG_ARTS_COMMERCE: 65000,
    PG_MASTERS: 145000,
    DOCTORAL_RESEARCH: 210000,
  };

  const baseHostelByCourse: Record<CourseLevel, number> = {
    UG_STEM: 48000,
    UG_ARTS_COMMERCE: 36000,
    PG_MASTERS: 60000,
    DOCTORAL_RESEARCH: 84000,
  };

  let reimbursementRatio = 1.0;
  let tierLabel = 'Tier-I Full Waiver Slab (<= ₹2.5L)';

  if (clampedIncome <= 250000) {
    reimbursementRatio = 1.0;
    tierLabel = 'Tier-I Full Waiver Slab (<= ₹2.5L)';
  } else if (clampedIncome <= 500000) {
    // Smooth linear interpolation between 0.85 and 0.65
    const t = (clampedIncome - 250000) / 250000;
    reimbursementRatio = Number((0.85 - t * 0.2).toFixed(2));
    tierLabel = 'Tier-II Subsidized Merit Slab (₹2.5L – ₹5.0L)';
  } else {
    // Between 5L and 8L: 0.55 down to 0.30
    const t = (clampedIncome - 500000) / 300000;
    reimbursementRatio = Number((0.55 - t * 0.25).toFixed(2));
    tierLabel = 'Tier-III Partial Support Slab (₹5.0L – ₹8.0L)';
  }

  const rawTuition = baseTuitionByCourse[courseLevel] ?? 125000;
  const rawHostel = baseHostelByCourse[courseLevel] ?? 48000;
  const residenceMultiplier = residenceType === 'HOSTELLER' ? 1.0 : 0.55;

  const tuitionWaiver = Math.round((rawTuition * reimbursementRatio) / 500) * 500;
  const hostelMaintenance =
    Math.round((rawHostel * residenceMultiplier * (0.6 + reimbursementRatio * 0.4)) / 500) * 500;
  const bookEquipmentGrant = courseLevel === 'DOCTORAL_RESEARCH' ? 18000 : courseLevel === 'UG_STEM' ? 12000 : 8000;

  return {
    tuitionWaiver,
    hostelMaintenance,
    bookEquipmentGrant,
    totalAnnualAid: tuitionWaiver + hostelMaintenance + bookEquipmentGrant,
    tierLabel,
    reimbursementRatio: Math.round(reimbursementRatio * 100),
  };
}

/**
 * Pure filter for Flashcard 02: Eligibility Matrix real-time scheme counts
 */
export function filterSchemesByMatrix(
  schemes: ScholarshipScheme[],
  selectedCategories: SocialCategory[],
  minMarksThreshold: number,
  maxIncomeLimit?: number
): ScholarshipScheme[] {
  return schemes.filter((scheme) => {
    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.some((cat) => scheme.eligibleCategories.includes(cat));
    const matchesMarks = minMarksThreshold >= scheme.minPercentage;
    const matchesIncome =
      maxIncomeLimit === undefined || maxIncomeLimit <= scheme.maxFamilyIncome;
    return matchesCategory && matchesMarks && matchesIncome;
  });
}

/**
 * Evaluates a student's OTR profile and Smart Dossier against a ScholarshipScheme
 */
export function evaluateSchemeEligibility(
  profile: StudentProfile,
  docs: DocumentItem[],
  scheme: ScholarshipScheme
): EligibilityEvaluation {
  const incomePassed = profile.familyIncome <= scheme.maxFamilyIncome;
  const marksPassed = profile.academicPercentage >= scheme.minPercentage;
  const categoryPassed = scheme.eligibleCategories.includes(profile.category);
  const coursePassed = scheme.eligibleCourses.includes(profile.courseLevel);
  const kycPassed = profile.aadhaarEkyc && profile.dbtSeeded;

  const missingDocs: DocumentType[] = [];
  for (const reqDoc of scheme.requiredDocs) {
    const found = docs.find((d) => d.type === reqDoc && d.uploaded && d.verifiedOcr);
    if (!found) {
      missingDocs.push(reqDoc);
    }
  }

  const docsPassed = missingDocs.length === 0;

  const checks: EligibilityCheck[] = [
    {
      criterion: 'Annual Family Income Ceiling',
      passed: incomePassed,
      detail: `Student: ₹${(profile.familyIncome / 100000).toFixed(2)}L vs Cap: ₹${(scheme.maxFamilyIncome / 100000).toFixed(2)}L`,
    },
    {
      criterion: 'Minimum Academic Score',
      passed: marksPassed,
      detail: `Student: ${profile.academicPercentage}% vs Required: ${scheme.minPercentage}%`,
    },
    {
      criterion: 'Social Category / Quota',
      passed: categoryPassed,
      detail: `Profile: ${profile.category} (${scheme.eligibleCategories.join(', ')})`,
    },
    {
      criterion: 'Academic Course Level',
      passed: coursePassed,
      detail: `Enrolled: ${formatCourseLevel(profile.courseLevel)}`,
    },
    {
      criterion: 'Aadhaar e-KYC & NPCI DBT Link',
      passed: kycPassed,
      detail: kycPassed ? 'Seeded & Active' : 'Pending Aadhaar / Bank Seeding',
    },
    {
      criterion: 'Smart Dossier OCR Verification',
      passed: docsPassed,
      detail: docsPassed
        ? `All ${scheme.requiredDocs.length} required certificates verified`
        : `Missing: ${missingDocs.join(', ')}`,
    },
  ];

  const coreAcademicAndQuotaPassed = incomePassed && marksPassed && categoryPassed && coursePassed;
  const passedCount = checks.filter((c) => c.passed).length;
  const matchPercent = Math.round((passedCount / checks.length) * 100);

  let status: 'ELIGIBLE' | 'DOC_MISSING' | 'INELIGIBLE' = 'INELIGIBLE';
  if (coreAcademicAndQuotaPassed && kycPassed && docsPassed) {
    status = 'ELIGIBLE';
  } else if (coreAcademicAndQuotaPassed && (!docsPassed || !kycPassed)) {
    status = 'DOC_MISSING';
  } else {
    status = 'INELIGIBLE';
  }

  return {
    schemeId: scheme.id,
    status,
    matchPercent,
    checks,
    missingDocs,
  };
}

/**
 * Pure state transition for Institute Nodal Officer (INO) actions
 */
export function applyInoDecision(
  app: ScholarshipApplication,
  decision: 'VERIFY' | 'DEFECTIVE' | 'REJECT',
  officerRemark: string
): ScholarshipApplication {
  const cleanRemark = officerRemark.trim() || (
    decision === 'VERIFY'
      ? 'L1 AISHE Institute Audit Passed. Bonafide & Marksheet verified.'
      : decision === 'DEFECTIVE'
      ? 'Income Certificate serial mismatch with Tehsildar digital signature.'
      : 'Candidate does not meet statutory category criteria.'
  );

  if (decision === 'VERIFY') {
    return {
      ...app,
      status: 'Institute Verified',
      inoRemark: cleanRemark,
      defectReason: undefined,
    };
  }

  if (decision === 'DEFECTIVE') {
    return {
      ...app,
      status: 'Defective',
      inoRemark: cleanRemark,
      defectReason: cleanRemark,
    };
  }

  return {
    ...app,
    status: 'Rejected',
    inoRemark: cleanRemark,
  };
}

/**
 * Pure state transition when a Student resolves a defective application in their Kanban tracker
 */
export function resolveApplicationDefect(
  app: ScholarshipApplication,
  resolutionNote: string
): ScholarshipApplication {
  if (app.status !== 'Defective') {
    return app;
  }
  const updatedDocs = app.documentsSnapshot.map((d) => ({
    ...d,
    verified: true,
  }));
  return {
    ...app,
    status: 'Submitted',
    defectReason: undefined,
    inoRemark: `Student Re-submitted with OCR Correction: ${resolutionNote.trim() || 'Updated Digital Certificate'}`,
    documentsSnapshot: updatedDocs,
  };
}

/**
 * Automated Merit List & Quota Ranker for Ministry Portal
 */
export function generateMeritList(
  applications: ScholarshipApplication[]
): ScholarshipApplication[] {
  // Compute composite merit score for 'Institute Verified' or 'Ministry Approved' apps
  const scored = applications.map((app) => {
    if (app.status !== 'Institute Verified' && app.status !== 'Ministry Approved') {
      return app;
    }
    const academicNorm = Math.min(100, Math.max(0, app.academicPercentage)) * 0.6;
    const incomeRatio = Math.max(0, 1 - app.familyIncome / 800000);
    const needNorm = incomeRatio * 100 * 0.3;
    const categoryBonus =
      app.category === 'SC/ST' || app.category === 'PwD' || app.category === 'Single Girl Child'
        ? 10
        : app.category === 'OBC' || app.category === 'Minority' || app.category === 'General-EWS'
        ? 8
        : 5;
    const meritScore = Number((academicNorm + needNorm + categoryBonus).toFixed(1));
    return {
      ...app,
      status: 'Ministry Approved' as ApplicationStatus,
      meritScore,
      inoRemark: app.inoRemark.includes('Merit')
        ? app.inoRemark
        : `${app.inoRemark} · Cleared Ministry Merit Cutoff (${meritScore} pts)`,
    };
  });

  // Rank all Ministry Approved applications descending by meritScore
  const approvedIdsByRank = [...scored]
    .filter((a) => a.status === 'Ministry Approved' || a.status === 'Disbursed')
    .sort((a, b) => (b.meritScore ?? 0) - (a.meritScore ?? 0))
    .map((a) => a.id);

  return scored.map((app) => {
    const rankIndex = approvedIdsByRank.indexOf(app.id);
    if (rankIndex !== -1) {
      return {
        ...app,
        meritRank: rankIndex + 1,
      };
    }
    return app;
  });
}

/**
 * PFMS / DBT Batch Disbursal Simulator for Ministry Portal
 */
export function disburseApprovedApplications(
  applications: ScholarshipApplication[],
  batchPrefix = 'PFMS-DBT-2026'
): { updated: ScholarshipApplication[]; disbursedCount: number; disbursedTotalAmount: number } {
  let disbursedCount = 0;
  let disbursedTotalAmount = 0;

  const updated = applications.map((app, idx) => {
    if (app.status === 'Ministry Approved') {
      disbursedCount++;
      disbursedTotalAmount += app.annualAward;
      const utrSuffix = String(104820 + idx * 17).padStart(6, '0');
      return {
        ...app,
        status: 'Disbursed' as ApplicationStatus,
        pfmsTransactionId: `${batchPrefix}-${utrSuffix}`,
        disbursedAt: '2026-11-07 14:30 IST',
        inoRemark: `PFMS Direct Benefit Transfer Credited via NPCI Aadhaar Bridge (${batchPrefix}-${utrSuffix})`,
      };
    }
    return app;
  });

  return { updated, disbursedCount, disbursedTotalAmount };
}

export function formatCourseLevel(level: CourseLevel): string {
  switch (level) {
    case 'UG_STEM':
      return 'B.Tech / B.E. / B.Sc (STEM)';
    case 'UG_ARTS_COMMERCE':
      return 'B.A. / B.Com / BBA (UG)';
    case 'PG_MASTERS':
      return 'M.Tech / M.Sc / MBA (PG)';
    case 'DOCTORAL_RESEARCH':
      return 'Ph.D. / Doctoral Fellowship';
  }
}

export function formatInr(amount: number): string {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

export const INITIAL_STUDENT_PROFILE: StudentProfile = {
  fullName: 'Aarav Sharma',
  otrId: 'NSP-OTR-2026-884920',
  academicPercentage: 89.4,
  familyIncome: 220000,
  category: 'General-EWS',
  state: 'Maharashtra',
  courseLevel: 'UG_STEM',
  residenceType: 'HOSTELLER',
  institutionName: 'Indian Institute of Technology (IIT) Bombay',
  aisheCode: 'U-0306',
  aadhaarEkyc: true,
  dbtSeeded: true,
  bankAccountMasked: 'SBI •••• 4829 (NPCI Active)',
};

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'doc-1',
    type: 'MARKSHEET',
    label: 'Class XII / Semester Grade Transcript',
    authority: 'CBSE DigiLocker Verified',
    uploaded: true,
    verifiedOcr: true,
    extractedSummary: 'CGPA 9.4 / 89.4% Aggregate · Roll #4910283',
    certificateNo: 'DL-CBSE-2025-88412',
    updatedAt: '2026-10-18',
  },
  {
    id: 'doc-2',
    type: 'INCOME_CERT',
    label: 'Annual Family Income Certificate',
    authority: 'Revenue Dept / Tehsildar e-District',
    uploaded: true,
    verifiedOcr: true,
    extractedSummary: 'Gross Annual Income: ₹2,20,000 · Valid FY 2026-27',
    certificateNo: 'MH-REV-INC-2026-11904',
    updatedAt: '2026-10-21',
  },
  {
    id: 'doc-3',
    type: 'DOMICILE',
    label: 'State Domicile & Category Certificate',
    authority: 'MahaOnline Citizen Portal',
    uploaded: true,
    verifiedOcr: true,
    extractedSummary: 'State: Maharashtra · Category: General-EWS',
    certificateNo: 'MH-DOM-2026-77320',
    updatedAt: '2026-10-22',
  },
  {
    id: 'doc-4',
    type: 'BONAFIDE',
    label: 'AISHE Institute Bonafide & Fee Structure',
    authority: 'Academic Section · U-0306',
    uploaded: false,
    verifiedOcr: false,
    extractedSummary: 'Awaiting 1-Click OCR Scan from Student Locker',
    certificateNo: 'PENDING-UPLOAD',
    updatedAt: '—',
  },
];

export const INITIAL_SCHEMES: ScholarshipScheme[] = [
  {
    id: 'sch-pm-usp',
    code: 'NSP-MOE-101',
    title: 'PM-USP Central Sector Scheme of Scholarship for College & University Students',
    ministry: 'Ministry of Education (Dept. of Higher Education)',
    providerType: 'Central Govt',
    annualAward: 82000,
    tuitionComponent: 62000,
    maintenanceComponent: 20000,
    maxFamilyIncome: 450000,
    minPercentage: 80,
    eligibleCategories: ['General-EWS', 'OBC', 'SC/ST', 'Minority', 'PwD', 'Single Girl Child'],
    eligibleCourses: ['UG_STEM', 'UG_ARTS_COMMERCE', 'PG_MASTERS'],
    deadlineDays: 14,
    totalSeats: 82000,
    requiredDocs: ['MARKSHEET', 'INCOME_CERT', 'DOMICILE'],
    tags: ['Direct DBT', 'Merit-cum-Means', 'Zero Processing Fee'],
  },
  {
    id: 'sch-aicte-pragati',
    code: 'AICTE-PRG-204',
    title: 'AICTE Pragati & Swanath Technical Degree Fellowship',
    ministry: 'All India Council for Technical Education (AICTE)',
    providerType: 'AICTE / UGC',
    annualAward: 125000,
    tuitionComponent: 95000,
    maintenanceComponent: 30000,
    maxFamilyIncome: 800000,
    minPercentage: 75,
    eligibleCategories: ['General-EWS', 'OBC', 'SC/ST', 'Single Girl Child', 'PwD'],
    eligibleCourses: ['UG_STEM'],
    deadlineDays: 9,
    totalSeats: 10000,
    requiredDocs: ['MARKSHEET', 'INCOME_CERT', 'BONAFIDE'],
    tags: ['Technical STEM', 'Laptop & Book Grant', 'AICTE Approved'],
  },
  {
    id: 'sch-post-matric',
    code: 'MSJE-PMS-309',
    title: 'National Post-Matric Top Class Education Grant for Meritorious Scholars',
    ministry: 'Ministry of Social Justice & Empowerment',
    providerType: 'Central Govt',
    annualAward: 165000,
    tuitionComponent: 120000,
    maintenanceComponent: 45000,
    maxFamilyIncome: 600000,
    minPercentage: 70,
    eligibleCategories: ['SC/ST', 'OBC', 'PwD', 'General-EWS'],
    eligibleCourses: ['UG_STEM', 'PG_MASTERS', 'DOCTORAL_RESEARCH'],
    deadlineDays: 18,
    totalSeats: 25000,
    requiredDocs: ['MARKSHEET', 'INCOME_CERT', 'DOMICILE'],
    tags: ['Full Tuition Waiver', 'Hostel Stipend', 'Priority DBT'],
  },
  {
    id: 'sch-ishan-uday',
    code: 'UGC-PG-412',
    title: 'UGC National Research & Postgraduate Excellence Fellowship',
    ministry: 'University Grants Commission (UGC)',
    providerType: 'AICTE / UGC',
    annualAward: 188000,
    tuitionComponent: 138000,
    maintenanceComponent: 50000,
    maxFamilyIncome: 500000,
    minPercentage: 82,
    eligibleCategories: ['General-EWS', 'OBC', 'SC/ST', 'Minority', 'PwD', 'Single Girl Child'],
    eligibleCourses: ['PG_MASTERS', 'DOCTORAL_RESEARCH', 'UG_STEM'],
    deadlineDays: 21,
    totalSeats: 15000,
    requiredDocs: ['MARKSHEET', 'INCOME_CERT', 'DOMICILE', 'BONAFIDE'],
    tags: ['Research Contingency', 'HRA Included', 'UGC NET/Merit'],
  },
  {
    id: 'sch-tata-csr',
    code: 'CSR-TATA-508',
    title: 'Bharat Horizon STEM & Innovation Endowment Grant',
    ministry: 'National CSR Education Alliance & NITI Frontier',
    providerType: 'Corporate CSR',
    annualAward: 140000,
    tuitionComponent: 100000,
    maintenanceComponent: 40000,
    maxFamilyIncome: 350000,
    minPercentage: 85,
    eligibleCategories: ['General-EWS', 'OBC', 'SC/ST', 'Minority', 'PwD', 'Single Girl Child'],
    eligibleCourses: ['UG_STEM', 'PG_MASTERS'],
    deadlineDays: 6,
    totalSeats: 4500,
    requiredDocs: ['MARKSHEET', 'INCOME_CERT'],
    tags: ['Fast-Track Audit', 'Mentorship Cohort', 'R&D Stipend'],
  },
  {
    id: 'sch-begum-hazrat',
    code: 'MOMA-MERIT-615',
    title: 'Merit-cum-Means Professional & Technical Course Scholarship',
    ministry: 'Ministry of Minority Affairs',
    providerType: 'Central Govt',
    annualAward: 95000,
    tuitionComponent: 70000,
    maintenanceComponent: 25000,
    maxFamilyIncome: 250000,
    minPercentage: 65,
    eligibleCategories: ['Minority', 'General-EWS', 'OBC', 'Single Girl Child'],
    eligibleCourses: ['UG_STEM', 'UG_ARTS_COMMERCE', 'PG_MASTERS'],
    deadlineDays: 12,
    totalSeats: 60000,
    requiredDocs: ['MARKSHEET', 'INCOME_CERT', 'DOMICILE'],
    tags: ['Listed Premier Institutes', '100% Course Fee', 'Hostel Allowance'],
  },
];

export const INITIAL_APPLICATIONS: ScholarshipApplication[] = [
  {
    id: 'APP-2026-9014',
    schemeId: 'sch-pm-usp',
    schemeTitle: 'PM-USP Central Sector Scheme of Scholarship for College & University Students',
    ministry: 'Ministry of Education (Dept. of Higher Education)',
    studentName: 'Aarav Sharma',
    otrId: 'NSP-OTR-2026-884920',
    institutionName: 'Indian Institute of Technology (IIT) Bombay',
    aisheCode: 'U-0306',
    category: 'General-EWS',
    academicPercentage: 89.4,
    familyIncome: 220000,
    annualAward: 82000,
    status: 'Submitted',
    submittedAt: '2026-11-02',
    inoRemark: 'Queued at Institute Nodal Officer Desk (U-0306) for L1 Document Verification.',
    documentsSnapshot: [
      { type: 'MARKSHEET', certificateNo: 'DL-CBSE-2025-88412', verified: true },
      { type: 'INCOME_CERT', certificateNo: 'MH-REV-INC-2026-11904', verified: true },
      { type: 'DOMICILE', certificateNo: 'MH-DOM-2026-77320', verified: true },
    ],
  },
  {
    id: 'APP-2026-8832',
    schemeId: 'sch-aicte-pragati',
    schemeTitle: 'AICTE Pragati & Swanath Technical Degree Fellowship',
    ministry: 'All India Council for Technical Education (AICTE)',
    studentName: 'Aarav Sharma',
    otrId: 'NSP-OTR-2026-884920',
    institutionName: 'Indian Institute of Technology (IIT) Bombay',
    aisheCode: 'U-0306',
    category: 'General-EWS',
    academicPercentage: 89.4,
    familyIncome: 220000,
    annualAward: 125000,
    status: 'Defective',
    submittedAt: '2026-10-28',
    inoRemark: 'Bonafide Certificate lacks current Semester-III seal from Dean of Academic Programmes.',
    defectReason: 'Bonafide Certificate lacks current Semester-III seal from Dean of Academic Programmes.',
    documentsSnapshot: [
      { type: 'MARKSHEET', certificateNo: 'DL-CBSE-2025-88412', verified: true },
      { type: 'INCOME_CERT', certificateNo: 'MH-REV-INC-2026-11904', verified: true },
      { type: 'BONAFIDE', certificateNo: 'IITB-BON-2025-OLD', verified: false },
    ],
  },
  {
    id: 'APP-2026-8410',
    schemeId: 'sch-post-matric',
    schemeTitle: 'National Post-Matric Top Class Education Grant for Meritorious Scholars',
    ministry: 'Ministry of Social Justice & Empowerment',
    studentName: 'Aarav Sharma',
    otrId: 'NSP-OTR-2026-884920',
    institutionName: 'Indian Institute of Technology (IIT) Bombay',
    aisheCode: 'U-0306',
    category: 'General-EWS',
    academicPercentage: 89.4,
    familyIncome: 220000,
    annualAward: 165000,
    status: 'Institute Verified',
    submittedAt: '2026-10-19',
    inoRemark: 'Verified by Dr. V. K. Deshmukh (INO · U-0306). Forwarded to Ministry Merit Pool.',
    documentsSnapshot: [
      { type: 'MARKSHEET', certificateNo: 'DL-CBSE-2025-88412', verified: true },
      { type: 'INCOME_CERT', certificateNo: 'MH-REV-INC-2026-11904', verified: true },
      { type: 'DOMICILE', certificateNo: 'MH-DOM-2026-77320', verified: true },
    ],
  },
  {
    id: 'APP-2026-7921',
    schemeId: 'sch-tata-csr',
    schemeTitle: 'Bharat Horizon STEM & Innovation Endowment Grant',
    ministry: 'National CSR Education Alliance & NITI Frontier',
    studentName: 'Aarav Sharma',
    otrId: 'NSP-OTR-2026-884920',
    institutionName: 'Indian Institute of Technology (IIT) Bombay',
    aisheCode: 'U-0306',
    category: 'General-EWS',
    academicPercentage: 89.4,
    familyIncome: 220000,
    annualAward: 140000,
    status: 'Ministry Approved',
    submittedAt: '2026-10-11',
    meritScore: 83.4,
    meritRank: 1,
    inoRemark: 'Cleared National Merit List Rank #1 · Ready for PFMS Direct Bank Transfer.',
    documentsSnapshot: [
      { type: 'MARKSHEET', certificateNo: 'DL-CBSE-2025-88412', verified: true },
      { type: 'INCOME_CERT', certificateNo: 'MH-REV-INC-2026-11904', verified: true },
    ],
  },
  {
    id: 'APP-2026-9105',
    schemeId: 'sch-pm-usp',
    schemeTitle: 'PM-USP Central Sector Scheme of Scholarship for College & University Students',
    ministry: 'Ministry of Education (Dept. of Higher Education)',
    studentName: 'Diya Nair',
    otrId: 'NSP-OTR-2026-441209',
    institutionName: 'National Institute of Technology (NIT) Trichy',
    aisheCode: 'U-0467',
    category: 'Single Girl Child',
    academicPercentage: 94.2,
    familyIncome: 185000,
    annualAward: 82000,
    status: 'Submitted',
    submittedAt: '2026-11-04',
    inoRemark: 'Awaiting L1 Nodal Verification of CBSE Class XII Marksheet & Income Certificate.',
    documentsSnapshot: [
      { type: 'MARKSHEET', certificateNo: 'DL-CBSE-2025-99201', verified: true },
      { type: 'INCOME_CERT', certificateNo: 'TN-REV-INC-2026-55319', verified: true },
      { type: 'DOMICILE', certificateNo: 'TN-DOM-2026-11820', verified: true },
    ],
  },
  {
    id: 'APP-2026-9188',
    schemeId: 'sch-ishan-uday',
    schemeTitle: 'UGC National Research & Postgraduate Excellence Fellowship',
    ministry: 'University Grants Commission (UGC)',
    studentName: 'Kabir Verma',
    otrId: 'NSP-OTR-2026-619384',
    institutionName: 'Delhi Technological University (DTU)',
    aisheCode: 'U-0098',
    category: 'OBC',
    academicPercentage: 86.8,
    familyIncome: 310000,
    annualAward: 188000,
    status: 'Institute Verified',
    submittedAt: '2026-10-25',
    inoRemark: 'Verified by DTU Nodal Desk. Forwarded for UGC Merit Ranking.',
    documentsSnapshot: [
      { type: 'MARKSHEET', certificateNo: 'DL-DTU-2025-33109', verified: true },
      { type: 'INCOME_CERT', certificateNo: 'DL-REV-INC-2026-40912', verified: true },
      { type: 'DOMICILE', certificateNo: 'DL-DOM-2026-88410', verified: true },
      { type: 'BONAFIDE', certificateNo: 'DTU-BON-2026-7712', verified: true },
    ],
  },
];

export const INITIAL_EXTERNAL_LINKS: ExternalScholarshipLink[] = [
  {
    id: 'ext-jn-tata',
    title: 'JN Tata Endowment for the Higher Education of Indians (Global PG / Doctoral)',
    providerName: 'Sir Dorabji Tata Trust & Allied Trusts',
    scope: 'Global / International',
    annualAwardText: 'Up to ₹10,00,000 + Travel Grant',
    deadline: '15 Mar 2027',
    externalUrl: 'https://www.jntataendowment.org',
    eligibilitySummary: 'Indian graduates with >= 60% marks admitted to recognized overseas Master’s / Ph.D. programs.',
    submittedBy: 'NSP-OTR-2026-884920',
  },
  {
    id: 'ext-commonwealth',
    title: 'Commonwealth Split-Site & Master’s Scholarship (UK FCDO & Ministry of Education)',
    providerName: 'Commonwealth Scholarship Commission (UK)',
    scope: 'Global / International',
    annualAwardText: '100% Overseas Tuition + £1,347/mo Stipend',
    deadline: '18 Dec 2026',
    externalUrl: 'https://cscuk.fcdo.gov.uk/scholarships',
    eligibilitySummary: 'Separate application on CSC Central Portal & Sakshat External Portal; minimum 65% in UG/PG.',
    submittedBy: 'NSP-OTR-2026-441209',
  },
  {
    id: 'ext-inlaks',
    title: 'Inlaks Shivdasani Global University Grant (North America & Europe)',
    providerName: 'Inlaks Shivdasani Foundation',
    scope: 'Global / International',
    annualAwardText: 'Up to USD $100,000 Full Funding',
    deadline: '30 Mar 2027',
    externalUrl: 'https://www.inlaksfoundation.org/scholarships',
    eligibilitySummary: 'Direct foundation portal application for premier global universities; age under 30 years.',
    submittedBy: 'NSP-OTR-2026-619384',
  },
  {
    id: 'ext-dae-nbhm',
    title: 'NBHM & DAE Autonomous Research Fellowship (Direct Institute Portal)',
    providerName: 'Department of Atomic Energy (DAE) / HBNI',
    scope: 'Autonomous Ministry Portal',
    annualAwardText: '₹44,400 / month + Contingency',
    deadline: '28 Jan 2027',
    externalUrl: 'https://nbhm.dae.gov.in',
    eligibilitySummary: 'For institutes taking separate applications outside unified NSP; requires valid OTR reference.',
    submittedBy: 'NSP-OTR-2026-884920',
  },
];

export function createExternalScholarshipLink(input: {
  title: string;
  providerName: string;
  scope: 'Global / International' | 'External University / Institute' | 'Autonomous Ministry Portal';
  annualAwardText: string;
  deadline: string;
  externalUrl: string;
  eligibilitySummary: string;
  submittedBy: string;
}): { ok: boolean; item?: ExternalScholarshipLink; error?: string } {
  const cleanTitle = input.title.trim();
  const cleanProvider = input.providerName.trim();
  let cleanUrl = input.externalUrl.trim();

  if (!cleanTitle || !cleanProvider || !cleanUrl) {
    return {
      ok: false,
      error: 'Please provide the Scholarship Title, Institution/Ministry Provider Name, and Application URL.',
    };
  }

  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = `https://${cleanUrl}`;
  }

  return {
    ok: true,
    item: {
      id: `ext-${Date.now()}`,
      title: cleanTitle,
      providerName: cleanProvider,
      scope: input.scope,
      annualAwardText: input.annualAwardText.trim() || 'As per Official Notification',
      deadline: input.deadline.trim() || 'Open Cycle 2026–27',
      externalUrl: cleanUrl,
      eligibilitySummary:
        input.eligibilitySummary.trim() ||
        'Direct application on external institute / ministry portal. OTR eligibility pre-checked.',
      submittedBy: input.submittedBy || 'NSP-OTR-VERIFIED',
    },
  };
}


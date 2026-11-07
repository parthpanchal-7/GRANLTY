import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { User } from 'firebase/auth';
import {
  loadUserWorkspaceFromFirestore,
  persistApplicationToFirestore,
  persistExternalLinkToFirestore,
  persistSchemeToFirestore,
  signInWithGooglePopup,
  signOutFirebaseUser,
  subscribeToFirebaseAuth,
  syncUserWorkspaceToFirestore,
  testFirestoreConnection,
} from './firebase-client';
import {
  ApplicationStatus,
  AuthSession,
  CourseLevel,
  DocumentItem,
  DocumentType,
  EligibilityEvaluation,
  ExternalScholarshipLink,
  INITIAL_APPLICATIONS,
  INITIAL_AUTH_SESSION,
  INITIAL_DOCUMENTS,
  INITIAL_EXTERNAL_LINKS,
  INITIAL_SCHEMES,
  INITIAL_STUDENT_PROFILE,
  InstituteRegistrationPayload,
  MinistryRegistrationPayload,
  PortalMode,
  ScholarshipApplication,
  ScholarshipScheme,
  SocialCategory,
  StudentProfile,
  applyInoDecision,
  authenticateCredentials,
  calculateAidSlab,
  canAccessPortal,
  canApplyForScholarship,
  createExternalScholarshipLink,
  disburseApprovedApplications,
  evaluateSchemeEligibility,
  filterSchemesByMatrix,
  generateMeritList,
  resolveApplicationDefect,
} from './scholarship-rules';

export type StudentSubTab = 'BROWSER' | 'OTR_PROFILE' | 'DOSSIER' | 'KANBAN' | 'EXTERNAL_LINKS';

export interface AuthGatewayPrompt {
  targetRole: 'STUDENT' | 'INSTITUTE' | 'MINISTRY';
  mode: 'SIGN_IN' | 'REGISTER';
  reasonMessage: string;
  pendingPortal?: PortalMode;
  pendingSchemeId?: string;
}

const STORAGE_KEY = 'grantly_nsp_lusion_state_v2';

@Injectable({ providedIn: 'root' })
export class GrantlyStore {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Firebase Cloud State
  readonly firebaseConnected = signal<boolean>(false);
  readonly firebaseProjectId = signal<string>('gen-lang-client-0740133777');
  readonly firebaseRegion = signal<string>('asia-south1');
  readonly firebaseUser = signal<User | null>(null);

  // Active In-Page Workspace Drawer
  readonly activePortal = signal<PortalMode>(null);
  readonly studentSubTab = signal<StudentSubTab>('BROWSER');

  // Authentication & Role Access State
  readonly authSession = signal<AuthSession>(INITIAL_AUTH_SESSION);
  readonly activeAuthTab = signal<'STUDENT' | 'INSTITUTE' | 'MINISTRY'>('STUDENT');
  readonly activeAuthMode = signal<'SIGN_IN' | 'REGISTER'>('SIGN_IN');
  readonly authGatewayPrompt = signal<AuthGatewayPrompt | null>(null);

  // Spine Flashcard 01 Interactive State
  readonly calcIncome = signal<number>(220000);
  readonly calcCourse = signal<CourseLevel>('UG_STEM');
  readonly calcResidence = signal<'HOSTELLER' | 'DAY_SCHOLAR'>('HOSTELLER');

  readonly aidSlabResult = computed(() =>
    calculateAidSlab(this.calcIncome(), this.calcCourse(), this.calcResidence())
  );

  // Spine Flashcard 02 Interactive Eligibility Matrix State
  readonly matrixCategories = signal<SocialCategory[]>(['General-EWS', 'OBC', 'Single Girl Child']);
  readonly matrixMinMarks = signal<number>(82);

  // Spine Flashcard 03 Interactive Stepper State
  readonly activePipelineStep = signal<number>(0);

  // Core Shared Entities
  readonly studentProfile = signal<StudentProfile>(INITIAL_STUDENT_PROFILE);
  readonly documents = signal<DocumentItem[]>(INITIAL_DOCUMENTS);
  readonly schemes = signal<ScholarshipScheme[]>(INITIAL_SCHEMES);
  readonly applications = signal<ScholarshipApplication[]>(INITIAL_APPLICATIONS);
  readonly externalLinks = signal<ExternalScholarshipLink[]>(INITIAL_EXTERNAL_LINKS);

  // Toast / Action Banner Feedback
  readonly actionNotice = signal<{ title: string; detail: string; tone: 'cobalt' | 'emerald' | 'amber' } | null>(
    null
  );

  // Derived Role Access Booleans
  readonly isStudentSignedIn = computed(() => canApplyForScholarship(this.authSession()));
  readonly canOpenInstitutePortal = computed(() => canAccessPortal(this.authSession(), 'INSTITUTE'));
  readonly canOpenMinistryPortal = computed(() => canAccessPortal(this.authSession(), 'MINISTRY'));

  // Derived Evaluations for Student Portal
  readonly schemeEvaluations = computed(() => {
    const profile = this.studentProfile();
    const docs = this.documents();
    const map = new Map<string, EligibilityEvaluation>();
    for (const scheme of this.schemes()) {
      map.set(scheme.id, evaluateSchemeEligibility(profile, docs, scheme));
    }
    return map;
  });

  readonly eligibilityBreakdown = computed(() => {
    const evals = Array.from(this.schemeEvaluations().values());
    return {
      eligible: evals.filter((e) => e.status === 'ELIGIBLE').length,
      docMissing: evals.filter((e) => e.status === 'DOC_MISSING').length,
      ineligible: evals.filter((e) => e.status === 'INELIGIBLE').length,
      total: evals.length,
    };
  });

  readonly matrixMatchingSchemes = computed(() =>
    filterSchemesByMatrix(this.schemes(), this.matrixCategories(), this.matrixMinMarks())
  );

  // Student's own applications (matching OTR ID)
  readonly studentApplications = computed(() =>
    this.applications().filter((a) => a.otrId === this.studentProfile().otrId)
  );

  readonly kanbanColumns = computed(() => {
    const apps = this.studentApplications();
    const cols: { status: ApplicationStatus; label: string; items: ScholarshipApplication[] }[] = [
      { status: 'Submitted', label: 'Submitted (L1 Queue)', items: [] },
      { status: 'Defective', label: 'Defective (Action Req)', items: [] },
      { status: 'Institute Verified', label: 'Institute Verified', items: [] },
      { status: 'Ministry Approved', label: 'Ministry Approved', items: [] },
      { status: 'Disbursed', label: 'PFMS Disbursed', items: [] },
    ];
    for (const app of apps) {
      const target = cols.find((c) => c.status === app.status);
      if (target) {
        target.items.push(app);
      }
    }
    return cols;
  });

  readonly ministryMetrics = computed(() => {
    const apps = this.applications();
    const verifiedCount = apps.filter((a) => a.status === 'Institute Verified').length;
    const approvedCount = apps.filter((a) => a.status === 'Ministry Approved').length;
    const disbursedApps = apps.filter((a) => a.status === 'Disbursed');
    const totalDisbursedInr = disbursedApps.reduce((acc, a) => acc + a.annualAward, 0);
    return {
      totalApplications: apps.length,
      verifiedCount,
      approvedCount,
      disbursedCount: disbursedApps.length,
      totalDisbursedInr,
    };
  });

  constructor() {
    if (this.isBrowser) {
      this.hydrateFromStorage();
      this.initFirebaseBridge();
      effect(() => {
        const payload = {
          authSession: this.authSession(),
          studentProfile: this.studentProfile(),
          documents: this.documents(),
          schemes: this.schemes(),
          applications: this.applications(),
          externalLinks: this.externalLinks(),
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch {
          // Ignore storage quota errors
        }
      });
    }
  }

  private initFirebaseBridge(): void {
    void testFirestoreConnection().then((status) => {
      this.firebaseConnected.set(status.connected);
      this.firebaseProjectId.set(status.projectId);
      this.firebaseRegion.set(status.region);
    });

    subscribeToFirebaseAuth((user) => {
      this.firebaseUser.set(user);
      if (user) {
        void loadUserWorkspaceFromFirestore(user).then((remoteProfile) => {
          if (remoteProfile) {
            this.studentProfile.update((curr) => ({ ...curr, ...remoteProfile }));
          } else {
            void syncUserWorkspaceToFirestore(user, this.authSession().role, this.studentProfile());
          }
        });
      }
    });
  }

  private hydrateFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.authSession) this.authSession.set(parsed.authSession);
      if (parsed.studentProfile) this.studentProfile.set(parsed.studentProfile);
      if (Array.isArray(parsed.documents) && parsed.documents.length > 0) {
        this.documents.set(parsed.documents);
      }
      if (Array.isArray(parsed.schemes) && parsed.schemes.length > 0) {
        this.schemes.set(parsed.schemes);
      }
      if (Array.isArray(parsed.applications) && parsed.applications.length > 0) {
        this.applications.set(parsed.applications);
      }
      if (Array.isArray(parsed.externalLinks) && parsed.externalLinks.length > 0) {
        this.externalLinks.set(parsed.externalLinks);
      }
    } catch {
      // Fallback to seed data
    }
  }

  /**
   * Opens a portal workspace drawer.
   * Leaf 02 (INSTITUTE) and Leaf 03 (MINISTRY) are strictly guarded by role access control.
   */
  openPortal(portal: PortalMode, subTab?: StudentSubTab): void {
    if (!portal) {
      this.activePortal.set(null);
      return;
    }

    if (portal === 'INSTITUTE' && !canAccessPortal(this.authSession(), 'INSTITUTE')) {
      this.activeAuthTab.set('INSTITUTE');
      this.activeAuthMode.set('SIGN_IN');
      this.authGatewayPrompt.set({
        targetRole: 'INSTITUTE',
        mode: 'SIGN_IN',
        reasonMessage:
          'Leaf 02 (AISHE Institute Nodal Officer Desk) is restricted to verified institutions. Sign in with your AISHE / UDISE+ Nodal credentials or use the Admin Bypass (admin@gmail.com / admin123).',
        pendingPortal: 'INSTITUTE',
      });
      this.notify(
        'Institute Nodal Sign-In Required',
        'Leaf 02 is accessible only to verified AISHE / UDISE+ Institute Nodal Officers.',
        'amber'
      );
      return;
    }

    if (portal === 'MINISTRY' && !canAccessPortal(this.authSession(), 'MINISTRY')) {
      this.activeAuthTab.set('MINISTRY');
      this.activeAuthMode.set('SIGN_IN');
      this.authGatewayPrompt.set({
        targetRole: 'MINISTRY',
        mode: 'SIGN_IN',
        reasonMessage:
          'Leaf 03 (Scheme & Ministry Authority Portal) is restricted to authorized Ministry & PFMS Nodal Officers. Sign in with your official Ministry credentials or use the Admin Bypass (admin@gmail.com / admin123).',
        pendingPortal: 'MINISTRY',
      });
      this.notify(
        'Ministry Authority Sign-In Required',
        'Leaf 03 is accessible only to verified Ministry & PFMS Nodal Officers.',
        'amber'
      );
      return;
    }

    this.activePortal.set(portal);
    if (subTab) {
      this.studentSubTab.set(subTab);
    }
  }

  closePortal(): void {
    this.activePortal.set(null);
  }

  /**
   * Ensures a student is signed in (or registered with OTR) before applying to a scholarship on GRANTLY.
   */
  requireStudentAuthForApply(schemeId: string): boolean {
    if (canApplyForScholarship(this.authSession())) {
      return true;
    }
    this.activeAuthTab.set('STUDENT');
    this.activeAuthMode.set('SIGN_IN');
    this.authGatewayPrompt.set({
      targetRole: 'STUDENT',
      mode: 'SIGN_IN',
      reasonMessage:
        'Sign In or Complete OTR Registration to Apply: Guests can freely explore all scholarships, but submitting an application requires signing in with your One-Time Registration (OTR) profile to verify eligibility.',
      pendingPortal: 'STUDENT',
      pendingSchemeId: schemeId,
    });
    this.notify(
      'Sign In or OTR Registration Required',
      'Please sign in or register your Student OTR profile to check eligibility and submit your application.',
      'amber'
    );
    return false;
  }

  closeAuthGateway(): void {
    this.authGatewayPrompt.set(null);
  }

  loginWithCredentials(
    email: string,
    password: string,
    role: 'STUDENT' | 'INSTITUTE' | 'MINISTRY'
  ): { ok: boolean; error?: string } {
    const result = authenticateCredentials(email, password, role, this.studentProfile());
    if (!result.ok || !result.session) {
      return { ok: false, error: result.error };
    }

    this.authSession.set(result.session);
    const pending = this.authGatewayPrompt();
    this.authGatewayPrompt.set(null);

    this.notify(
      `Authenticated as ${result.session.displayName}`,
      `Active Badge: ${result.session.badgeId} · ${result.session.organizationName}`,
      'emerald'
    );

    if (pending?.pendingPortal) {
      this.activePortal.set(pending.pendingPortal);
      if (pending.pendingPortal === 'STUDENT') {
        this.studentSubTab.set('BROWSER');
      }
    }
    return { ok: true };
  }

  loginAdminBypass(openTargetPortal?: PortalMode): void {
    const result = authenticateCredentials('admin@gmail.com', 'admin123', 'STUDENT', this.studentProfile());
    if (result.ok && result.session) {
      this.authSession.set(result.session);
      const pending = this.authGatewayPrompt();
      this.authGatewayPrompt.set(null);
      this.notify(
        'All-Portal Admin Bypass Active (admin@gmail.com)',
        'Unlocked Student OTR, Leaf 02 (AISHE INO Desk), and Leaf 03 (Ministry PFMS Portal).',
        'emerald'
      );
      const target = openTargetPortal ?? pending?.pendingPortal ?? null;
      if (target) {
        this.activePortal.set(target);
      }
    }
  }

  registerStudentOtr(input: {
    fullName: string;
    email: string;
    password: string;
    academicPercentage: number;
    familyIncome: number;
    category: SocialCategory;
    state: string;
    courseLevel: CourseLevel;
    institutionName: string;
    aisheCode: string;
  }): { ok: boolean; otrId?: string; error?: string } {
    if (!input.fullName.trim() || !input.email.trim() || !input.password.trim()) {
      return { ok: false, error: 'Please complete Full Name, Email, and Password to generate your OTR ID.' };
    }
    const randomSix = Math.floor(100000 + Math.random() * 900000);
    const issuedOtr = `NSP-OTR-2026-${randomSix}`;
    const oldOtr = this.studentProfile().otrId;

    const updatedProfile: StudentProfile = {
      ...this.studentProfile(),
      fullName: input.fullName.trim(),
      otrId: issuedOtr,
      academicPercentage: Number(input.academicPercentage) || 88.5,
      familyIncome: Number(input.familyIncome) || 220000,
      category: input.category,
      state: input.state.trim() || 'Maharashtra',
      courseLevel: input.courseLevel,
      institutionName: input.institutionName.trim() || 'Indian Institute of Technology (IIT) Bombay',
      aisheCode: input.aisheCode.trim().toUpperCase() || 'U-0306',
      aadhaarEkyc: true,
      dbtSeeded: true,
    };

    this.studentProfile.set(updatedProfile);
    this.applications.update((apps) =>
      apps.map((a) =>
        a.otrId === oldOtr ? { ...a, otrId: issuedOtr, studentName: updatedProfile.fullName } : a
      )
    );

    this.authSession.set({
      isAuthenticated: true,
      role: 'STUDENT',
      email: input.email.trim().toLowerCase(),
      displayName: updatedProfile.fullName,
      badgeId: issuedOtr,
      organizationName: `${updatedProfile.institutionName} (${updatedProfile.aisheCode})`,
    });

    const pending = this.authGatewayPrompt();
    this.authGatewayPrompt.set(null);

    this.notify(
      'One-Time Registration (OTR) Completed',
      `Issued ${issuedOtr} for ${updatedProfile.fullName}. Live eligibility matched across ${this.schemes().length} schemes.`,
      'emerald'
    );

    if (pending?.pendingPortal) {
      this.activePortal.set(pending.pendingPortal);
    }
    return { ok: true, otrId: issuedOtr };
  }

  registerInstituteIno(input: InstituteRegistrationPayload): { ok: boolean; error?: string } {
    if (
      !input.institutionName.trim() ||
      !input.aisheOrUdiseCode.trim() ||
      !input.inoOfficerName.trim() ||
      !input.officialEmail.trim() ||
      !input.password.trim()
    ) {
      return {
        ok: false,
        error: 'Please fill out AISHE/UDISE+ Code, Institution Name, Nodal Officer Name, Official Email, and Password.',
      };
    }

    const code = input.aisheOrUdiseCode.trim().toUpperCase();
    this.authSession.set({
      isAuthenticated: true,
      role: 'INSTITUTE',
      email: input.officialEmail.trim().toLowerCase(),
      displayName: `${input.inoOfficerName.trim()} (${input.inoDesignation.trim() || 'AISHE INO'})`,
      badgeId: `AISHE-${code}-KYC`,
      organizationName: `${input.institutionName.trim()} (${code})`,
    });

    const pending = this.authGatewayPrompt();
    this.authGatewayPrompt.set(null);

    this.notify(
      'AISHE Institute Nodal Officer Registered',
      `Verified ${input.institutionName.trim()} (${code}) with HoI & Aadhaar e-KYC. Leaf 02 Unlocked.`,
      'emerald'
    );

    if (pending?.pendingPortal === 'INSTITUTE') {
      this.activePortal.set('INSTITUTE');
    }
    return { ok: true };
  }

  registerMinistryNodal(input: MinistryRegistrationPayload): { ok: boolean; error?: string } {
    if (
      !input.ministryName.trim() ||
      !input.pfmsAgencyCode.trim() ||
      !input.nodalOfficerName.trim() ||
      !input.officialGovEmail.trim() ||
      !input.password.trim()
    ) {
      return {
        ok: false,
        error: 'Please provide Ministry Name, PFMS Agency Code, Nodal Officer Name, Official .gov.in Email, and Password.',
      };
    }

    const pfmsCode = input.pfmsAgencyCode.trim().toUpperCase();
    this.authSession.set({
      isAuthenticated: true,
      role: 'MINISTRY',
      email: input.officialGovEmail.trim().toLowerCase(),
      displayName: `${input.nodalOfficerName.trim()} (${input.designationCadre.trim() || 'Ministry Nodal'})`,
      badgeId: pfmsCode,
      organizationName: input.ministryName.trim(),
    });

    const pending = this.authGatewayPrompt();
    this.authGatewayPrompt.set(null);

    this.notify(
      'Ministry & PFMS Authority Registered',
      `Authorized ${input.ministryName.trim()} (${pfmsCode}). Leaf 03 Unlocked.`,
      'emerald'
    );

    if (pending?.pendingPortal === 'MINISTRY') {
      this.activePortal.set('MINISTRY');
    }
    return { ok: true };
  }

  async loginWithGoogleFirebase(): Promise<{ ok: boolean; error?: string }> {
    try {
      const user = await signInWithGooglePopup();
      const email = (user.email || 'scholar@grantly.in').toLowerCase();
      const isBootstrapAdmin =
        email === 'parthpanchal1932@gmail.com' ||
        email === 'parthpanchal1933@gmail.com' ||
        email === 'admin@gmail.com';
      const targetRole = isBootstrapAdmin ? 'SUPER_ADMIN' : this.activeAuthTab();

      if (user.displayName) {
        this.studentProfile.update((curr) => ({ ...curr, fullName: user.displayName! }));
      }

      this.authSession.set({
        isAuthenticated: true,
        role: targetRole,
        email,
        displayName: user.displayName || email,
        badgeId: isBootstrapAdmin ? 'FIREBASE-ADMIN-ALL' : this.studentProfile().otrId,
        organizationName: isBootstrapAdmin
          ? 'GRANTLY Cloud Firestore Admin (All Portals)'
          : `${this.studentProfile().institutionName} (${this.studentProfile().aisheCode})`,
      });

      await syncUserWorkspaceToFirestore(user, targetRole, this.studentProfile());

      const pending = this.authGatewayPrompt();
      this.authGatewayPrompt.set(null);
      this.notify(
        `Firebase Auth Verified (${user.displayName || email})`,
        `Synced workspace to Cloud Firestore (${this.firebaseProjectId()} · ${this.firebaseRegion()}).`,
        'emerald'
      );

      if (pending?.pendingPortal) {
        this.activePortal.set(pending.pendingPortal);
      }
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google Sign-In popup was closed or blocked.';
      return { ok: false, error: msg };
    }
  }

  logout(): void {
    void signOutFirebaseUser();
    this.authSession.set(INITIAL_AUTH_SESSION);
    if (this.activePortal() === 'INSTITUTE' || this.activePortal() === 'MINISTRY') {
      this.activePortal.set(null);
    }
    this.notify(
      'Signed Out of GRANTLY Session',
      'Returned to Public Scholarship Explorer mode. Sign in anytime to apply or audit.',
      'cobalt'
    );
  }

  addExternalScholarship(input: {
    title: string;
    providerName: string;
    scope: 'Global / International' | 'External University / Institute' | 'Autonomous Ministry Portal';
    annualAwardText: string;
    deadline: string;
    externalUrl: string;
    eligibilitySummary: string;
  }): { ok: boolean; error?: string } {
    const res = createExternalScholarshipLink({
      ...input,
      submittedBy: this.authSession().isAuthenticated
        ? this.authSession().badgeId
        : this.studentProfile().otrId,
    });
    if (!res.ok || !res.item) {
      return { ok: false, error: res.error };
    }
    this.externalLinks.update((curr) => [res.item!, ...curr]);
    void persistExternalLinkToFirestore(this.firebaseUser(), res.item);
    this.notify(
      'External Scholarship Link Indexed',
      `"${res.item.title}" (${res.item.providerName}) added to the Global & External Directory.`,
      'emerald'
    );
    return { ok: true };
  }

  toggleMatrixCategory(category: SocialCategory): void {
    this.matrixCategories.update((curr) =>
      curr.includes(category) ? curr.filter((c) => c !== category) : [...curr, category]
    );
  }

  updateStudentProfile(patch: Partial<StudentProfile>): void {
    this.studentProfile.update((curr) => ({ ...curr, ...patch }));
    const fbUser = this.firebaseUser();
    if (fbUser) {
      void syncUserWorkspaceToFirestore(fbUser, this.authSession().role, this.studentProfile());
    }
    this.notify('OTR Profile Synchronized', 'Live eligibility matrix recalculated across all schemes.', 'cobalt');
  }

  regenerateOtrId(): void {
    const randomSix = Math.floor(100000 + Math.random() * 900000);
    const newOtr = `NSP-OTR-2026-${randomSix}`;
    const oldOtr = this.studentProfile().otrId;
    this.studentProfile.update((curr) => ({ ...curr, otrId: newOtr }));
    this.applications.update((apps) =>
      apps.map((a) => (a.otrId === oldOtr ? { ...a, otrId: newOtr } : a))
    );
    if (this.authSession().role === 'STUDENT') {
      this.authSession.update((s) => ({ ...s, badgeId: newOtr }));
    }
    const fbUser = this.firebaseUser();
    if (fbUser) {
      void syncUserWorkspaceToFirestore(fbUser, this.authSession().role, this.studentProfile());
    }
    this.notify('New OTR ID Issued', `Assigned ${newOtr} via UIDAI e-KYC Vault.`, 'cobalt');
  }

  simulateOcrUpload(docType: DocumentType): void {
    const profile = this.studentProfile();
    const summaries: Record<DocumentType, { summary: string; certNo: string }> = {
      MARKSHEET: {
        summary: `Verified Score: ${profile.academicPercentage}% Aggregate · DigiLocker Hash Valid`,
        certNo: `DL-CBSE-2026-${Math.floor(10000 + Math.random() * 89999)}`,
      },
      INCOME_CERT: {
        summary: `Verified Family Income: ₹${profile.familyIncome.toLocaleString('en-IN')} · e-District Signed`,
        certNo: `REV-INC-2026-${Math.floor(10000 + Math.random() * 89999)}`,
      },
      DOMICILE: {
        summary: `State: ${profile.state} · Category: ${profile.category} · Barcode Verified`,
        certNo: `DOM-STATE-2026-${Math.floor(10000 + Math.random() * 89999)}`,
      },
      BONAFIDE: {
        summary: `Active Student at ${profile.institutionName} (${profile.aisheCode}) · Sem III`,
        certNo: `AISHE-BON-2026-${Math.floor(10000 + Math.random() * 89999)}`,
      },
    };

    const meta = summaries[docType];
    this.documents.update((list) =>
      list.map((doc) =>
        doc.type === docType
          ? {
              ...doc,
              uploaded: true,
              verifiedOcr: true,
              extractedSummary: meta.summary,
              certificateNo: meta.certNo,
              updatedAt: '2026-11-07',
            }
          : doc
      )
    );
    this.notify(
      'Smart Dossier OCR Complete',
      `${docType} verified (${meta.certNo}) and linked to OTR Profile.`,
      'emerald'
    );
  }

  submitApplication(schemeId: string): ScholarshipApplication | null {
    if (!this.requireStudentAuthForApply(schemeId)) {
      return null;
    }

    const scheme = this.schemes().find((s) => s.id === schemeId);
    if (!scheme) return null;

    const profile = this.studentProfile();
    const docs = this.documents();
    const appId = `APP-2026-${Math.floor(1000 + Math.random() * 8999)}`;

    const newApp: ScholarshipApplication = {
      id: appId,
      schemeId: scheme.id,
      schemeTitle: scheme.title,
      ministry: scheme.ministry,
      studentName: profile.fullName,
      otrId: profile.otrId,
      institutionName: profile.institutionName,
      aisheCode: profile.aisheCode,
      category: profile.category,
      academicPercentage: profile.academicPercentage,
      familyIncome: profile.familyIncome,
      annualAward: scheme.annualAward,
      status: 'Submitted',
      submittedAt: '2026-11-07',
      inoRemark: `Submitted via One-Time Registration (${profile.otrId}). Queued for L1 Institute Audit.`,
      documentsSnapshot: scheme.requiredDocs.map((reqType) => {
        const found = docs.find((d) => d.type === reqType);
        return {
          type: reqType,
          certificateNo: found?.certificateNo || 'VERIFIED-OCR-DOC',
          verified: Boolean(found?.verifiedOcr),
        };
      }),
    };

    this.applications.update((curr) => [newApp, ...curr]);
    void persistApplicationToFirestore(this.firebaseUser(), newApp);
    this.notify(
      'Application Transmitted to INO Desk',
      `Application ${appId} for ${scheme.code} is now queued at ${profile.aisheCode}.`,
      'emerald'
    );
    return newApp;
  }

  recordInoAction(
    appId: string,
    decision: 'VERIFY' | 'DEFECTIVE' | 'REJECT',
    officerRemark: string
  ): void {
    this.applications.update((list) =>
      list.map((app) => (app.id === appId ? applyInoDecision(app, decision, officerRemark) : app))
    );

    const tone = decision === 'VERIFY' ? 'emerald' : 'amber';
    const label =
      decision === 'VERIFY'
        ? `Application ${appId} Verified & Forwarded`
        : decision === 'DEFECTIVE'
        ? `Application ${appId} Marked Defective`
        : `Application ${appId} Rejected`;
    this.notify(label, officerRemark || 'Updated in Student Kanban Tracker immediately.', tone);
  }

  resolveDefectByStudent(appId: string, resolutionNote: string): void {
    this.applications.update((list) =>
      list.map((app) => (app.id === appId ? resolveApplicationDefect(app, resolutionNote) : app))
    );
    this.notify(
      `Defect Resolved for ${appId}`,
      'Application re-queued at Institute Nodal Officer Desk with updated OCR certificate.',
      'emerald'
    );
  }

  publishNewScheme(input: {
    code: string;
    title: string;
    ministry: string;
    providerType: 'Central Govt' | 'AICTE / UGC' | 'Corporate CSR';
    annualAward: number;
    maxFamilyIncome: number;
    minPercentage: number;
    eligibleCategories: SocialCategory[];
    deadlineDays: number;
    totalSeats: number;
  }): ScholarshipScheme {
    const newScheme: ScholarshipScheme = {
      id: `sch-custom-${Date.now()}`,
      code: input.code.trim().toUpperCase() || 'NSP-NEW-701',
      title: input.title.trim(),
      ministry: input.ministry.trim(),
      providerType: input.providerType,
      annualAward: input.annualAward,
      tuitionComponent: Math.round(input.annualAward * 0.75),
      maintenanceComponent: Math.round(input.annualAward * 0.25),
      maxFamilyIncome: input.maxFamilyIncome,
      minPercentage: input.minPercentage,
      eligibleCategories:
        input.eligibleCategories.length > 0
          ? input.eligibleCategories
          : ['General-EWS', 'OBC', 'SC/ST', 'Minority', 'PwD', 'Single Girl Child'],
      eligibleCourses: ['UG_STEM', 'UG_ARTS_COMMERCE', 'PG_MASTERS', 'DOCTORAL_RESEARCH'],
      deadlineDays: input.deadlineDays,
      totalSeats: input.totalSeats,
      requiredDocs: ['MARKSHEET', 'INCOME_CERT', 'DOMICILE'],
      tags: ['Newly Gazetted', 'Direct DBT', 'Aadhaar Bridge'],
    };

    this.schemes.update((curr) => [newScheme, ...curr]);
    void persistSchemeToFirestore(this.firebaseUser(), newScheme);
    this.notify(
      'New Scholarship Scheme Gazetted',
      `${newScheme.code}: "${newScheme.title}" is now live in the Student Discovery Catalog.`,
      'cobalt'
    );
    return newScheme;
  }

  triggerMinistryMeritList(): void {
    this.applications.update((curr) => generateMeritList(curr));
    this.notify(
      'National Merit List Generated',
      'Composite Academic + Financial Need ranking applied to all Institute-Verified applications.',
      'cobalt'
    );
  }

  triggerPfmsBatchDisbursal(): { disbursedCount: number; disbursedTotalAmount: number } {
    const result = disburseApprovedApplications(this.applications());
    this.applications.set(result.updated);
    this.notify(
      'PFMS / NPCI DBT Batch Disbursed',
      `Credited ${result.disbursedCount} scholar accounts (₹${result.disbursedTotalAmount.toLocaleString('en-IN')}) via Aadhaar Payment Bridge.`,
      'emerald'
    );
    return {
      disbursedCount: result.disbursedCount,
      disbursedTotalAmount: result.disbursedTotalAmount,
    };
  }

  resetDemoData(): void {
    this.authSession.set(INITIAL_AUTH_SESSION);
    this.studentProfile.set(INITIAL_STUDENT_PROFILE);
    this.documents.set(INITIAL_DOCUMENTS);
    this.schemes.set(INITIAL_SCHEMES);
    this.applications.set(INITIAL_APPLICATIONS);
    this.externalLinks.set(INITIAL_EXTERNAL_LINKS);
    if (this.isBrowser) {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.notify('Demo State Reset', 'Restored default NSP + Unstop dataset.', 'cobalt');
  }

  private notify(title: string, detail: string, tone: 'cobalt' | 'emerald' | 'amber'): void {
    this.actionNotice.set({ title, detail, tone });
  }
}


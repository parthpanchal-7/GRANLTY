import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { GrantlyStore, StudentSubTab } from './core/grantly-store';
import {
  CourseLevel,
  PortalMode,
  SocialCategory,
  formatCourseLevel,
  formatInr,
} from './core/scholarship-rules';
import { ThreeStage } from './components/three-stage/three-stage';
import { WorkspaceDrawer } from './components/workspace-drawer/workspace-drawer';

interface PreloaderLetter {
  char: string;
  index: number;
  visible: boolean;
}

interface PipelineStepInfo {
  stepNumber: string;
  title: string;
  subtitle: string;
  description: string;
  slaMetric: string;
  authority: string;
  targetPortal: PortalMode;
  targetSubTab?: StudentSubTab;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, ThreeStage, WorkspaceDrawer],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly fb = inject(FormBuilder);
  readonly store = inject(GrantlyStore);

  readonly formatInr = formatInr;
  readonly formatCourseLevel = formatCourseLevel;

  // 1. Sequential G-R-A-N-T-L-Y Preloader State (140ms per character)
  readonly preloaderUnlocked = signal<boolean>(false);
  readonly preloaderLetters = signal<PreloaderLetter[]>([
    { char: 'G', index: 0, visible: false },
    { char: 'R', index: 1, visible: false },
    { char: 'A', index: 2, visible: false },
    { char: 'N', index: 3, visible: false },
    { char: 'T', index: 4, visible: false },
    { char: 'L', index: 5, visible: false },
    { char: 'Y', index: 6, visible: false },
  ]);

  // Synchronized Hero H1 Typewriter State
  readonly heroFullText =
    'GRANTLY, a unified scholarship finder and management portal.';
  readonly typedHeroCount = signal<number>(0);
  readonly typedHeroText = computed(() => this.heroFullText.slice(0, this.typedHeroCount()));
  readonly unTypedHeroText = computed(() => this.heroFullText.slice(this.typedHeroCount()));
  readonly heroTypingComplete = computed(() => this.typedHeroCount() >= this.heroFullText.length);

  // Live Ticking Countdown HUD ("SCHOLARSHIP CYCLE LOCKS IN: 14D : 08H : 32M : 45S")
  private remainingSeconds = 14 * 86400 + 8 * 3600 + 32 * 60 + 45;
  readonly countdownDisplay = signal<string>('14D : 08H : 32M : 45S');

  // Scroll Spine Progress (0 to 1) & Lusion-style dynamic wave undulation
  readonly scrollProgress = signal<number>(0.18);
  readonly scrollVelocityOffset = signal<number>(0);

  // SVG Spine Dash Offset (path total length = 3100)
  readonly spineTotalLength = 3100;
  readonly spineDashOffset = computed(() => {
    const p = this.scrollProgress();
    return Math.round(this.spineTotalLength * (1 - p));
  });

  // Lusion.co Scroll-Movable Cubic-Bezier Spine Path & Branch Nodes
  readonly spineAnchors = computed(() => {
    const p = this.scrollProgress();
    const v = this.scrollVelocityOffset();
    const sway1 = Math.round(Math.sin(p * Math.PI * 2.5) * 48 + v * 0.6);
    const sway2 = Math.round(Math.cos(p * Math.PI * 2.5) * 52 - v * 0.6);
    const sway3 = Math.round(Math.sin(p * Math.PI * 3.2) * 44 + v * 0.5);

    const n1x = 420 + sway1;
    const n2x = 780 + sway2;
    const n3x = 420 + sway3;
    const n4x = 600 - Math.round(sway1 * 0.5);

    const d = [
      `M 600 0`,
      `C 600 180, ${n1x} 260, ${n1x} 430`,
      `C ${n1x} 600, ${n2x} 700, ${n2x} 890`,
      `C ${n2x} 1080, ${n3x} 1200, ${n3x} 1390`,
      `C ${n3x} 1580, ${n4x + 140} 1720, ${n4x} 1920`,
      `C ${n4x - 90} 2080, 600 2200, 600 2360`,
    ].join(' ');

    return {
      pathD: d,
      n1: { x: n1x, y: 430 },
      n2: { x: n2x, y: 890 },
      n3: { x: n3x, y: 1390 },
      n4: { x: n4x, y: 1920 },
      terminal: { x: 600, y: 2360 },
    };
  });

  // Leader dot coordinate riding along the movable SVG spine
  readonly leaderDotPoint = computed(() => {
    const p = this.scrollProgress();
    const anchors = this.spineAnchors();
    const y = Math.min(2360, Math.max(70, Math.round(p * 2360)));
    const waveX =
      Math.sin((y / 2360) * Math.PI * 3.5 + p * 2.2) * 135 +
      (anchors.n1.x - 420) * 0.35;
    return { x: Math.round(600 + waveX), y };
  });

  readonly allCategories: SocialCategory[] = [
    'General-EWS',
    'OBC',
    'SC/ST',
    'Minority',
    'PwD',
    'Single Girl Child',
  ];

  readonly courseLevels: { id: CourseLevel; label: string }[] = [
    { id: 'UG_STEM', label: 'B.Tech / B.Sc (STEM)' },
    { id: 'UG_ARTS_COMMERCE', label: 'B.A. / B.Com / BBA' },
    { id: 'PG_MASTERS', label: 'M.Tech / M.Sc / MBA' },
    { id: 'DOCTORAL_RESEARCH', label: 'Ph.D. / Doctoral' },
  ];

  readonly pipelineSteps: PipelineStepInfo[] = [
    {
      stepNumber: '01',
      title: 'One-Time Registration (OTR) & UIDAI Face e-KYC',
      subtitle: 'Single permanent scholar identity across all Central & AICTE ministries',
      description:
        'Generate your immutable NSP-OTR ID linked with Aadhaar demographic & face authentication. Eliminates duplicate registrations across academic years.',
      slaMetric: 'Instant UIDAI Vault Token (< 15 Seconds)',
      authority: 'National Scholarship Portal & UIDAI Bridge',
      targetPortal: 'STUDENT',
      targetSubTab: 'OTR_PROFILE',
    },
    {
      stepNumber: '02',
      title: 'Smart Dossier Upload & Automated OCR Extraction',
      subtitle: 'Zero manual data entry mistakes via DigiLocker & e-District verification',
      description:
        'Upload Class XII/Semester Marksheets, Tehsildar Income Certificates, Domicile, and Institute Bonafide. Optical Character Recognition validates certificate serials automatically.',
      slaMetric: 'Real-Time Rule Matching across 100% Schemes',
      authority: 'DigiLocker & State e-District API',
      targetPortal: 'STUDENT',
      targetSubTab: 'DOSSIER',
    },
    {
      stepNumber: '03',
      title: 'AISHE Institute Nodal Officer (L1) Split-Screen Audit',
      subtitle: 'Transparent college-level verification with instant defect resolution loop',
      description:
        'Your enrolled AISHE college Nodal Officer audits attached certificates side-by-side. If a document is flagged Defective, it appears immediately on your Kanban board for 1-click re-submission.',
      slaMetric: 'L1 Verification Turnaround: 48 Hours',
      authority: 'AISHE Registered Institution Nodal Desk',
      targetPortal: 'INSTITUTE',
    },
    {
      stepNumber: '04',
      title: 'Automated Merit Ranking & PFMS Direct Bank Disbursal',
      subtitle: 'Zero-intermediary Direct Benefit Transfer via NPCI Aadhaar Payment Bridge',
      description:
        'Ministry algorithms rank L1-verified applications by academic merit and financial need slabs, triggering batch PFMS transfers directly into your Aadhaar-seeded bank account.',
      slaMetric: 'Direct NPCI Settlement with UTR Tracking',
      authority: 'Public Financial Management System (PFMS)',
      targetPortal: 'MINISTRY',
    },
  ];

  readonly showcaseFilter = signal<'ALL' | 'ELIGIBLE' | 'CENTRAL' | 'EXTERNAL'>('ALL');
  readonly showExternalSubmitForm = signal<boolean>(false);
  readonly externalFormFeedback = signal<string | null>(null);

  readonly showcaseSchemes = computed(() => {
    const mode = this.showcaseFilter();
    const evalMap = this.store.schemeEvaluations();
    const all = this.store.schemes();
    if (mode === 'ELIGIBLE') {
      return all.filter((s) => evalMap.get(s.id)?.status === 'ELIGIBLE').slice(0, 4);
    }
    if (mode === 'CENTRAL') {
      return all.filter((s) => s.providerType === 'Central Govt').slice(0, 4);
    }
    return all.slice(0, 4);
  });

  // Unified Profile & Role Sign-In / Registration Forms
  readonly authFormFeedback = signal<{ text: string; tone: 'error' | 'success' } | null>(null);

  readonly signInForm = this.fb.nonNullable.group({
    email: ['aarav.sharma@iitb.ac.in', [Validators.required]],
    password: ['scholar2026', [Validators.required]],
  });

  readonly studentRegisterForm = this.fb.nonNullable.group({
    fullName: ['Aarav Sharma', [Validators.required]],
    email: ['aarav.sharma@iitb.ac.in', [Validators.required]],
    password: ['scholar2026', [Validators.required]],
    academicPercentage: [89.4, [Validators.required, Validators.min(35), Validators.max(100)]],
    familyIncome: [220000, [Validators.required, Validators.min(10000)]],
    category: ['General-EWS' as SocialCategory, [Validators.required]],
    state: ['Maharashtra', [Validators.required]],
    courseLevel: ['UG_STEM' as CourseLevel, [Validators.required]],
    institutionName: ['Indian Institute of Technology (IIT) Bombay', [Validators.required]],
    aisheCode: ['U-0306', [Validators.required]],
  });

  readonly instituteRegisterForm = this.fb.nonNullable.group({
    institutionName: ['Indian Institute of Technology (IIT) Bombay', [Validators.required]],
    aisheOrUdiseCode: ['U-0306', [Validators.required]],
    institutionCategory: ['AISHE University / College' as 'AISHE University / College' | 'UDISE+ School' | 'NCVT / ITI Polytechnic'],
    headOfInstituteName: ['Prof. Shireesh Kedare (Director / HoI)', [Validators.required]],
    inoOfficerName: ['Dr. V. K. Deshmukh', [Validators.required]],
    inoDesignation: ['Dean of Academic Programmes & AISHE Nodal Officer', [Validators.required]],
    officialEmail: ['ino.scholarship@iitb.ac.in', [Validators.required]],
    aadhaarLast4: ['4829', [Validators.required]],
    password: ['ino2026', [Validators.required]],
  });

  readonly ministryRegisterForm = this.fb.nonNullable.group({
    ministryName: ['Ministry of Education (Dept. of Higher Education)', [Validators.required]],
    pfmsAgencyCode: ['PFMS-MOE-DBT-01', [Validators.required]],
    nodalOfficerName: ['Shri R. K. Mahajan, IAS', [Validators.required]],
    designationCadre: ['Joint Secretary (National Scholarship Division)', [Validators.required]],
    officialGovEmail: ['nodal.dbt@education.gov.in', [Validators.required]],
    password: ['ministry2026', [Validators.required]],
  });

  readonly externalLinkForm = this.fb.nonNullable.group({
    title: ['', [Validators.required]],
    providerName: ['', [Validators.required]],
    scope: ['Global / International' as 'Global / International' | 'External University / Institute' | 'Autonomous Ministry Portal'],
    annualAwardText: ['Full Tuition + Living Stipend', [Validators.required]],
    deadline: ['31 Mar 2027', [Validators.required]],
    externalUrl: ['', [Validators.required]],
    eligibilitySummary: ['Direct application on provider portal; OTR eligibility pre-verified.', [Validators.required]],
  });

  private preloaderTimers: number[] = [];
  private countdownIntervalId = 0;
  private typewriterIntervalId = 0;
  private lastScrollTop = 0;

  private readonly onWindowScroll = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = Math.min(1, Math.max(0.16, (scrollTop / maxScroll) * 0.86 + 0.16));
    const delta = Math.max(-45, Math.min(45, scrollTop - this.lastScrollTop));
    this.lastScrollTop = scrollTop;
    this.scrollProgress.set(ratio);
    this.scrollVelocityOffset.set(delta);
  };

  ngOnInit(): void {
    if (!this.isBrowser) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      this.preloaderLetters.update((list) => list.map((item) => ({ ...item, visible: true })));
      this.preloaderUnlocked.set(true);
      this.startHeroTypewriter();
    } else {
      this.runSequentialPreloader();
    }

    this.countdownIntervalId = window.setInterval(() => {
      if (this.remainingSeconds > 0) {
        this.remainingSeconds--;
        this.countdownDisplay.set(this.formatCountdown(this.remainingSeconds));
      }
    }, 1000);

    window.addEventListener('scroll', this.onWindowScroll, { passive: true });
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    for (const t of this.preloaderTimers) {
      window.clearTimeout(t);
    }
    if (this.countdownIntervalId) {
      window.clearInterval(this.countdownIntervalId);
    }
    if (this.typewriterIntervalId) {
      window.clearInterval(this.typewriterIntervalId);
    }
    window.removeEventListener('scroll', this.onWindowScroll);
  }

  private runSequentialPreloader(): void {
    const staggerMs = 140;
    const letters = this.preloaderLetters();
    letters.forEach((item, index) => {
      const timerId = window.setTimeout(() => {
        this.preloaderLetters.update((curr) =>
          curr.map((l) => (l.index === index ? { ...l, visible: true } : l))
        );
      }, (index + 1) * staggerMs);
      this.preloaderTimers.push(timerId);
    });

    const unlockTimer = window.setTimeout(() => {
      this.preloaderUnlocked.set(true);
      this.startHeroTypewriter();
    }, letters.length * staggerMs + 420);
    this.preloaderTimers.push(unlockTimer);
  }

  unlockImmediately(): void {
    for (const t of this.preloaderTimers) {
      window.clearTimeout(t);
    }
    this.preloaderTimers = [];
    this.preloaderLetters.update((list) => list.map((item) => ({ ...item, visible: true })));
    this.preloaderUnlocked.set(true);
    this.startHeroTypewriter();
  }

  private startHeroTypewriter(): void {
    if (this.typewriterIntervalId) {
      window.clearInterval(this.typewriterIntervalId);
    }
    this.typedHeroCount.set(0);
    const totalLen = this.heroFullText.length;
    this.typewriterIntervalId = window.setInterval(() => {
      const next = Math.min(totalLen, this.typedHeroCount() + 2);
      this.typedHeroCount.set(next);
      if (next >= totalLen) {
        window.clearInterval(this.typewriterIntervalId);
        this.typewriterIntervalId = 0;
      }
    }, 20);
  }

  private formatCountdown(totalSecs: number): string {
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(days)}D : ${pad(hours)}H : ${pad(mins)}M : ${pad(secs)}S`;
  }

  onIncomeSliderChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    if (!Number.isNaN(val)) {
      this.store.calcIncome.set(val);
    }
  }

  onMarksSliderChange(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    if (!Number.isNaN(val)) {
      this.store.matrixMinMarks.set(val);
    }
  }

  openPortalFromCard(portal: PortalMode, subTab?: StudentSubTab): void {
    this.store.openPortal(portal, subTab);
  }

  handleSchemeApplyFromLanding(schemeId: string): void {
    if (!this.store.requireStudentAuthForApply(schemeId)) {
      return;
    }
    this.store.openPortal('STUDENT', 'BROWSER');
  }

  selectAuthRoleTab(role: 'STUDENT' | 'INSTITUTE' | 'MINISTRY'): void {
    this.store.activeAuthTab.set(role);
    this.authFormFeedback.set(null);
    if (role === 'STUDENT') {
      this.signInForm.patchValue({ email: 'aarav.sharma@iitb.ac.in', password: 'scholar2026' });
    } else if (role === 'INSTITUTE') {
      this.signInForm.patchValue({ email: 'ino.scholarship@iitb.ac.in', password: 'ino2026' });
    } else {
      this.signInForm.patchValue({ email: 'nodal.dbt@education.gov.in', password: 'ministry2026' });
    }
  }

  fillAdminBypassInForm(): void {
    this.signInForm.patchValue({
      email: 'admin@gmail.com',
      password: 'admin123',
    });
    this.store.loginAdminBypass();
    this.authFormFeedback.set({
      text: 'Admin Bypass Active (admin@gmail.com / admin123) — Full access granted to Student, AISHE Institute (Leaf 02), and Ministry (Leaf 03) portals.',
      tone: 'success',
    });
  }

  submitSignIn(): void {
    const { email, password } = this.signInForm.getRawValue();
    const res = this.store.loginWithCredentials(email, password, this.store.activeAuthTab());
    if (!res.ok) {
      this.authFormFeedback.set({ text: res.error || 'Authentication failed.', tone: 'error' });
      return;
    }
    this.authFormFeedback.set({
      text: `Signed in as ${this.store.authSession().displayName} (${this.store.authSession().badgeId}).`,
      tone: 'success',
    });
  }

  async signInWithGoogleFirebase(): Promise<void> {
    const res = await this.store.loginWithGoogleFirebase();
    if (!res.ok) {
      this.authFormFeedback.set({
        text: res.error || 'Google Sign-In could not complete.',
        tone: 'error',
      });
      return;
    }
    this.authFormFeedback.set({
      text: `Signed in via Firebase Google Auth as ${this.store.authSession().displayName} (${this.store.authSession().badgeId}).`,
      tone: 'success',
    });
  }

  submitStudentOtrRegistration(): void {
    const raw = this.studentRegisterForm.getRawValue();
    const res = this.store.registerStudentOtr({
      fullName: raw.fullName,
      email: raw.email,
      password: raw.password,
      academicPercentage: Number(raw.academicPercentage),
      familyIncome: Number(raw.familyIncome),
      category: raw.category,
      state: raw.state,
      courseLevel: raw.courseLevel,
      institutionName: raw.institutionName,
      aisheCode: raw.aisheCode,
    });
    if (!res.ok) {
      this.authFormFeedback.set({ text: res.error || 'Registration error.', tone: 'error' });
      return;
    }
    this.authFormFeedback.set({
      text: `OTR Registration Complete! Issued ID ${res.otrId}. Eligibility calculated across all active schemes.`,
      tone: 'success',
    });
  }

  submitInstituteRegistration(): void {
    const raw = this.instituteRegisterForm.getRawValue();
    const res = this.store.registerInstituteIno(raw);
    if (!res.ok) {
      this.authFormFeedback.set({ text: res.error || 'Institute verification failed.', tone: 'error' });
      return;
    }
    this.authFormFeedback.set({
      text: 'AISHE Institute Nodal Officer verified and signed in. Leaf 02 is now unlocked.',
      tone: 'success',
    });
  }

  submitMinistryRegistration(): void {
    const raw = this.ministryRegisterForm.getRawValue();
    const res = this.store.registerMinistryNodal(raw);
    if (!res.ok) {
      this.authFormFeedback.set({ text: res.error || 'Ministry verification failed.', tone: 'error' });
      return;
    }
    this.authFormFeedback.set({
      text: 'Ministry & PFMS Nodal Authority verified and signed in. Leaf 03 is now unlocked.',
      tone: 'success',
    });
  }

  submitExternalScholarshipLink(): void {
    const raw = this.externalLinkForm.getRawValue();
    const res = this.store.addExternalScholarship(raw);
    if (!res.ok) {
      this.externalFormFeedback.set(res.error || 'Please complete all required external scholarship link fields.');
      return;
    }
    this.externalFormFeedback.set('External scholarship link added to the Global & External Directory.');
    this.externalLinkForm.reset({
      title: '',
      providerName: '',
      scope: 'Global / International',
      annualAwardText: 'Full Tuition + Living Stipend',
      deadline: '31 Mar 2027',
      externalUrl: '',
      eligibilitySummary: 'Direct application on provider portal; OTR eligibility pre-verified.',
    });
    this.showExternalSubmitForm.set(false);
  }
}


import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAidSlab,
  evaluateSchemeEligibility,
  filterSchemesByMatrix,
  applyInoDecision,
  resolveApplicationDefect,
  generateMeritList,
  disburseApprovedApplications,
  authenticateCredentials,
  canAccessPortal,
  canApplyForScholarship,
  createExternalScholarshipLink,
  INITIAL_AUTH_SESSION,
  INITIAL_STUDENT_PROFILE,
  INITIAL_DOCUMENTS,
  INITIAL_SCHEMES,
  INITIAL_APPLICATIONS,
} from './scholarship-rules';

test('calculateAidSlab computes full waiver for Tier-I low income and scales down for higher income', () => {
  const tier1 = calculateAidSlab(180000, 'UG_STEM', 'HOSTELLER');
  assert.equal(tier1.reimbursementRatio, 100);
  assert.equal(tier1.tuitionWaiver, 125000);
  assert.equal(tier1.hostelMaintenance, 48000);
  assert.equal(tier1.totalAnnualAid, 125000 + 48000 + 12000);

  const tier3 = calculateAidSlab(800000, 'UG_STEM', 'DAY_SCHOLAR');
  assert.equal(tier3.reimbursementRatio, 30);
  assert.ok(tier3.totalAnnualAid < tier1.totalAnnualAid);
});

test('filterSchemesByMatrix filters schemes by category and minimum marks threshold', () => {
  const highMarksMatches = filterSchemesByMatrix(INITIAL_SCHEMES, ['General-EWS'], 90);
  assert.equal(highMarksMatches.length, INITIAL_SCHEMES.length);

  const lowMarksMatches = filterSchemesByMatrix(INITIAL_SCHEMES, ['General-EWS'], 72);
  assert.ok(lowMarksMatches.length < INITIAL_SCHEMES.length);
  assert.ok(lowMarksMatches.every((s) => s.minPercentage <= 72));
});

test('evaluateSchemeEligibility distinguishes ELIGIBLE, DOC_MISSING, and INELIGIBLE', () => {
  const pmUsp = INITIAL_SCHEMES.find((s) => s.id === 'sch-pm-usp')!;
  const evalEligible = evaluateSchemeEligibility(INITIAL_STUDENT_PROFILE, INITIAL_DOCUMENTS, pmUsp);
  assert.equal(evalEligible.status, 'ELIGIBLE');
  assert.equal(evalEligible.matchPercent, 100);
  assert.equal(evalEligible.missingDocs.length, 0);

  const pragati = INITIAL_SCHEMES.find((s) => s.id === 'sch-aicte-pragati')!;
  const evalMissingDoc = evaluateSchemeEligibility(INITIAL_STUDENT_PROFILE, INITIAL_DOCUMENTS, pragati);
  assert.equal(evalMissingDoc.status, 'DOC_MISSING');
  assert.deepEqual(evalMissingDoc.missingDocs, ['BONAFIDE']);

  const highIncomeProfile = { ...INITIAL_STUDENT_PROFILE, familyIncome: 950000 };
  const evalIneligible = evaluateSchemeEligibility(highIncomeProfile, INITIAL_DOCUMENTS, pmUsp);
  assert.equal(evalIneligible.status, 'INELIGIBLE');
});

test('INO defect decision and Student defect resolution synchronize state cleanly', () => {
  const submittedApp = INITIAL_APPLICATIONS[0];
  assert.equal(submittedApp.status, 'Submitted');

  const defectiveApp = applyInoDecision(
    submittedApp,
    'DEFECTIVE',
    'Income Certificate QR code blurred; please re-upload e-District copy.'
  );
  assert.equal(defectiveApp.status, 'Defective');
  assert.equal(
    defectiveApp.defectReason,
    'Income Certificate QR code blurred; please re-upload e-District copy.'
  );

  const resolvedApp = resolveApplicationDefect(
    defectiveApp,
    'Re-uploaded high-res e-District Income Certificate #MH-REV-INC-2026-99201'
  );
  assert.equal(resolvedApp.status, 'Submitted');
  assert.equal(resolvedApp.defectReason, undefined);
  assert.ok(resolvedApp.inoRemark.includes('Student Re-submitted'));
});

test('Ministry merit list generation and PFMS batch disbursal update statuses and assign UTR IDs', () => {
  const ranked = generateMeritList(INITIAL_APPLICATIONS);
  const approvedApps = ranked.filter((a) => a.status === 'Ministry Approved');
  assert.ok(approvedApps.length >= 2);
  assert.ok(approvedApps.every((a) => typeof a.meritRank === 'number' && (a.meritScore ?? 0) > 0));

  const { updated, disbursedCount, disbursedTotalAmount } = disburseApprovedApplications(ranked);
  assert.equal(disbursedCount, approvedApps.length);
  assert.ok(disbursedTotalAmount > 0);
  const disbursedApps = updated.filter((a) => a.status === 'Disbursed');
  assert.equal(disbursedApps.length, approvedApps.length);
  assert.ok(disbursedApps.every((a) => a.pfmsTransactionId?.startsWith('PFMS-DBT-2026-')));
});

test('Role-based access control restricts Leaf 02 (INSTITUTE) and Leaf 03 (MINISTRY) while admin@gmail.com / admin123 bypasses all', () => {
  // Guest can explore STUDENT catalog, cannot access INSTITUTE or MINISTRY, and cannot submit application without sign-in
  assert.equal(canAccessPortal(INITIAL_AUTH_SESSION, 'STUDENT'), true);
  assert.equal(canAccessPortal(INITIAL_AUTH_SESSION, 'INSTITUTE'), false);
  assert.equal(canAccessPortal(INITIAL_AUTH_SESSION, 'MINISTRY'), false);
  assert.equal(canApplyForScholarship(INITIAL_AUTH_SESSION), false);

  // Student login unlocks applying, but STILL blocks Leaf 02 (INSTITUTE) and Leaf 03 (MINISTRY)
  const studentLogin = authenticateCredentials('aarav@iitb.ac.in', 'pass1234', 'STUDENT');
  assert.equal(studentLogin.ok, true);
  assert.equal(canApplyForScholarship(studentLogin.session!), true);
  assert.equal(canAccessPortal(studentLogin.session!, 'INSTITUTE'), false);
  assert.equal(canAccessPortal(studentLogin.session!, 'MINISTRY'), false);

  // Universal Admin Bypass (admin@gmail.com / admin123) unlocks ALL 3 portals and scholarship application
  const adminBypass = authenticateCredentials('admin@gmail.com', 'admin123', 'STUDENT');
  assert.equal(adminBypass.ok, true);
  assert.equal(adminBypass.session?.role, 'SUPER_ADMIN');
  assert.equal(canAccessPortal(adminBypass.session!, 'STUDENT'), true);
  assert.equal(canAccessPortal(adminBypass.session!, 'INSTITUTE'), true);
  assert.equal(canAccessPortal(adminBypass.session!, 'MINISTRY'), true);
  assert.equal(canApplyForScholarship(adminBypass.session!), true);
});

test('createExternalScholarshipLink normalizes URLs and validates required fields', () => {
  const res = createExternalScholarshipLink({
    title: 'Oxford Felix Postgraduate Scholarship',
    providerName: 'University of Oxford',
    scope: 'Global / International',
    annualAwardText: '100% Course Fees + £18,622 Living Grant',
    deadline: '10 Jan 2027',
    externalUrl: 'ox.ac.uk/admissions/graduate/fees-and-funding',
    eligibilitySummary: 'Indian nationals with First-Class degree applying via Oxford direct portal.',
    submittedBy: 'NSP-OTR-2026-884920',
  });
  assert.equal(res.ok, true);
  assert.equal(res.item?.externalUrl, 'https://ox.ac.uk/admissions/graduate/fees-and-funding');
});


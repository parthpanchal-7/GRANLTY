import { Router, Request, Response } from 'express';
import {
  INITIAL_EXTERNAL_LINKS,
  INITIAL_SCHEMES,
  calculateAidSlab,
  CourseLevel,
} from '../../frontend/src/app/core/scholarship-rules';

export const scholarshipApiRouter = Router();

/**
 * GET /api/health
 * Service & Firebase Cloud Firestore bridge health status.
 */
scholarshipApiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'grantly-backend-api',
    architecture: 'frontend + backend',
    firestoreRegion: 'asia-south1',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/schemes
 * Returns active national OTR scholarship schemes and indexed global/external scholarship links.
 */
scholarshipApiRouter.get('/schemes', (_req: Request, res: Response) => {
  res.json({
    totalNationalSchemes: INITIAL_SCHEMES.length,
    totalExternalLinks: INITIAL_EXTERNAL_LINKS.length,
    schemes: INITIAL_SCHEMES,
    externalLinks: INITIAL_EXTERNAL_LINKS,
  });
});

/**
 * POST /api/aid-slab/calculate
 * Computes Tuition Fee Waiver + Hostel Stipend + Book Grant for a given income and course level.
 */
scholarshipApiRouter.post('/aid-slab/calculate', (req: Request, res: Response) => {
  const familyIncome = Number(req.body?.familyIncome) || 220000;
  const courseLevel = (req.body?.courseLevel as CourseLevel) || 'UG_STEM';
  const residence = req.body?.residence === 'DAY_SCHOLAR' ? 'DAY_SCHOLAR' : 'HOSTELLER';
  const result = calculateAidSlab(familyIncome, courseLevel, residence);
  res.json({ ok: true, result });
});

/**
 * GET /api/pfms/status
 * Simulated PFMS / NPCI Aadhaar Payment Bridge gateway status.
 */
scholarshipApiRouter.get('/pfms/status', (_req: Request, res: Response) => {
  res.json({
    gateway: 'PFMS-NPCI-APB-2026',
    uidaiEkycVault: 'ONLINE',
    aisheDirectorySync: 'ONLINE',
    settlementSlaHours: 24,
  });
});

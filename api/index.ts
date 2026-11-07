import express from 'express';
import { scholarshipApiRouter } from '../backend/routes/scholarship.routes';

const app = express();
app.use(express.json());

// Mount backend API routes at both /api and root so Vercel rewrites match cleanly
app.use('/api', scholarshipApiRouter);
app.use('/', scholarshipApiRouter);

export default app;

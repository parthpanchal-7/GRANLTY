import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { scholarshipApiRouter } from './routes/scholarship.routes';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json());

/**
 * Mount Backend REST API Routes (/api/health, /api/schemes, /api/aid-slab/calculate, /api/pfms/status)
 */
app.use('/api', scholarshipApiRouter);

/**
 * Serve static frontend assets from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  })
);

/**
 * Handle all other requests by rendering the Angular frontend application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the Express backend server if this module is the main entry point, or if run via PM2.
 * Listens on PORT environment variable (defaults to 3000 in dev/Cloud Run or 4000 standalone).
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }
    console.log(`GRANTLY Backend Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI dev-server and cloud serverless functions.
 */
export const reqHandler = createNodeRequestHandler(app);

import express from 'express';
import multer from 'multer';
import { z } from 'zod';

import { requireAuth } from './auth/middleware.js';
import { createAuthRouter } from './auth/routes.js';
import { getDb } from './storage/db.js';
import { analyzeResumeVsJd } from './services/analyze.js';
import { extractTextFromFile } from './services/extractText.js';
import { getAiSuggestions } from './services/aiSuggest.js';
import { createAnalysisPdf } from './services/reportPdf.js';
import { fetchJobFromAdzuna, getCompaniesAndRoles } from './services/jobApi.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const AnalyzeBodySchema = z.object({
  jobDescription: z.string().min(1),
  resumeText: z.string().min(1)
});

const ProgressUpsertSchema = z.object({
  weekOf: z.string().min(1),
  dsa: z.number().min(0).max(100),
  projects: z.number().min(0).max(100),
  skills: z.number().min(0).max(100),
  notes: z.string().optional().default('')
});

const AutoCheckSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  resumeText: z.string().min(1)
});

export async function createAppRouter() {
  const db = await getDb();
  const router = express.Router();

  router.use('/auth', createAuthRouter({ db }));

  router.post('/analyze', requireAuth, async (req, res) => {
    const parsed = AnalyzeBodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });

    const { jobDescription, resumeText } = parsed.data;
    const result = analyzeResumeVsJd({ resumeText, jobDescription });
    const ai = await getAiSuggestions({ resumeText, jobDescription, inferredRole: result.inferredRole });
    if (ai) {
      result.suggestions = Array.from(new Set([...(result.suggestions || []), ...(ai.suggestions || [])]));
      const extraMissing = (ai.missingKeywords || []).filter((x) => !(result.gaps?.missingSkills || []).includes(x));
      result.gaps.missingSkills = Array.from(new Set([...(result.gaps?.missingSkills || []), ...extraMissing]));
      result.gaps.missingKeywords = result.gaps.missingSkills;
      result.ai = { enabled: true, model: process.env.OPENAI_MODEL || 'gpt-4o-mini' };
    } else {
      result.ai = { enabled: false };
    }

    const analysisId = db.insertAnalysis({
      userId: req.auth.userId,
      resumeText,
      jobDescription,
      resultJson: JSON.stringify(result)
    });

    res.json({ analysisId, result });
  });

  router.post('/analyze/upload', requireAuth, upload.single('resume'), async (req, res) => {
    const jobDescription = String(req.body?.jobDescription || '');
    if (!jobDescription.trim()) return res.status(400).json({ error: 'jobDescription is required' });
    if (!req.file) return res.status(400).json({ error: 'resume file is required' });

    let resumeText = '';
    try {
      resumeText = await extractTextFromFile({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype
      });
    } catch {
      return res.status(400).json({ error: 'Could not extract text from resume' });
    }

    if (!resumeText.trim()) return res.status(400).json({ error: 'Could not extract text from resume' });

    const result = analyzeResumeVsJd({ resumeText, jobDescription });
    const ai = await getAiSuggestions({ resumeText, jobDescription, inferredRole: result.inferredRole });
    if (ai) {
      result.suggestions = Array.from(new Set([...(result.suggestions || []), ...(ai.suggestions || [])]));
      const extraMissing = (ai.missingKeywords || []).filter((x) => !(result.gaps?.missingSkills || []).includes(x));
      result.gaps.missingSkills = Array.from(new Set([...(result.gaps?.missingSkills || []), ...extraMissing]));
      result.gaps.missingKeywords = result.gaps.missingSkills;
      result.ai = { enabled: true, model: process.env.OPENAI_MODEL || 'gpt-4o-mini' };
    } else {
      result.ai = { enabled: false };
    }
    const analysisId = db.insertAnalysis({
      userId: req.auth.userId,
      resumeText,
      jobDescription,
      resultJson: JSON.stringify(result)
    });

    res.json({ analysisId, resumeText, result });
  });

  router.get('/analysis/:id', requireAuth, (req, res) => {
    const id = String(req.params.id || '');
    const row = db.getAnalysisByIdForUser({ id, userId: req.auth.userId });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json({
      id: row.id,
      createdAt: row.createdAt,
      resumeText: row.resumeText,
      jobDescription: row.jobDescription,
      result: JSON.parse(row.resultJson)
    });
  });

  router.get('/analysis/:id/report.pdf', requireAuth, (req, res) => {
    const id = String(req.params.id || '');
    const row = db.getAnalysisByIdForUser({ id, userId: req.auth.userId });
    if (!row) return res.status(404).json({ error: 'Not found' });

    const result = JSON.parse(row.resultJson);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=skill2hire-report-${id}.pdf`);
    const doc = createAnalysisPdf({
      analysis: {
        id: row.id,
        createdAt: row.createdAt,
        jobDescription: row.jobDescription,
        resumeText: row.resumeText,
        result
      }
    });
    doc.pipe(res);
    doc.end();
  });

  router.post('/progress', requireAuth, (req, res) => {
    const parsed = ProgressUpsertSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });

    const saved = db.upsertProgress({ userId: req.auth.userId, ...parsed.data });
    res.json(saved);
  });

  router.get('/progress', requireAuth, (req, res) => {
    const rows = db.listProgress(req.auth.userId);
    res.json({ userId: req.auth.userId, rows });
  });

  // Auto-checker endpoints
  router.get('/auto/companies-roles', requireAuth, (req, res) => {
    const data = getCompaniesAndRoles();
    res.json(data);
  });

  router.get('/auto/jd', requireAuth, async (req, res) => {
    const company = String(req.query.company || '');
    const role = String(req.query.role || '');
    
    if (!company || !role) {
      return res.status(400).json({ error: 'company and role query parameters are required' });
    }

    try {
      const jobData = await fetchJobFromAdzuna(company, role);
      res.json(jobData);
    } catch (error) {
      console.error('Error fetching job description:', error);
      res.status(500).json({ error: 'Failed to fetch job description' });
    }
  });

  router.post('/auto/analyze', requireAuth, async (req, res) => {
    const parsed = AutoCheckSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });

    const { company, role, resumeText } = parsed.data;

    try {
      // Fetch job description
      const jobData = await fetchJobFromAdzuna(company, role);
      const jobDescription = jobData.description;

      // Analyze resume vs fetched JD
      const result = analyzeResumeVsJd({ resumeText, jobDescription });
      const ai = await getAiSuggestions({ resumeText, jobDescription, inferredRole: result.inferredRole });
      
      if (ai) {
        result.suggestions = Array.from(new Set([...(result.suggestions || []), ...(ai.suggestions || [])]));
        const extraMissing = (ai.missingKeywords || []).filter((x) => !(result.gaps?.missingSkills || []).includes(x));
        result.gaps.missingSkills = Array.from(new Set([...(result.gaps?.missingSkills || []), ...extraMissing]));
        result.gaps.missingKeywords = result.gaps.missingSkills;
        result.ai = { enabled: true, model: process.env.OPENAI_MODEL || 'gpt-4o-mini' };
      } else {
        result.ai = { enabled: false };
      }

      // Store analysis with job metadata
      const analysisId = db.insertAnalysis({
        userId: req.auth.userId,
        resumeText,
        jobDescription,
        resultJson: JSON.stringify({
          ...result,
          jobMetadata: {
            company,
            role,
            source: jobData.source,
            location: jobData.location,
            salary: jobData.salary
          }
        })
      });

      res.json({ 
        analysisId, 
        result: {
          ...result,
          jobMetadata: {
            company,
            role,
            source: jobData.source,
            location: jobData.location,
            salary: jobData.salary
          }
        }
      });
    } catch (error) {
      console.error('Error in auto analyze:', error);
      res.status(500).json({ error: 'Failed to analyze resume' });
    }
  });

  return router;
}

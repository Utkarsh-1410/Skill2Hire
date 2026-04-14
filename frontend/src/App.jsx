import React, { useEffect, useMemo, useState } from 'react';
import { analyzeResumeText, analyzeResumeUpload, downloadAnalysisPdf, getProgress, login, me, register, setAuthToken, upsertProgress, getCompaniesAndRoles, fetchJobDescription, autoAnalyzeResume } from './lib/api.js';
import { ScoreCard } from './components/ScoreCard.jsx';
import { SkillsChips } from './components/SkillsChips.jsx';

export default function App() {
  const [tab, setTab] = useState('analyze');
  const [auth, setAuth] = useState({ status: 'loading', user: null, error: '' });
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('skill2hire_theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('skill2hire_theme', theme);
  }, [theme]);

  useEffect(() => {
    (async () => {
      try {
        const r = await me();
        setAuth({ status: 'ready', user: r.user, error: '' });
      } catch {
        setAuth({ status: 'ready', user: null, error: '' });
      }
    })();
  }, []);

  if (auth.status !== 'ready') {
    return (
      <div className="page">
        <header className="topbar">
          <div className="brand">
            <div className="brand__title">Skill2Hire</div>
            <div className="brand__subtitle">Placement readiness, made measurable.</div>
          </div>
          <div className="nav">
            <button className="navbtn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
          </div>
        </header>
        <main className="content">
          <div className="card">Loading…</div>
        </main>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <div className="page">
        <header className="topbar">
          <div className="brand">
            <div className="brand__title">Skill2Hire</div>
            <div className="brand__subtitle">Placement readiness, made measurable.</div>
          </div>
          <div className="nav">
            <button className="navbtn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
          </div>
        </header>
        <main className="content">
          <AuthCard onAuthed={(user) => setAuth({ status: 'ready', user, error: '' })} />
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <div className="brand__title">Skill2Hire</div>
          <div className="brand__subtitle">Placement readiness, made measurable.</div>
        </div>
        <nav className="nav">
          <button className={tab === 'analyze' ? 'navbtn navbtn--active' : 'navbtn'} onClick={() => setTab('analyze')}>Analyze</button>
          <button className={tab === 'auto' ? 'navbtn navbtn--active' : 'navbtn'} onClick={() => setTab('auto')}>Auto-checker</button>
          <button className={tab === 'tracker' ? 'navbtn navbtn--active' : 'navbtn'} onClick={() => setTab('tracker')}>Tracker</button>
          <button className="navbtn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
        </nav>
      </header>

      <main className="content">
        {tab === 'analyze' ? <Analyze user={auth.user} /> : 
         tab === 'auto' ? <AutoChecker user={auth.user} /> : 
         <Tracker user={auth.user} />}
      </main>

      <footer className="footer">
        <span>Local demo build. Optional AI key supported.</span>
      </footer>
    </div>
  );
}

function Analyze({ user }) {
  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [analysisId, setAnalysisId] = useState(null);
  const [error, setError] = useState('');

  async function downloadPdf() {
    if (!analysisId) return;
    try {
      const blob = await downloadAnalysisPdf(analysisId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skill2hire-report-${analysisId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to download PDF');
    }
  }

  const canAnalyze = useMemo(() => {
    if (!jobDescription.trim()) return false;
    if (resumeFile) return true;
    return Boolean(resumeText.trim());
  }, [jobDescription, resumeFile, resumeText]);

  async function runAnalysis() {
    setError('');
    setLoading(true);
    setResult(null);
    setAnalysisId(null);

    try {
      if (resumeFile) {
        const r = await analyzeResumeUpload({ file: resumeFile, jobDescription });
        setResult(r.result);
        setAnalysisId(r.analysisId);
        if (r.resumeText) setResumeText(r.resumeText);
      } else {
        const r = await analyzeResumeText({ resumeText, jobDescription });
        setResult(r.result);
        setAnalysisId(r.analysisId);
      }
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid">
      <section className="card">
        <h2 className="h2">1) Job Description</h2>
        <textarea className="textarea" rows={10} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the job description here..." />
      </section>

      <section className="card">
        <h2 className="h2">2) Your Resume</h2>
        <div className="muted">Signed in as {user.email}</div>
        <div className="row">
          <input className="file" type="file" accept=".pdf,.docx,.txt" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
          <div className="muted">Upload PDF/DOCX/TXT (recommended). Or paste text below.</div>
        </div>
        <textarea className="textarea" rows={10} value={resumeText} onChange={(e) => setResumeText(e.target.value)} placeholder="Paste resume text (optional if you upload)..." />
        <div className="row row--space">
          <button className="btn" disabled={!canAnalyze || loading} onClick={runAnalysis}>{loading ? 'Analyzing…' : 'Analyze Resume Fit'}</button>
          {analysisId ? (
            <div className="row" style={{ alignItems: 'flex-end' }}>
              <div className="pill">Analysis ID: {analysisId}</div>
              <button className="navbtn" onClick={downloadPdf} disabled={loading}>Download PDF report</button>
            </div>
          ) : null}
        </div>
        {error ? <div className="error">{error}</div> : null}
      </section>

      {result ? (
        <section className="card card--full">
          <div className="resultsHeader">
            <h2 className="h2">Results</h2>
            <div className="muted">Fit score + strengths + gaps based on skills/keywords & ATS structure checks.</div>
          </div>

          <div className="resultsGrid">
            <ScoreCard fitScore={result.fitScore} subscores={result.subscores} atsChecks={result.atsChecks} />

            <div className="cardInner">
              <div className="h3">Role & Sections</div>
              <div className="kv"><span>Inferred role</span><span>{result.inferredRole || 'sde'}</span></div>
              <div className="kv"><span>Education</span><span>{result.resumeSections?.completeness?.hasEducation ? 'Yes' : 'No'}</span></div>
              <div className="kv"><span>Experience</span><span>{result.resumeSections?.completeness?.hasExperience ? 'Yes' : 'No'}</span></div>
              <div className="kv"><span>Projects</span><span>{result.resumeSections?.completeness?.hasProjects ? 'Yes' : 'No'}</span></div>
              <div className="kv"><span>Skills</span><span>{result.resumeSections?.completeness?.hasSkills ? 'Yes' : 'No'}</span></div>
              <div className="muted" style={{ marginTop: 8 }}>AI suggestions: {result.ai?.enabled ? `On (${result.ai.model})` : 'Off'}</div>
            </div>

            <div className="cardInner">
              <div className="h3">Missing Skills / Keywords</div>
              <SkillsChips items={result.gaps?.missingSkills || []} emptyLabel="No missing skills detected (for lexicon-covered skills)." />
            </div>

            <div className="cardInner">
              <div className="h3">Strengths</div>
              <ul className="list">
                {(result.strengths || []).length ? (result.strengths || []).map((s) => <li key={s}>{s}</li>) : <li className="muted">No strengths detected yet. Improve skill coverage & structure.</li>}
              </ul>
            </div>

            <div className="cardInner">
              <div className="h3">Suggestions</div>
              <ul className="list">
                {(result.suggestions || []).length ? (result.suggestions || []).map((s) => <li key={s}>{s}</li>) : <li className="muted">No suggestions.</li>}
              </ul>
            </div>

            <div className="cardInner">
              <div className="h3">Extracted Skills (Resume vs JD)</div>
              <div className="muted">Resume skills</div>
              <SkillsChips items={result.extracted?.resumeSkills || []} emptyLabel="None detected." />
              <div className="muted" style={{ marginTop: 12 }}>JD skills</div>
              <SkillsChips items={result.extracted?.jdSkills || []} emptyLabel="None detected." />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Tracker({ user }) {
  const [userId] = useState(user.id);
  const [weekOf, setWeekOf] = useState(getMondayISO());
  const [dsa, setDsa] = useState(40);
  const [projects, setProjects] = useState(40);
  const [skills, setSkills] = useState(40);
  const [notes, setNotes] = useState('');

  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setError('');
    setLoading(true);
    try {
      const r = await getProgress(userId);
      setRows(r.rows || []);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setError('');
    setLoading(true);
    try {
      await upsertProgress({ weekOf, dsa: Number(dsa), projects: Number(projects), skills: Number(skills), notes });
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid">
      <section className="card">
        <h2 className="h2">Weekly Readiness Tracker</h2>

        <div className="formGrid">
          <div className="muted" style={{ gridColumn: '1 / -1' }}>Signed in as {user.email}</div>
          <label className="label">
            <div className="label__title">Week of (Mon)</div>
            <input className="input" value={weekOf} onChange={(e) => setWeekOf(e.target.value)} placeholder="YYYY-MM-DD" />
          </label>

          <Range label="DSA" value={dsa} onChange={setDsa} />
          <Range label="Projects" value={projects} onChange={setProjects} />
          <Range label="Skills" value={skills} onChange={setSkills} />

          <label className="label" style={{ gridColumn: '1 / -1' }}>
            <div className="label__title">Notes</div>
            <textarea className="textarea" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you do this week?" />
          </label>

          <div className="row row--space" style={{ gridColumn: '1 / -1' }}>
            <button className="btn" disabled={loading} onClick={save}>{loading ? 'Saving…' : 'Save Week'}</button>
            <button className="btn btn--ghost" disabled={loading} onClick={refresh}>{loading ? 'Loading…' : 'Refresh'}</button>
          </div>

          {error ? <div className="error" style={{ gridColumn: '1 / -1' }}>{error}</div> : null}
        </div>
      </section>

      <section className="card">
        <h2 className="h2">History</h2>
        <div className="muted">Shows saved weekly readiness snapshots.</div>
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Week</th>
                <th>DSA</th>
                <th>Projects</th>
                <th>Skills</th>
                <th>Updated</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.weekOf}</td>
                    <td>{r.dsa}</td>
                    <td>{r.projects}</td>
                    <td>{r.skills}</td>
                    <td className="muted">{new Date(r.updatedAt).toLocaleString()}</td>
                    <td className="muted">{r.notes}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="muted">No data yet. Save your first week.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AuthCard({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    setLoading(true);
    try {
      const data = mode === 'login'
        ? await login({ email, password })
        : await register({ name, email, password });
      setAuthToken(data.token);
      const r = await me();
      onAuthed(r.user);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
      <h2 className="h2">Sign in to Skill2Hire</h2>
      <div className="muted">Create an account to save analyses and track progress.</div>

      <div className="row" style={{ marginTop: 12 }}>
        <div className="row row--space">
          <button className={mode === 'login' ? 'navbtn navbtn--active' : 'navbtn'} onClick={() => setMode('login')}>Login</button>
          <button className={mode === 'register' ? 'navbtn navbtn--active' : 'navbtn'} onClick={() => setMode('register')}>Register</button>
        </div>
      </div>

      {mode === 'register' ? (
        <label className="label">
          <div className="label__title">Name</div>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      ) : null}

      <label className="label" style={{ marginTop: 10 }}>
        <div className="label__title">Email</div>
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>

      <label className="label" style={{ marginTop: 10 }}>
        <div className="label__title">Password</div>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>

      <div className="row row--space" style={{ marginTop: 12 }}>
        <button className="btn" disabled={loading} onClick={submit}>{loading ? 'Please wait…' : (mode === 'login' ? 'Login' : 'Create account')}</button>
      </div>

      {error ? <div className="error">{error}</div> : null}
    </section>
  );
}

function Range({ label, value, onChange }) {
  return (
    <label className="label">
      <div className="label__title">{label}: {value}</div>
      <input className="range" type="range" min={0} max={100} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function getMondayISO() {
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split('T')[0];
}

function AutoChecker({ user }) {
  const [companies, setCompanies] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingJd, setLoadingJd] = useState(false);
  const [result, setResult] = useState(null);
  const [analysisId, setAnalysisId] = useState(null);
  const [error, setError] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobMetadata, setJobMetadata] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getCompaniesAndRoles();
        setCompanies(data.companies);
        setRoles(data.roles);
      } catch (e) {
        setError('Failed to load companies and roles');
      }
    })();
  }, []);

  async function fetchAndSetJobDescription() {
    if (!selectedCompany || !selectedRole) return;
    
    setLoadingJd(true);
    setError('');
    setJobDescription('');
    setJobMetadata(null);
    
    try {
      const jobData = await fetchJobDescription({ company: selectedCompany, role: selectedRole });
      setJobDescription(jobData.description);
      setJobMetadata({
        company: jobData.company,
        role: jobData.title,
        location: jobData.location,
        salary: jobData.salary,
        source: jobData.source
      });
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to fetch job description');
    } finally {
      setLoadingJd(false);
    }
  }

  useEffect(() => {
    if (selectedCompany && selectedRole) {
      fetchAndSetJobDescription();
    }
  }, [selectedCompany, selectedRole]);

  async function downloadPdf() {
    if (!analysisId) return;
    try {
      const blob = await downloadAnalysisPdf(analysisId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `skill2hire-auto-report-${analysisId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to download PDF');
    }
  }

  const canAnalyze = useMemo(() => {
    if (!selectedCompany || !selectedRole || !jobDescription.trim()) return false;
    if (resumeFile) return true;
    return Boolean(resumeText.trim());
  }, [selectedCompany, selectedRole, jobDescription, resumeFile, resumeText]);

  async function runAutoAnalysis() {
    setError('');
    setLoading(true);
    setResult(null);
    setAnalysisId(null);

    try {
      let resumeToAnalyze = resumeText;
      if (resumeFile) {
        // Extract text from file using the same API as regular analyze
        const r = await analyzeResumeUpload({ file: resumeFile, jobDescription });
        resumeToAnalyze = r.resumeText;
        setResumeText(resumeToAnalyze);
      }

      const r = await autoAnalyzeResume({ 
        company: selectedCompany, 
        role: selectedRole, 
        resumeText: resumeToAnalyze 
      });
      setResult(r.result);
      setAnalysisId(r.analysisId);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Failed to analyze resume');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid">
      <section className="card">
        <h2 className="h2">1) Select Company & Role</h2>
        <div className="row" style={{ gap: '1rem' }}>
          <label className="label" style={{ flex: 1 }}>
            <div className="label__title">Company</div>
            <select className="input" value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)}>
              <option value="">Select a company</option>
              {companies.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </label>
          <label className="label" style={{ flex: 1 }}>
            <div className="label__title">Role</div>
            <select className="input" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
              <option value="">Select a role</option>
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </label>
        </div>
        
        {loadingJd && <div className="muted">Fetching job description...</div>}
        
        {jobMetadata && (
          <div className="card" style={{ marginTop: '1rem', backgroundColor: '#f8f9fa' }}>
            <div className="label__title">Job Details</div>
            <div><strong>Company:</strong> {jobMetadata.company}</div>
            <div><strong>Role:</strong> {jobMetadata.role}</div>
            <div><strong>Location:</strong> {jobMetadata.location}</div>
            <div><strong>Salary:</strong> {jobMetadata.salary}</div>
            <div><strong>Source:</strong> {jobMetadata.source}</div>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="h2">2) Fetched Job Description</h2>
        <textarea 
          className="textarea" 
          rows={10} 
          value={jobDescription} 
          onChange={(e) => setJobDescription(e.target.value)} 
          placeholder="Job description will appear here after selecting company and role..."
          disabled={loadingJd}
        />
      </section>

      <section className="card">
        <h2 className="h2">3) Your Resume</h2>
        <div className="muted">Signed in as {user.email}</div>
        <div className="row">
          <input className="file" type="file" accept=".pdf,.docx,.txt" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
          <div className="muted">Upload PDF/DOCX/TXT (recommended). Or paste text below.</div>
        </div>
        <textarea className="textarea" rows={10} value={resumeText} onChange={(e) => setResumeText(e.target.value)} placeholder="Paste resume text (optional if you upload)..." />
        <div className="row row--space">
          <button className="btn" disabled={!canAnalyze || loading} onClick={runAutoAnalysis}>{loading ? 'Analyzing…' : 'Auto-Check Resume'}</button>
          {analysisId ? <button className="btn btn--secondary" onClick={downloadPdf}>Download PDF</button> : null}
        </div>
        {error ? <div className="error">{error}</div> : null}
      </section>

      {result ? (
        <>
          <ScoreCard score={result.score} subscores={result.subscores} />
          <section className="card">
            <h2 className="h2">Analysis Results</h2>
            <div className="label__title">Inferred Role</div>
            <div>{result.inferredRole}</div>
            {result.jobMetadata && (
              <div style={{ marginTop: '1rem' }}>
                <div className="label__title">Job Details</div>
                <div><strong>Company:</strong> {result.jobMetadata.company}</div>
                <div><strong>Role:</strong> {result.jobMetadata.role}</div>
                <div><strong>Location:</strong> {result.jobMetadata.location}</div>
                <div><strong>Salary:</strong> {result.jobMetadata.salary}</div>
                <div><strong>Source:</strong> {result.jobMetadata.source}</div>
              </div>
            )}
            <div className="label__title" style={{ marginTop: '1rem' }}>Suggestions</div>
            <ul>{result.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
            <div className="label__title" style={{ marginTop: '1rem' }}>Skill Gaps</div>
            <SkillsChips skills={result.gaps.missingSkills} />
          </section>
        </>
      ) : null}
    </div>
  );
}

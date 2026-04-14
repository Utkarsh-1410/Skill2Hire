import axios from 'axios';

axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('skill2hire_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function setAuthToken(token) {
  if (token) localStorage.setItem('skill2hire_token', token);
  else localStorage.removeItem('skill2hire_token');
}

export async function register({ name, email, password }) {
  const { data } = await axios.post('/api/auth/register', { name, email, password });
  return data;
}

export async function downloadAnalysisPdf(analysisId) {
  const { data } = await axios.get(`/api/analysis/${encodeURIComponent(analysisId)}/report.pdf`, {
    responseType: 'blob'
  });
  return data;
}

export async function login({ email, password }) {
  const { data } = await axios.post('/api/auth/login', { email, password });
  return data;
}

export async function me() {
  const { data } = await axios.get('/api/auth/me');
  return data;
}

export async function analyzeResumeText({ resumeText, jobDescription }) {
  const { data } = await axios.post('/api/analyze', { resumeText, jobDescription });
  return data;
}

export async function analyzeResumeUpload({ file, jobDescription }) {
  const form = new FormData();
  form.append('resume', file);
  form.append('jobDescription', jobDescription);

  const { data } = await axios.post('/api/analyze/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function upsertProgress(payload) {
  const { data } = await axios.post('/api/progress', payload);
  return data;
}

export async function getProgress(userId) {
  const { data } = await axios.get('/api/progress');
  return data;
}

export async function getCompaniesAndRoles() {
  const { data } = await axios.get('/api/auto/companies-roles');
  return data;
}

export async function fetchJobDescription({ company, role }) {
  const { data } = await axios.get('/api/auto/jd', {
    params: { company, role }
  });
  return data;
}

export async function autoAnalyzeResume({ company, role, resumeText }) {
  const { data } = await axios.post('/api/auto/analyze', { company, role, resumeText });
  return data;
}

export function scoreResume({ resumeText, jobDescription, resumeSkills, jdSkills, overlapSkills, missingSkills, role, resumeSections }) {
  const resumeLen = resumeText.trim().length;
  const jdLen = jobDescription.trim().length;

  const skillCoverage = jdSkills.length === 0 ? 0 : overlapSkills.length / jdSkills.length;
  const keywordDensity = computeKeywordDensity({ resumeText, keywords: overlapSkills });

  const hasProjectsSection = resumeSections?.completeness?.hasProjects ?? hasAny(resumeText, ['projects', 'project experience']);
  const hasSkillsSection = resumeSections?.completeness?.hasSkills ?? hasAny(resumeText, ['skills', 'technical skills']);
  const hasEducationSection = resumeSections?.completeness?.hasEducation ?? hasAny(resumeText, ['education']);
  const hasExperienceSection = resumeSections?.completeness?.hasExperience ?? hasAny(resumeText, ['experience', 'internship']);

  const actionVerbScore = actionVerbHeuristic(resumeText);

  const atsChecks = {
    lengthOk: resumeLen >= 800 && resumeLen <= 8000,
    hasSkillsSection,
    hasProjectsSection,
    hasEducationSection,
    hasExperienceSection,
    avoidsTablesImages: true
  };

  const subscores = {
    skillCoverage: round(skillCoverage * 100),
    keywordDensity: round(keywordDensity * 100),
    structure: round(((hasSkillsSection ? 1 : 0) + (hasProjectsSection ? 1 : 0) + (hasEducationSection ? 1 : 0) + (hasExperienceSection ? 1 : 0)) / 4 * 100),
    impactWriting: round(actionVerbScore * 100)
  };

  const fitScore = round(
    subscores.skillCoverage * 0.55 +
      subscores.keywordDensity * 0.15 +
      subscores.structure * 0.15 +
      subscores.impactWriting * 0.15
  );

  const strengths = [];
  if (subscores.skillCoverage >= 70) strengths.push('Strong alignment with required skills');
  if (subscores.structure >= 70) strengths.push('Resume structure looks recruiter-friendly');
  if (subscores.impactWriting >= 60) strengths.push('Good use of action verbs and outcomes');

  const suggestions = [];
  if (missingSkills.length > 0) suggestions.push(`Add missing skills/keywords: ${missingSkills.slice(0, 10).join(', ')}${missingSkills.length > 10 ? '…' : ''}`);
  if (!hasProjectsSection) suggestions.push('Add a dedicated Projects section with 2–3 placement-ready projects and measurable impact');
  if (!hasExperienceSection) suggestions.push('Add an Experience/Internships section (even academic/club work counts if presented professionally)');
  if (actionVerbScore < 0.55) suggestions.push('Rewrite bullet points using action verbs + metrics (e.g., “Reduced latency by 30%”)');
  if (resumeLen < 800) suggestions.push('Resume looks too short—add relevant coursework, projects, and quantified achievements');
  if (resumeLen > 8000) suggestions.push('Resume looks too long—trim to the most relevant content for the target role');
  if (jdLen < 200) suggestions.push('Job description is short—paste a fuller JD for better matching');

  if (role === 'data_analyst') suggestions.push('For Data Analyst roles: highlight SQL projects, dashboards, and measurable business insights');
  if (role === 'devops') suggestions.push('For DevOps roles: highlight CI/CD pipelines, Docker/K8s, infra-as-code, and reliability outcomes');
  if (role === 'ml') suggestions.push('For ML roles: highlight datasets, evaluation metrics, and deployment/MLOps (not just model training)');

  return { fitScore, subscores, strengths, suggestions, atsChecks };
}

function hasAny(text, needles) {
  const t = String(text).toLowerCase();
  return needles.some((n) => t.includes(n.toLowerCase()));
}

function computeKeywordDensity({ resumeText, keywords }) {
  if (keywords.length === 0) return 0;
  const t = String(resumeText).toLowerCase();
  let hits = 0;
  for (const k of keywords) {
    const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(k)}([^a-z0-9]|$)`, 'g');
    const m = t.match(re);
    if (m) hits += m.length;
  }
  const tokens = t.split(/\s+/).filter(Boolean).length || 1;
  return Math.min(1, hits / (tokens / 40));
}

function actionVerbHeuristic(text) {
  const verbs = [
    'built', 'designed', 'implemented', 'developed', 'optimized', 'improved', 'led', 'created',
    'reduced', 'increased', 'automated', 'deployed', 'integrated', 'analyzed', 'delivered'
  ];
  const t = String(text).toLowerCase();
  const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return 0;

  let hitLines = 0;
  for (const l of lines) {
    if (verbs.some((v) => l.startsWith(v) || l.includes(` ${v} `))) hitLines += 1;
  }
  return Math.min(1, hitLines / Math.max(8, lines.length));
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function round(n) {
  return Math.round(n);
}

const DEFAULT_SECTION_ALIASES = {
  education: ['education', 'academics', 'academic background'],
  experience: ['experience', 'work experience', 'internship', 'internships'],
  projects: ['projects', 'project experience', 'personal projects'],
  skills: ['skills', 'technical skills', 'skill set'],
  achievements: ['achievements', 'accomplishments', 'awards'],
  certifications: ['certifications', 'certificates'],
  links: ['links', 'profiles']
};

export function parseResumeSections(resumeText) {
  const lines = String(resumeText || '')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd());

  const headingHits = [];

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const normalized = raw.trim().toLowerCase();
    const key = matchHeading(normalized);
    if (key) {
      headingHits.push({ key, lineIndex: i });
    }
  }

  const sections = {};
  for (let idx = 0; idx < headingHits.length; idx += 1) {
    const h = headingHits[idx];
    const start = h.lineIndex + 1;
    const end = (headingHits[idx + 1] ? headingHits[idx + 1].lineIndex : lines.length);
    const body = lines.slice(start, end).join('\n').trim();
    if (body) sections[h.key] = body;
  }

  const has = (k) => Boolean(sections[k] && sections[k].trim().length > 0);

  return {
    sections,
    detectedHeadings: headingHits.map((x) => x.key),
    completeness: {
      hasEducation: has('education'),
      hasExperience: has('experience'),
      hasProjects: has('projects'),
      hasSkills: has('skills')
    }
  };
}

function matchHeading(normalizedLine) {
  if (!normalizedLine) return null;

  // Heuristics: many resumes have headings like "EDUCATION" or "Projects:".
  const cleaned = normalizedLine.replace(/[:\-–—]+\s*$/g, '').trim();

  for (const [key, aliases] of Object.entries(DEFAULT_SECTION_ALIASES)) {
    for (const a of aliases) {
      if (cleaned === a) return key;
      if (cleaned.startsWith(a + ' ')) return key;
    }
  }

  // Uppercase headings sometimes show up as e.g. "EDUCATION" already covered by lowercase normalization.
  return null;
}

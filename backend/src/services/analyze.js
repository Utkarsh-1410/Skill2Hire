import { buildSkillLexicon, extractSkills, inferRoleFromText } from './skills.js';
import { scoreResume } from './scoring.js';
import { parseResumeSections } from './resumeSections.js';

export function analyzeResumeVsJd({ resumeText, jobDescription }) {
  const roleInfo = inferRoleFromText(jobDescription);
  const lexicon = buildSkillLexicon({ role: roleInfo.role });
  const resumeSkills = extractSkills(resumeText, lexicon);
  const jdSkills = extractSkills(jobDescription, lexicon);

  const sectionParse = parseResumeSections(resumeText);

  const missingSkills = jdSkills.filter((s) => !resumeSkills.includes(s));
  const overlapSkills = jdSkills.filter((s) => resumeSkills.includes(s));

  const scoring = scoreResume({
    resumeText,
    jobDescription,
    resumeSkills,
    jdSkills,
    overlapSkills,
    missingSkills,
    role: roleInfo.role,
    resumeSections: sectionParse
  });

  return {
    inferredRole: roleInfo.role,
    roleScores: roleInfo.roleScores,
    fitScore: scoring.fitScore,
    subscores: scoring.subscores,
    strengths: scoring.strengths,
    resumeSections: sectionParse,
    gaps: {
      missingSkills,
      missingKeywords: missingSkills
    },
    extracted: {
      resumeSkills,
      jdSkills,
      overlapSkills
    },
    suggestions: scoring.suggestions,
    atsChecks: scoring.atsChecks
  };
}

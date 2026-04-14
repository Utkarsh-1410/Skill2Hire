export function getRoleSkillTaxonomy() {
  return {
    sde: [
      'c', 'c++', 'java', 'python', 'javascript', 'typescript', 'go', 'rust', 'c#', 'sql',
      'dsa', 'data structures', 'algorithms', 'oop', 'system design',
      'html', 'css', 'react', 'next.js', 'node.js', 'express', 'spring', 'spring boot',
      'rest', 'graphql', 'microservices', 'redis', 'kafka',
      'mysql', 'postgresql', 'mongodb',
      'git', 'ci/cd', 'docker'
    ],
    data_analyst: [
      'sql', 'mysql', 'postgresql',
      'python', 'pandas', 'numpy', 'scikit-learn',
      'excel', 'power bi', 'tableau',
      'statistics', 'hypothesis testing',
      'etl', 'data cleaning', 'data visualization',
      'bigquery', 'snowflake'
    ],
    devops: [
      'linux', 'bash', 'git', 'ci/cd',
      'docker', 'kubernetes', 'helm',
      'aws', 'azure', 'gcp',
      'terraform', 'ansible',
      'nginx', 'monitoring', 'prometheus', 'grafana',
      'sre'
    ],
    ml: [
      'python', 'pandas', 'numpy', 'scikit-learn',
      'machine learning', 'deep learning', 'nlp',
      'tensorflow', 'pytorch',
      'feature engineering', 'model evaluation',
      'mlops', 'docker', 'aws'
    ]
  };
}

export function buildSkillLexicon({ role } = {}) {
  const taxonomy = getRoleSkillTaxonomy();
  const all = Object.values(taxonomy).flat();
  const scoped = role && taxonomy[role] ? taxonomy[role] : all;

  const normalized = Array.from(new Set(scoped.map((s) => s.toLowerCase())));
  normalized.sort((a, b) => b.length - a.length);
  return normalized;
}

export function inferRoleFromText(text) {
  const t = String(text || '').toLowerCase();
  const taxonomy = getRoleSkillTaxonomy();

  const scores = Object.fromEntries(Object.keys(taxonomy).map((k) => [k, 0]));
  for (const [role, skills] of Object.entries(taxonomy)) {
    for (const s of skills) {
      const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(String(s).toLowerCase())}([^a-z0-9]|$)`, 'i');
      if (re.test(t)) scores[role] += 1;
    }
  }

  let best = 'sde';
  let bestScore = -1;
  for (const [k, v] of Object.entries(scores)) {
    if (v > bestScore) {
      best = k;
      bestScore = v;
    }
  }

  return { role: best, roleScores: scores };
}

export function extractSkills(text, lexicon) {
  const t = normalize(text);
  const found = [];

  for (const skill of lexicon) {
    const escaped = escapeRegExp(skill);
    const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
    if (re.test(t)) found.push(skill);
  }

  return Array.from(new Set(found));
}

function normalize(s) {
  return String(s).toLowerCase().replace(/\s+/g, ' ');
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

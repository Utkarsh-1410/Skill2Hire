export async function getAiSuggestions({ resumeText, jobDescription, inferredRole }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const prompt = [
    'You are a placement readiness assistant for students.',
    `Target role (inferred): ${inferredRole || 'unknown'}.`,
    'Given the resume text and job description, provide:',
    '1) 5-8 bullet suggestions to improve resume-job fit (skills, projects, phrasing).',
    '2) 5 keywords/skills to add if truthful.',
    'Be concise and practical. Do not hallucinate experience. Output JSON only with keys: suggestions (string[]), missingKeywords (string[]).'
  ].join('\n');

  const body = {
    model,
    messages: [
      { role: 'system', content: 'You are a helpful assistant that outputs strict JSON.' },
      {
        role: 'user',
        content: `${prompt}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nRESUME:\n${resumeText}`
      }
    ],
    temperature: 0.2
  };

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    return null;
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return null;

  const parsed = safeJsonParse(content);
  if (!parsed) return null;

  const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.filter((x) => typeof x === 'string') : null;
  const missingKeywords = Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords.filter((x) => typeof x === 'string') : null;

  if (!suggestions && !missingKeywords) return null;
  return { suggestions: suggestions || [], missingKeywords: missingKeywords || [] };
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    // Attempt to extract JSON block if wrapped in markdown
    const m = String(s).match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

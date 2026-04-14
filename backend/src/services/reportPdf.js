import PDFDocument from 'pdfkit';

export function createAnalysisPdf({ analysis }) {
  const doc = new PDFDocument({ size: 'A4', margin: 48 });

  const title = 'Skill2Hire Report';
  doc.fontSize(20).text(title, { align: 'left' });
  doc.moveDown(0.25);
  doc.fontSize(10).fillColor('#555').text(`Analysis ID: ${analysis.id}`);
  doc.text(`Created: ${analysis.createdAt}`);
  doc.moveDown();

  const r = analysis.result || {};
  doc.fillColor('#000');
  doc.fontSize(12).text(`Inferred role: ${String(r.inferredRole || 'sde')}`);
  doc.moveDown(0.5);
  doc.fontSize(14).text('Fit Score');
  doc.fontSize(28).text(String(r.fitScore ?? 0));
  doc.moveDown();

  doc.fontSize(14).text('Subscores');
  const subs = r.subscores || {};
  doc.fontSize(11);
  keyValue(doc, 'Skill coverage', subs.skillCoverage);
  keyValue(doc, 'Keyword density', subs.keywordDensity);
  keyValue(doc, 'Structure', subs.structure);
  keyValue(doc, 'Impact writing', subs.impactWriting);
  doc.moveDown();

  doc.fontSize(14).text('Missing skills / keywords');
  const missing = r.gaps?.missingSkills || [];
  doc.fontSize(11).text(missing.length ? missing.join(', ') : 'None detected');
  doc.moveDown();

  doc.fontSize(14).text('Strengths');
  const strengths = r.strengths || [];
  list(doc, strengths.length ? strengths : ['None detected']);
  doc.moveDown();

  doc.fontSize(14).text('Suggestions');
  const suggestions = r.suggestions || [];
  list(doc, suggestions.length ? suggestions : ['None']);
  doc.moveDown();

  doc.fontSize(14).text('ATS checks');
  const ats = r.atsChecks || {};
  doc.fontSize(11);
  keyValue(doc, 'Length OK', ats.lengthOk ? 'Yes' : 'No');
  keyValue(doc, 'Skills section', ats.hasSkillsSection ? 'Yes' : 'No');
  keyValue(doc, 'Projects section', ats.hasProjectsSection ? 'Yes' : 'No');
  keyValue(doc, 'Education section', ats.hasEducationSection ? 'Yes' : 'No');
  keyValue(doc, 'Experience section', ats.hasExperienceSection ? 'Yes' : 'No');

  return doc;
}

function keyValue(doc, k, v) {
  const vv = v === undefined || v === null ? '' : String(v);
  doc.text(`${k}: ${vv}`);
}

function list(doc, items) {
  for (const x of items) doc.text(`- ${x}`);
}

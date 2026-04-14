import React from 'react';

export function ScoreCard({ fitScore, subscores, atsChecks }) {
  return (
    <div className="score">
      <div className="score__top">
        <div className="score__label">Fit Score</div>
        <div className="score__value">{fitScore}</div>
        <div className="score__hint">0–100</div>
      </div>

      <div className="score__section">
        <div className="h3">Subscores</div>
        <div className="kv"><span>Skill coverage</span><span>{subscores?.skillCoverage ?? 0}</span></div>
        <div className="kv"><span>Keyword density</span><span>{subscores?.keywordDensity ?? 0}</span></div>
        <div className="kv"><span>Structure</span><span>{subscores?.structure ?? 0}</span></div>
        <div className="kv"><span>Impact writing</span><span>{subscores?.impactWriting ?? 0}</span></div>
      </div>

      <div className="score__section">
        <div className="h3">ATS checks</div>
        <div className="kv"><span>Length OK</span><span>{atsChecks?.lengthOk ? 'Yes' : 'No'}</span></div>
        <div className="kv"><span>Skills section</span><span>{atsChecks?.hasSkillsSection ? 'Yes' : 'No'}</span></div>
        <div className="kv"><span>Projects section</span><span>{atsChecks?.hasProjectsSection ? 'Yes' : 'No'}</span></div>
        <div className="kv"><span>Education section</span><span>{atsChecks?.hasEducationSection ? 'Yes' : 'No'}</span></div>
        <div className="kv"><span>Experience section</span><span>{atsChecks?.hasExperienceSection ? 'Yes' : 'No'}</span></div>
      </div>
    </div>
  );
}

import React from 'react';

export function SkillsChips({ items, emptyLabel }) {
  if (!items || items.length === 0) return <div className="muted">{emptyLabel}</div>;
  return (
    <div className="chips">
      {items.map((x) => (
        <span key={x} className="chip">{x}</span>
      ))}
    </div>
  );
}

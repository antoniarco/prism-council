import ReasoningSection from './ReasoningSection';

export default function AnalyzerReasoning({ clarificationState }) {
  if (!clarificationState) return null;

  const briefing = clarificationState.briefing || null;
  const history = Array.isArray(clarificationState.history) ? clarificationState.history : [];

  const hasStructured =
    !!briefing?.objective ||
    (Array.isArray(briefing?.key_facts) && briefing.key_facts.length > 0) ||
    (Array.isArray(briefing?.constraints) && briefing.constraints.length > 0) ||
    (Array.isArray(briefing?.unknowns) && briefing.unknowns.length > 0) ||
    (Array.isArray(briefing?.assumptions) && briefing.assumptions.length > 0);

  return (
    <ReasoningSection
      title="Analyzer reasoning"
      metadata={history.length > 0 ? `${history.length} answers` : null}
      defaultExpanded={true}
    >
      {briefing ? (
        <>
          {/* Primary: structured brief (high-signal) */}
          {hasStructured && (
            <div className="reasoning-grid">
              {briefing.objective && (
                <div className="reasoning-card">
                  <div className="reasoning-card-title">Objective</div>
                  <div className="reasoning-card-text">{briefing.objective}</div>
                </div>
              )}

              {Array.isArray(briefing.key_facts) && briefing.key_facts.length > 0 && (
                <div className="reasoning-card">
                  <div className="reasoning-card-title">Key facts</div>
                  <ul className="reasoning-list">
                    {briefing.key_facts.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(briefing.constraints) && briefing.constraints.length > 0 && (
                <div className="reasoning-card">
                  <div className="reasoning-card-title">Constraints</div>
                  <ul className="reasoning-list">
                    {briefing.constraints.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(briefing.unknowns) && briefing.unknowns.length > 0 && (
                <div className="reasoning-card">
                  <div className="reasoning-card-title">Open unknowns</div>
                  <ul className="reasoning-list">
                    {briefing.unknowns.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(briefing.assumptions) && briefing.assumptions.length > 0 && (
                <div className="reasoning-card">
                  <div className="reasoning-card-title">Assumptions</div>
                  <ul className="reasoning-list">
                    {briefing.assumptions.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* If no structured fields, show the brief text directly */}
          {!hasStructured && (
            <pre className="reasoning-pre">{briefing.briefing || ''}</pre>
          )}

          {/* Progressive disclosure: full raw brief */}
          {briefing?.briefing && hasStructured && (
            <details className="reasoning-disclosure" open={false}>
              <summary>Full brief (raw)</summary>
              <pre className="reasoning-pre">{briefing.briefing}</pre>
            </details>
          )}
        </>
      ) : (
        <div className="reasoning-muted">No analyzer briefing available.</div>
      )}

      {history.length > 0 && (
        <details className="reasoning-disclosure" open={false}>
          <summary>Clarification transcript</summary>
          <pre className="reasoning-pre">
            {history.map((a, i) => `A${i + 1}: ${a}`).join('\n\n')}
          </pre>
        </details>
      )}
    </ReasoningSection>
  );
}



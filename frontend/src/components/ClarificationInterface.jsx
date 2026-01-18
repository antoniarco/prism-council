import { useState } from 'react';
import './ClarificationInterface.css';

export default function ClarificationInterface({
  clarificationData,
  onSubmitAnswer,
  onConfirmBriefing,
  isLoading,
}) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (answer.trim() && !isLoading) {
      onSubmitAnswer(answer.trim());
      setAnswer('');
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // If we have a briefing, show it
  if (clarificationData?.type === 'briefing') {
    const hasStructured =
      !!clarificationData.objective ||
      (Array.isArray(clarificationData.key_facts) && clarificationData.key_facts.length > 0) ||
      (Array.isArray(clarificationData.constraints) && clarificationData.constraints.length > 0) ||
      (Array.isArray(clarificationData.unknowns) && clarificationData.unknowns.length > 0) ||
      (Array.isArray(clarificationData.assumptions) && clarificationData.assumptions.length > 0);

    return (
      <div className="message-group">
        <div className="assistant-message">
          <div className="message-header">
            <div className="message-label">Clarification Analyzer</div>
          </div>

          <div className="clarification-panel">
            <div className="clarification-title">Briefing summary</div>
            <div className="clarification-subtitle">
              Review and confirm — the council will deliberate based on this brief.
            </div>

            <div className="clarification-briefing">
              {/* Primary view: structured sections (high-signal). */}
              {!hasStructured && (
                <div className="clarification-section">
                  <div className="clarification-section-title">Brief</div>
                  <pre className="clarification-pre">{clarificationData.briefing || ''}</pre>
                </div>
              )}

              {clarificationData.objective && (
                <div className="clarification-section">
                  <div className="clarification-section-title">Objective</div>
                  <div className="clarification-text">{clarificationData.objective}</div>
                </div>
              )}

              {Array.isArray(clarificationData.key_facts) && clarificationData.key_facts.length > 0 && (
                <div className="clarification-section">
                  <div className="clarification-section-title">Key facts</div>
                  <ul className="clarification-list">
                    {clarificationData.key_facts.map((fact, i) => (
                      <li key={i}>{fact}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(clarificationData.constraints) && clarificationData.constraints.length > 0 && (
                <div className="clarification-section">
                  <div className="clarification-section-title">Constraints</div>
                  <ul className="clarification-list">
                    {clarificationData.constraints.map((constraint, i) => (
                      <li key={i}>{constraint}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(clarificationData.unknowns) && clarificationData.unknowns.length > 0 && (
                <div className="clarification-section">
                  <div className="clarification-section-title">Open unknowns</div>
                  <ul className="clarification-list">
                    {clarificationData.unknowns.map((unknown, i) => (
                      <li key={i}>{unknown}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(clarificationData.assumptions) && clarificationData.assumptions.length > 0 && (
                <div className="clarification-section">
                  <div className="clarification-section-title">Assumptions</div>
                  <ul className="clarification-list">
                    {clarificationData.assumptions.map((assumption, i) => (
                      <li key={i}>{assumption}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Progressive disclosure: raw brief text (optional). */}
              {hasStructured && clarificationData.briefing && (
                <details className="clarification-raw" open={false}>
                  <summary className="clarification-raw-summary">Full brief (raw)</summary>
                  <pre className="clarification-pre">{clarificationData.briefing}</pre>
                </details>
              )}
            </div>

            <div className="clarification-actions">
              <button
                className="clarification-primary-btn"
                onClick={onConfirmBriefing}
                disabled={isLoading}
              >
                ✓ Confirm & Proceed to Council
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, show the current question
  return (
    <div className="message-group">
      <div className="assistant-message">
        <div className="message-header">
          <div className="message-label">Clarification Analyzer</div>
        </div>

        <div className="clarification-panel">
          <div className="clarification-title">Clarification question</div>
          <div className="clarification-subtitle">
            One question at a time — answer briefly. “Unknown / Not sure” is OK.
          </div>

          {clarificationData && (
            <div className="clarification-question">
              <div className="clarification-question-meta">
                <span className="clarification-question-number">
                  Question {clarificationData.question_number || 1}
                </span>
                {clarificationData.required !== undefined && (
                  <span
                    className={`clarification-pill ${clarificationData.required ? 'is-required' : 'is-optional'}`}
                  >
                    {clarificationData.required ? 'Required' : 'Optional'}
                  </span>
                )}
              </div>

              <div className="clarification-question-text">{clarificationData.question}</div>

              {clarificationData.rationale && (
                <div className="clarification-question-rationale">
                  <span className="clarification-muted">Why this matters:</span> {clarificationData.rationale}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="clarification-form">
            <textarea
              className="clarification-input"
              placeholder="Type your answer… (Enter to submit, Shift+Enter for new line)"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={3}
              autoFocus
            />

            <div className="clarification-actions">
              <button
                type="submit"
                className="clarification-primary-btn"
                disabled={!answer.trim() || isLoading}
              >
                {isLoading ? 'Processing…' : 'Submit Answer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


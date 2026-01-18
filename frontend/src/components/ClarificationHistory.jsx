import { useState } from 'react';
import './ClarificationHistory.css';

export default function ClarificationHistory({ clarificationState }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!clarificationState || !clarificationState.history || clarificationState.history.length === 0) {
    return null;
  }

  const { history, briefing } = clarificationState;
  const previewLines = 5;
  
  // Build the clarification text
  let clarificationText = 'CLARIFICATION PHASE\n\n';
  history.forEach((answer, index) => {
    clarificationText += `Q${index + 1}: [Question from analyst]\nA${index + 1}: ${answer}\n\n`;
  });
  
  if (briefing) {
    clarificationText += '\nFINAL BRIEFING\n\n';
    if (briefing.objective) {
      clarificationText += `Objective: ${briefing.objective}\n\n`;
    }
  }

  const lines = clarificationText.split('\n');
  const preview = lines.slice(0, previewLines).join('\n');
  const needsExpansion = lines.length > previewLines;

  return (
    <div className="clarification-history">
      <div className="clarification-history-header">
        <span className="clarification-history-title">CLARIFICATION ANALYZER</span>
        <span className="clarification-history-count">
          {history.length} question{history.length !== 1 ? 's' : ''} answered
        </span>
      </div>
      
      <div className="clarification-history-content">
        <pre className="clarification-history-text">
          {isExpanded ? clarificationText : preview}
          {!isExpanded && needsExpansion && '...'}
        </pre>
        
        {needsExpansion && (
          <button 
            className="clarification-history-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show less' : 'Show full clarification'}
          </button>
        )}
      </div>
    </div>
  );
}


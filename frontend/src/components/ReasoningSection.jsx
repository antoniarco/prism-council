import { useState } from 'react';
import './ReasoningSection.css';

/**
 * Unified collapsible section component for the Reasoning document view.
 * Provides consistent structure, typography, and interaction patterns.
 */
export default function ReasoningSection({ 
  title, 
  children, 
  defaultExpanded = true,
  metadata = null,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <section className={`reasoning-section ${className}`}>
      <details open={isExpanded} onToggle={(e) => setIsExpanded(e.target.open)}>
        <summary className="reasoning-section-header">
          <h2 className="reasoning-section-title">{title}</h2>
          {metadata && (
            <span className="reasoning-section-meta">{metadata}</span>
          )}
        </summary>
        <div className="reasoning-section-body">
          {children}
        </div>
      </details>
    </section>
  );
}









import { useState, useEffect } from 'react';
import { api } from '../api';
import './ContextSelector.css';

export default function ContextSelector({ onSelectContext, onManageContexts, currentContext }) {
  const [contexts, setContexts] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const loadContexts = async () => {
    try {
      const data = await api.listContexts();
      setContexts(data);
    } catch (error) {
      console.error('Failed to load contexts:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadContexts();
    }
  }, [isOpen]);

  const handleSelect = (context) => {
    onSelectContext(context);
    setIsOpen(false);
  };

  const handleNoContext = () => {
    onSelectContext(null);
    setIsOpen(false);
  };

  const handleManage = () => {
    setIsOpen(false);
    if (onManageContexts) {
      onManageContexts();
    }
  };

  return (
    <div className="context-selector">
      <button className="context-selector-btn" onClick={() => setIsOpen(!isOpen)}>
        {currentContext ? (
          <>
            <span className="context-icon">📋</span>
            {currentContext.name}
          </>
        ) : (
          <>
            <span className="context-icon">○</span>
            No Context
          </>
        )}
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="context-dropdown">
          <div className="context-dropdown-header">
            <span>Select Context</span>
            <button className="manage-btn" onClick={handleManage}>
              Manage
            </button>
          </div>

          <div className="context-options">
            <div
              className={`context-option ${!currentContext ? 'selected' : ''}`}
              onClick={handleNoContext}
            >
              <span className="context-icon">○</span>
              <div>
                <div className="context-option-name">No Context</div>
                <div className="context-option-desc">Start without background</div>
              </div>
            </div>

            {contexts.map((context) => (
              <div
                key={context.id}
                className={`context-option ${
                  currentContext?.id === context.id ? 'selected' : ''
                }`}
                onClick={() => handleSelect(context)}
              >
                <span className="context-icon">📋</span>
                <div>
                  <div className="context-option-name">{context.name}</div>
                  <div className="context-option-desc">
                    {context.content.substring(0, 60)}
                    {context.content.length > 60 ? '...' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {contexts.length === 0 && (
            <div className="no-contexts-message">
              No contexts available. Create one from the Manage button above.
            </div>
          )}
        </div>
      )}
    </div>
  );
}









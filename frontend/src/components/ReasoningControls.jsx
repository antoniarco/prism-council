import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import './ReasoningControls.css';

function Chip({ label, value, onClick, disabled }) {
  return (
    <button
      type="button"
      className={`rc-chip ${disabled ? 'is-disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="rc-chip-label">{label}</span>
      <span className="rc-chip-value">{value}</span>
    </button>
  );
}

export default function ReasoningControls({
  conversation,
  selectedContext,
  selectedRole,
  onSelectContext,
  onSelectRole,
  dynamicPicking,
  onDynamicPickingChange,
}) {
  const rootRef = useRef(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorKind, setEditorKind] = useState('context'); // 'context' | 'role' | 'models'
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [contexts, setContexts] = useState([]);
  const [roles, setRoles] = useState([]);

  const isLocked = !!(conversation?.messages && conversation.messages.length > 0);

  const activeContext = conversation?.context_snapshot || selectedContext;
  const activeRole = conversation?.role_snapshot || selectedRole;

  useEffect(() => {
    // Load once; these are light lists.
    api.listContexts().then(setContexts).catch(() => {});
    api.listRoles().then(setRoles).catch(() => {});
  }, []);

  const contextValue = useMemo(() => (activeContext ? activeContext.name : 'None'), [activeContext]);
  const roleValue = useMemo(() => (activeRole ? activeRole.name : 'None'), [activeRole]);
  
  const modelValue = useMemo(() => {
    if (!dynamicPicking) return 'Default';
    const modeLabels = {
      max_stakes: 'Max Stakes',
      max_stakes_optimized: 'Max Stakes (Opt)',
      max_cultural_biases: 'Max Biases',
      cheapest: 'Cheapest'
    };
    return modeLabels[dynamicPicking.mode] || 'Dynamic';
  }, [dynamicPicking]);

  const toggleEditor = (kind) => {
    if (isLocked && kind !== 'context' && kind !== 'role') return; // Models editor can't open when locked
    if (kind === 'models' && isLocked) return;
    if (editorOpen && editorKind === kind) {
      setEditorOpen(false);
      return;
    }
    setEditorKind(kind);
    setEditorOpen(true);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (!editorOpen) return;
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setEditorOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editorOpen]);

  return (
    <div className="rc" ref={rootRef}>
      <div className="rc-row" aria-label="Reasoning controls">
        <Chip
          label="Context"
          value={contextValue}
          disabled={isLocked}
          onClick={() => toggleEditor('context')}
        />
        <Chip
          label="Role"
          value={roleValue}
          disabled={isLocked}
          onClick={() => toggleEditor('role')}
        />
        <Chip label="Mode" value="Standard" disabled onClick={() => {}} />
        <Chip 
          label="Models" 
          value={modelValue}
          disabled={isLocked}
          onClick={() => toggleEditor('models')}
        />
        <button type="button" className="rc-more" onClick={() => setAdvancedOpen(true)}>
          More…
        </button>
      </div>

      {/* Contextual editor: inline, same visual column (no lateral context switch). */}
      {editorOpen && (
        <div className="rc-editor" role="dialog" aria-label={editorKind === 'context' ? 'Edit context' : editorKind === 'role' ? 'Edit role' : 'Model selection'}>
          <div className="rc-editor-label">{editorKind === 'context' ? 'Context' : editorKind === 'role' ? 'Role' : 'Dynamic Model Picking'}</div>
          {isLocked && editorKind !== 'models' && (
            <div className="rc-note rc-note--tight">
              Locked after the first prompt.
            </div>
          )}
          
          {editorKind === 'models' ? (
            <div className="rc-models-config">
              <div className="rc-note rc-note--tight">
                Explicit step: PRISM will select models based on reasoning scope. This occurs after clarification and before the council.
              </div>
              
              <button
                type="button"
                className={`rc-item ${!dynamicPicking ? 'is-selected' : ''}`}
                onClick={() => {
                  if (onDynamicPickingChange) {
                    onDynamicPickingChange(null);
                    setEditorOpen(false);
                  }
                }}
              >
                <span className="rc-item-name">Default (Settings)</span>
                <span className="rc-item-desc">Use council models from settings</span>
              </button>
              
              <button
                type="button"
                className={`rc-item ${dynamicPicking?.mode === 'max_stakes' ? 'is-selected' : ''}`}
                onClick={() => {
                  if (onDynamicPickingChange) {
                    onDynamicPickingChange({ mode: 'max_stakes', numModels: 5 });
                    setEditorOpen(false);
                  }
                }}
              >
                <span className="rc-item-name">Maximum Stakes</span>
                <span className="rc-item-desc">Strongest available models for high-stakes reasoning</span>
              </button>
              
              <button
                type="button"
                className={`rc-item ${dynamicPicking?.mode === 'max_stakes_optimized' ? 'is-selected' : ''}`}
                onClick={() => {
                  if (onDynamicPickingChange) {
                    onDynamicPickingChange({ mode: 'max_stakes_optimized', numModels: 5 });
                    setEditorOpen(false);
                  }
                }}
              >
                <span className="rc-item-name">Maximum Stakes (Cost-Optimized)</span>
                <span className="rc-item-desc">High-quality models, optimized for cost</span>
              </button>
              
              <button
                type="button"
                className={`rc-item ${dynamicPicking?.mode === 'max_cultural_biases' ? 'is-selected' : ''}`}
                onClick={() => {
                  if (onDynamicPickingChange) {
                    onDynamicPickingChange({ mode: 'max_cultural_biases', numModels: 5 });
                    setEditorOpen(false);
                  }
                }}
              >
                <span className="rc-item-name">Maximum Cultural Biases</span>
                <span className="rc-item-desc">Highly differentiated models to surface bias and disagreement</span>
              </button>
              
              <button
                type="button"
                className={`rc-item ${dynamicPicking?.mode === 'cheapest' ? 'is-selected' : ''}`}
                onClick={() => {
                  if (onDynamicPickingChange) {
                    onDynamicPickingChange({ mode: 'cheapest', numModels: 5 });
                    setEditorOpen(false);
                  }
                }}
              >
                <span className="rc-item-name">Cheapest</span>
                <span className="rc-item-desc">Lowest-cost models suitable for the task</span>
              </button>
              
              {dynamicPicking && (
                <div className="rc-models-count">
                  <label className="rc-models-count-label">
                    Number of models: {dynamicPicking.numModels || 5}
                    <input
                      type="range"
                      min="3"
                      max="10"
                      value={dynamicPicking.numModels || 5}
                      onChange={(e) => {
                        if (onDynamicPickingChange) {
                          onDynamicPickingChange({ ...dynamicPicking, numModels: parseInt(e.target.value) });
                        }
                      }}
                      className="rc-models-slider"
                    />
                  </label>
                </div>
              )}
            </div>
          ) : (
            <div className="rc-list rc-list--compact">
              {editorKind === 'context' ? (
                <>
                  <button
                    type="button"
                    className={`rc-item ${!activeContext ? 'is-selected' : ''}`}
                    disabled={isLocked}
                    onClick={() => {
                      onSelectContext(null);
                      setEditorOpen(false);
                    }}
                  >
                    None
                  </button>
                  {contexts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`rc-item ${activeContext?.id === c.id ? 'is-selected' : ''}`}
                      disabled={isLocked}
                      onClick={() => {
                        onSelectContext(c);
                        setEditorOpen(false);
                      }}
                    >
                      <span className="rc-item-name">{c.name}</span>
                      <span className="rc-item-desc">
                        {(c.content || '').slice(0, 60)}
                        {(c.content || '').length > 60 ? '…' : ''}
                      </span>
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={`rc-item ${!activeRole ? 'is-selected' : ''}`}
                    disabled={isLocked}
                    onClick={() => {
                      onSelectRole(null);
                      setEditorOpen(false);
                    }}
                  >
                    None
                  </button>
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={`rc-item ${activeRole?.id === r.id ? 'is-selected' : ''}`}
                      disabled={isLocked}
                      onClick={() => {
                        onSelectRole(r);
                        setEditorOpen(false);
                      }}
                    >
                      <span className="rc-item-name">{r.name}</span>
                      <span className="rc-item-desc">
                        {(r.description || '').slice(0, 60)}
                        {(r.description || '').length > 60 ? '…' : ''}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Advanced controls drawer (restricted to More…). */}
      {advancedOpen && (
        <>
          <div className="rc-backdrop" onClick={() => setAdvancedOpen(false)} aria-hidden="true" />
          <aside className="rc-drawer" aria-label="Advanced controls">
            <div className="rc-drawer-header">
              <div className="rc-drawer-title">Advanced controls</div>
              <button type="button" className="rc-close" onClick={() => setAdvancedOpen(false)} aria-label="Close">
                ×
              </button>
            </div>

            <div className="rc-drawer-body">
              <div className="rc-section">
                <div className="rc-section-title">Advanced</div>
                <div className="rc-note">
                  Clarification-first mode, model orchestration, judge model, and other advanced controls will live here.
                </div>
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}



import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import './ContextsManager.css';

export default function ContextsManager() {
  const [contexts, setContexts] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', content: '' });
  const [rawOpen, setRawOpen] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [updatedFilter, setUpdatedFilter] = useState('any'); // any | recent | older
  const [sizeFilter, setSizeFilter] = useState('any'); // any | small | medium | large

  const loadContexts = async () => {
    try {
      const data = await api.listContexts();
      setContexts(data);
    } catch (error) {
      console.error('Failed to load contexts:', error);
    }
  };

  useEffect(() => {
    loadContexts();
  }, []);

  const currentTime = useMemo(() => Date.now(), [contexts]);

  const handleCreate = () => {
    setIsCreating(true);
    setFormData({ name: '', content: '' });
  };

  const handleEdit = (context) => {
    setEditingId(context.id);
    setFormData({ name: context.name, content: context.content });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ name: '', content: '' });
  };

  const handleSave = async () => {
    try {
      if (isCreating) {
        await api.createContext(formData.name, formData.content);
      } else if (editingId) {
        await api.updateContext(editingId, formData.name, formData.content);
      }
      await loadContexts();
      handleCancel();
    } catch (error) {
      console.error('Failed to save context:', error);
      alert('Failed to save context. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this context? This will not affect existing conversations.')) {
      return;
    }
    try {
      await api.deleteContext(id);
      await loadContexts();
    } catch (error) {
      console.error('Failed to delete context:', error);
      alert('Failed to delete context. Please try again.');
    }
  };

  const summarize = (text) => {
    const t = (text || '').trim().replace(/\s+/g, ' ');
    if (!t) return '';

    // If content is JSON, don't leak raw JSON into the summary. Provide a structured hint instead.
    const looksLikeJson = t.startsWith('{') || t.startsWith('[');
    if (looksLikeJson) {
      try {
        const parsed = JSON.parse((text || '').trim());
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const keys = Object.keys(parsed);
          const previewKeys = keys.slice(0, 6).join(', ');
          const more = keys.length > 6 ? ` +${keys.length - 6} more` : '';
          return `Structured JSON context · keys: ${previewKeys}${more}`;
        }
        if (Array.isArray(parsed)) {
          return `Structured JSON context · array (${parsed.length} items)`;
        }
      } catch {
        return 'Structured JSON context';
      }
    }

    // Prefer first sentence; fall back to first 140 chars.
    const firstSentence = t.split(/(?<=[.!?])\s+/)[0];
    const s = firstSentence && firstSentence.length >= 40 ? firstSentence : t.slice(0, 140);
    return s.length < t.length ? `${s}…` : s;
  };

  const matchesSearch = (context, q) => {
    const query = (q || '').trim().toLowerCase();
    if (!query) return true;
    const haystack = `${context?.name || ''}\n${context?.content || ''}`.toLowerCase();
    return haystack.includes(query);
  };

  const matchesUpdated = (context) => {
    if (updatedFilter === 'any') return true;
    const updatedAt = new Date(context?.updated_at || 0).getTime();
    const days7 = 7 * 24 * 60 * 60 * 1000;
    const isRecent = currentTime - updatedAt <= days7;
    return updatedFilter === 'recent' ? isRecent : !isRecent;
  };

  const matchesSize = (context) => {
    if (sizeFilter === 'any') return true;
    const n = (context?.content || '').length;
    const isSmall = n < 500;
    const isMedium = n >= 500 && n <= 2000;
    const isLarge = n > 2000;
    if (sizeFilter === 'small') return isSmall;
    if (sizeFilter === 'medium') return isMedium;
    return isLarge;
  };

  const clearFilters = () => {
    setUpdatedFilter('any');
    setSizeFilter('any');
  };

  const visibleContexts = contexts.filter(
    (c) => matchesSearch(c, searchQuery) && matchesUpdated(c) && matchesSize(c)
  );

  return (
    <div className="contexts-manager-page">
      <div className="contexts-manager">
        <div className="contexts-header">
          <div className="contexts-header-row">
            <h2>Contexts</h2>
            {!isCreating && !editingId && (
              <button className="btn-ghost" onClick={handleCreate}>
                Create context
              </button>
            )}
          </div>
          <div className="contexts-subtitle">
            Authoritative background frames that guide reasoning. Contexts are stable and not modified during analysis.
          </div>
        </div>

        <div className="library-controls" aria-label="Context search and filters">
          <div className="library-controls-row">
            <input
              className="library-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contexts…"
            />
            <button
              type="button"
              className="btn-ghost btn-filter"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              aria-controls="context-filters-panel"
            >
              Filter
            </button>
          </div>

          {filtersOpen && (
            <div id="context-filters-panel" className="library-filters-panel">
              <div className="library-filters-grid">
                <label className="library-filter">
                  <span className="library-filter-label">Updated</span>
                  <select
                    className="library-filter-select"
                    value={updatedFilter}
                    onChange={(e) => setUpdatedFilter(e.target.value)}
                  >
                    <option value="any">Any time</option>
                    <option value="recent">Recently updated</option>
                    <option value="older">Older</option>
                  </select>
                </label>

                <label className="library-filter">
                  <span className="library-filter-label">Size</span>
                  <select
                    className="library-filter-select"
                    value={sizeFilter}
                    onChange={(e) => setSizeFilter(e.target.value)}
                  >
                    <option value="any">Any</option>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </label>

                <button
                  type="button"
                  className="library-filter-clear"
                  onClick={clearFilters}
                  disabled={updatedFilter === 'any' && sizeFilter === 'any'}
                >
                  Clear filters
                </button>
              </div>
            </div>
          )}
        </div>

        {(isCreating || editingId) && (
          <div className="context-form">
            <input
              type="text"
              placeholder="Context Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="context-name-input"
            />
            <textarea
              placeholder="Context content (background information, principles, facts, etc.)"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="context-content-input"
              rows={10}
            />
            <div className="form-actions">
              <button
                className="btn-primary-subtle"
                onClick={handleSave}
                disabled={!formData.name.trim() || !formData.content.trim()}
              >
                Save
              </button>
              <button className="btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="contexts-list">
          {contexts.length === 0 ? (
            <div className="no-contexts">
              No contexts yet. Create one to get started.
            </div>
          ) : (
            visibleContexts.length === 0 ? (
              <div className="no-contexts">No contexts match your search.</div>
            ) : (
              visibleContexts.map((context) => (
              <div key={context.id} className="context-card">
                <div className="context-card-header">
                  <div className="context-card-title">{context.name}</div>
                  <div className="context-card-actions">
                    <button
                      className="icon-btn"
                      onClick={() => handleEdit(context)}
                      disabled={isCreating || editingId}
                      aria-label="Edit context"
                      title="Edit"
                    >
                      <span className="icon" aria-hidden="true">✎</span>
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => handleDelete(context.id)}
                      disabled={isCreating || editingId}
                      aria-label="Delete context"
                      title="Delete"
                    >
                      <span className="icon" aria-hidden="true">×</span>
                    </button>
                  </div>
                </div>

                <div className="context-card-summary">
                  {summarize(context.content)}
                </div>

                <div className="context-card-meta">
                  <span>Updated {new Date(context.updated_at).toLocaleDateString()}</span>
                  <span>·</span>
                  <span>{(context.content || '').length.toLocaleString()} chars</span>
                </div>

                <div className="context-card-raw">
                  <button
                    type="button"
                    className="raw-toggle"
                    onClick={() => setRawOpen((prev) => ({ ...prev, [context.id]: !prev[context.id] }))}
                  >
                    {rawOpen[context.id] ? 'Hide raw context' : 'View raw context'}
                  </button>
                  {rawOpen[context.id] && (
                    <pre className="raw-pre">
                      {JSON.stringify(
                        {
                          id: context.id,
                          name: context.name,
                          content: context.content,
                          created_at: context.created_at,
                          updated_at: context.updated_at,
                        },
                        null,
                        2
                      )}
                    </pre>
                  )}
                </div>
              </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
}


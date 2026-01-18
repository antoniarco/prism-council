import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import './ContextsManager.css';

export default function RolesManager() {
  const [roles, setRoles] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [fullOpen, setFullOpen] = useState({});
  const [rawOpen, setRawOpen] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [updatedFilter, setUpdatedFilter] = useState('any'); // any | recent | older
  const [sizeFilter, setSizeFilter] = useState('any'); // any | small | medium | large

  const loadRoles = async () => {
    try {
      const data = await api.listRoles();
      setRoles(data);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const currentTime = useMemo(() => Date.now(), [roles]);

  const handleCreate = () => {
    setIsCreating(true);
    setFormData({ name: '', description: '' });
  };

  const handleEdit = (role) => {
    setEditingId(role.id);
    setFormData({ name: role.name, description: role.description });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ name: '', description: '' });
  };

  const handleSave = async () => {
    try {
      if (isCreating) {
        await api.createRole(formData.name, formData.description);
      } else if (editingId) {
        await api.updateRole(editingId, formData.name, formData.description);
      }
      await loadRoles();
      handleCancel();
    } catch (error) {
      console.error('Failed to save role:', error);
      alert('Failed to save role. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this role? This will not affect existing reasonings.')) {
      return;
    }
    try {
      await api.deleteRole(id);
      await loadRoles();
    } catch (error) {
      console.error('Failed to delete role:', error);
      alert('Failed to delete role. Please try again.');
    }
  };

  const summarize = (text) => {
    const t = (text || '').trim().replace(/\s+/g, ' ');
    if (!t) return 'No description provided.';

    const looksLikeJson = t.startsWith('{') || t.startsWith('[');
    if (looksLikeJson) {
      try {
        const parsed = JSON.parse((text || '').trim());
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const keys = Object.keys(parsed);
          const previewKeys = keys.slice(0, 6).join(', ');
          const more = keys.length > 6 ? ` +${keys.length - 6} more` : '';
          return `Structured role · keys: ${previewKeys}${more}`;
        }
        if (Array.isArray(parsed)) {
          return `Structured role · array (${parsed.length} items)`;
        }
      } catch {
        return 'Structured role';
      }
    }

    const firstSentence = t.split(/(?<=[.!?])\s+/)[0];
    const s = firstSentence && firstSentence.length >= 40 ? firstSentence : t.slice(0, 140);
    return s.length < t.length ? `${s}…` : s;
  };

  const matchesSearch = (role, q) => {
    const query = (q || '').trim().toLowerCase();
    if (!query) return true;
    const haystack = `${role?.name || ''}\n${role?.description || ''}`.toLowerCase();
    return haystack.includes(query);
  };

  const matchesUpdated = (role) => {
    if (updatedFilter === 'any') return true;
    const updatedAt = new Date(role?.updated_at || 0).getTime();
    const days7 = 7 * 24 * 60 * 60 * 1000;
    const isRecent = currentTime - updatedAt <= days7;
    return updatedFilter === 'recent' ? isRecent : !isRecent;
  };

  const matchesSize = (role) => {
    if (sizeFilter === 'any') return true;
    const n = (role?.description || '').length;
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

  const visibleRoles = roles.filter(
    (r) => matchesSearch(r, searchQuery) && matchesUpdated(r) && matchesSize(r)
  );

  return (
    <div className="contexts-manager-page">
      <div className="contexts-manager">
        <div className="contexts-header">
          <div className="contexts-header-row">
            <h2>Roles</h2>
            {!isCreating && !editingId && (
              <button className="btn-ghost" onClick={handleCreate}>
                Create role
              </button>
            )}
          </div>
          <div className="contexts-subtitle">
            Personas that guide tone, perspective, and approach during reasoning. Roles shape how reasoning is expressed, not its content.
          </div>
        </div>

        <div className="library-controls" aria-label="Role search and filters">
          <div className="library-controls-row">
            <input
              className="library-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search roles…"
            />
            <button
              type="button"
              className="btn-ghost btn-filter"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              aria-controls="role-filters-panel"
            >
              Filter
            </button>
          </div>

          {filtersOpen && (
            <div id="role-filters-panel" className="library-filters-panel">
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
              placeholder="Role name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="context-name-input"
            />
            <textarea
              placeholder="Role definition (tone, perspective, approach, expertise)."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="context-content-input"
              rows={10}
            />
            <div className="form-actions">
              <button
                className="btn-primary-subtle"
                onClick={handleSave}
                disabled={!formData.name.trim() || !formData.description.trim()}
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
          {roles.length === 0 ? (
            <div className="no-contexts">
              No roles yet. Create one to get started.
            </div>
          ) : (
            visibleRoles.length === 0 ? (
              <div className="no-contexts">No roles match your search.</div>
            ) : (
              visibleRoles.map((role) => (
              <div key={role.id} className="context-card">
                <div className="context-card-header">
                  <div className="context-card-title">{role.name}</div>
                  <div className="context-card-actions">
                    <button
                      className="icon-btn"
                      onClick={() => setFullOpen((p) => ({ ...p, [role.id]: !p[role.id] }))}
                      disabled={isCreating || editingId}
                      aria-label="View full role"
                      title={fullOpen[role.id] ? 'Hide full role' : 'View full role'}
                    >
                      <span className="icon" aria-hidden="true">⤢</span>
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => handleEdit(role)}
                      disabled={isCreating || editingId}
                      aria-label="Edit role"
                      title="Edit"
                    >
                      <span className="icon" aria-hidden="true">✎</span>
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => handleDelete(role.id)}
                      disabled={isCreating || editingId}
                      aria-label="Delete role"
                      title="Delete"
                    >
                      <span className="icon" aria-hidden="true">×</span>
                    </button>
                  </div>
                </div>

                <div className="context-card-summary">{summarize(role.description)}</div>

                <div className="context-card-meta">
                  <span>Updated {new Date(role.updated_at).toLocaleDateString()}</span>
                  <span>·</span>
                  <span>{(role.description || '').length.toLocaleString()} chars</span>
                </div>

                {fullOpen[role.id] && (
                  <pre className="raw-pre" style={{ whiteSpace: 'pre-wrap' }}>
                    {role.description || ''}
                  </pre>
                )}

                <div className="context-card-raw">
                  <button
                    type="button"
                    className="raw-toggle"
                    onClick={() => setRawOpen((prev) => ({ ...prev, [role.id]: !prev[role.id] }))}
                  >
                    {rawOpen[role.id] ? 'Hide raw role' : 'View raw role'}
                  </button>
                  {rawOpen[role.id] && (
                    <pre className="raw-pre">
                      {JSON.stringify(
                        {
                          id: role.id,
                          name: role.name,
                          description: role.description,
                          created_at: role.created_at,
                          updated_at: role.updated_at,
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


import { useState, useEffect } from 'react';
import { api } from '../api';
import './ContextsManager.css';
import './SettingsManager.css';

export default function SettingsManager() {
  const [settings, setSettings] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState({
    modelOrchestration: false,
    reasoningModes: false,
    credentials: false
  });
  const [formData, setFormData] = useState({
    councilModels: [],
    chairmanModel: '',
    analystModel: '',
    clarificationFirstEnabled: false,
    maxClarificationRounds: 5,
    openrouterApiKey: ''
  });
  const [modelSearch, setModelSearch] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
    loadModels();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      setFormData({
        councilModels: [...data.council_models],
        chairmanModel: data.chairman_model,
        analystModel: data.analyst_model || data.chairman_model,
        clarificationFirstEnabled: data.clarification_first_enabled || false,
        maxClarificationRounds: data.max_clarification_rounds || 5,
        openrouterApiKey: data.openrouter_api_key || ''
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      setError('Failed to load settings');
    }
  };

  const loadModels = async () => {
    try {
      setModelsLoading(true);
      const data = await api.getModels();
      setAvailableModels(data.models || []);
    } catch (error) {
      console.error('Failed to load models:', error);
      setError('Failed to load available models from OpenRouter');
    } finally {
      setModelsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
    setSuccess(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    setSuccess(false);
    setShowApiKey(false);
    setModelSearch('');
    // Reset form data to current settings
    if (settings) {
      setFormData({
        councilModels: [...settings.council_models],
        chairmanModel: settings.chairman_model,
        analystModel: settings.analyst_model || settings.chairman_model,
        clarificationFirstEnabled: settings.clarification_first_enabled || false,
        maxClarificationRounds: settings.max_clarification_rounds || 5,
        openrouterApiKey: settings.openrouter_api_key || ''
      });
    }
  };

  const toggleExpanded = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const apiKeyConfigured = !!(settings?.openrouter_api_key && String(settings.openrouter_api_key).trim().length > 0);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    // Validation
    if (formData.councilModels.length === 0) {
      setError('Models list cannot be empty');
      return;
    }

    if (!formData.chairmanModel) {
      setError('Chairman model must be selected');
      return;
    }

    if (!formData.councilModels.includes(formData.chairmanModel)) {
      setError('Chairman model must be one of the selected models');
      return;
    }

    if (!formData.analystModel) {
      setError('Analyst model must be selected');
      return;
    }

    if (!formData.councilModels.includes(formData.analystModel)) {
      setError('Analyst model must be one of the selected models');
      return;
    }

    if (formData.maxClarificationRounds < 1 || formData.maxClarificationRounds > 20) {
      setError('Max clarification rounds must be between 1 and 20');
      return;
    }

    // Check for duplicates
    if (new Set(formData.councilModels).size !== formData.councilModels.length) {
      setError('Models list cannot contain duplicates');
      return;
    }

    try {
      // Don't send the API key if it's still masked
      const apiKey = formData.openrouterApiKey?.startsWith('********') 
        ? null 
        : formData.openrouterApiKey || null;

      const updatedSettings = await api.updateSettings(
        formData.councilModels,
        formData.chairmanModel,
        formData.analystModel,
        formData.clarificationFirstEnabled,
        formData.maxClarificationRounds,
        apiKey
      );

      setSettings(updatedSettings);
      setFormData({
        councilModels: [...updatedSettings.council_models],
        chairmanModel: updatedSettings.chairman_model,
        analystModel: updatedSettings.analyst_model || updatedSettings.chairman_model,
        clarificationFirstEnabled: updatedSettings.clarification_first_enabled || false,
        maxClarificationRounds: updatedSettings.max_clarification_rounds || 5,
        openrouterApiKey: updatedSettings.openrouter_api_key || ''
      });
      setIsEditing(false);
      setSuccess(true);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setError(error.message || 'Failed to save settings');
    }
  };

  const handleAddModel = (modelId) => {
    if (formData.councilModels.includes(modelId)) {
      return; // Already added
    }

    setFormData({
      ...formData,
      councilModels: [...formData.councilModels, modelId]
    });
    setError(null);
  };

  const handleRemoveModel = (modelId) => {
    const newModels = formData.councilModels.filter((m) => m !== modelId);
    
    // If we're removing the chairman model, clear the chairman selection
    const updates = { councilModels: newModels };
    if (modelId === formData.chairmanModel) {
      updates.chairmanModel = newModels.length > 0 ? newModels[0] : '';
    }
    if (modelId === formData.analystModel) {
      updates.analystModel = newModels.length > 0 ? newModels[0] : '';
    }
    
    setFormData({ ...formData, ...updates });
  };

  // Filter available models based on search
  const filteredModels = availableModels.filter((model) => {
    if (!modelSearch.trim()) return true;
    const search = modelSearch.toLowerCase();
    return (
      model.id.toLowerCase().includes(search) ||
      model.name.toLowerCase().includes(search) ||
      model.provider.toLowerCase().includes(search)
    );
  });

  if (!settings) {
    return (
      <div className="contexts-manager-page">
        <div className="contexts-manager">
          <div className="no-contexts">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="contexts-manager-page">
      <div className="contexts-manager">
        <div className="contexts-header">
          <div className="contexts-header-row">
            <h2>Settings</h2>
            {!isEditing ? (
              <button className="btn-ghost" onClick={handleEdit} type="button">
                Edit settings
              </button>
            ) : (
              <button className="btn-ghost" onClick={handleCancel} type="button">
                Cancel editing
              </button>
            )}
          </div>
          <div className="contexts-subtitle">
            System-level defaults that define how reasoning is orchestrated across models.
          </div>
        </div>

        {(success || error) && (
          <div className="context-card settings-alert" role={error ? 'alert' : 'status'}>
            <div className="context-card-summary">
              {success ? 'Settings saved. Changes take effect immediately.' : error}
            </div>
          </div>
        )}

        <div className="contexts-list">
          {/* Section: Model Orchestration */}
          <div className="context-card">
            <div className="context-card-header">
              <div className="context-card-title">Model orchestration</div>
              <button
                type="button"
                className="raw-toggle"
                onClick={() => toggleExpanded('modelOrchestration')}
              >
                {expanded.modelOrchestration ? 'Hide details' : 'View details'}
              </button>
            </div>

            <div className="context-card-summary">
              Reasoning models: <strong>{settings.council_models.length}</strong>
              <br />
              Chairman model: <span className="settings-mono">{settings.chairman_model}</span>
              <br />
              Analyst model: <span className="settings-mono">{settings.analyst_model || settings.chairman_model}</span>
            </div>

            {expanded.modelOrchestration && (
              <div className="settings-details">
                <div className="settings-help">
                  These defaults define the orchestration layer: who participates in the council, who synthesizes final output, and which model
                  runs the clarification analyzer when enabled.
                </div>

                {isEditing ? (
                  <div className="settings-edit-block">
                    {/* Selected reasoning models */}
                    <div className="settings-field-label">Reasoning models ({formData.councilModels.length} selected)</div>
                    <div className="model-list-editable">
                      {formData.councilModels.length === 0 ? (
                        <div className="no-contexts">No models selected. Choose from the list below.</div>
                      ) : (
                        formData.councilModels.map((modelId) => {
                          const modelInfo = availableModels.find((m) => m.id === modelId);
                          return (
                            <div key={modelId} className="model-item-editable">
                              <div className="model-item-info">
                                <span className="model-name">{modelInfo?.name || modelId}</span>
                                <span className="model-id">{modelId}</span>
                              </div>
                              <button
                                className="icon-btn"
                                onClick={() => handleRemoveModel(modelId)}
                                title="Remove from council"
                                type="button"
                              >
                                <span className="icon">×</span>
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Model browser */}
                    <div className="model-browser">
                      <div className="settings-field-label">Available models</div>
                      <input
                        type="text"
                        placeholder="Search models by name, id, or provider…"
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        className="model-search-input"
                      />
                      
                      {modelsLoading ? (
                        <div className="no-contexts">Loading models from OpenRouter...</div>
                      ) : filteredModels.length === 0 ? (
                        <div className="no-contexts">No models match your search.</div>
                      ) : (
                        <div className="model-browser-list">
                          {filteredModels.slice(0, 50).map((model) => {
                            const isSelected = formData.councilModels.includes(model.id);
                            return (
                              <div
                                key={model.id}
                                className={`model-browser-item ${isSelected ? 'selected' : ''}`}
                                onClick={() => isSelected ? handleRemoveModel(model.id) : handleAddModel(model.id)}
                              >
                                <div className="model-browser-info">
                                  <div className="model-browser-name">{model.name}</div>
                                  <div className="model-browser-id">{model.id}</div>
                                </div>
                                <div className="model-browser-provider">{model.provider}</div>
                              </div>
                            );
                          })}
                          {filteredModels.length > 50 && (
                            <div className="no-contexts">Showing first 50 of {filteredModels.length} models. Refine your search for more.</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="settings-field">
                      <div className="settings-field-label">Chairman model</div>
                      <select
                        className="chairman-select"
                        value={formData.chairmanModel}
                        onChange={(e) => setFormData({ ...formData, chairmanModel: e.target.value })}
                      >
                        {formData.councilModels.length === 0 ? (
                          <option value="">Add reasoning models first</option>
                        ) : (
                          formData.councilModels.map((model) => (
                            <option key={model} value={model}>
                              {model}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div className="settings-field">
                      <div className="settings-field-label">Analyst model</div>
                      <select
                        className="chairman-select"
                        value={formData.analystModel}
                        onChange={(e) => setFormData({ ...formData, analystModel: e.target.value })}
                      >
                        {formData.councilModels.length === 0 ? (
                          <option value="">Add reasoning models first</option>
                        ) : (
                          formData.councilModels.map((model) => (
                            <option key={model} value={model}>
                              {model}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="settings-readonly-block">
                    <pre className="raw-pre settings-pre">{settings.council_models.join('\n')}</pre>
                    <div className="settings-hint">
                      Settings changes take effect immediately. Existing reasonings keep their stored snapshots.
                      {settings.updated_at ? ` Last updated: ${new Date(settings.updated_at).toLocaleString()}` : ''}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Reasoning Modes */}
          <div className="context-card">
            <div className="context-card-header">
              <div className="context-card-title">Reasoning modes</div>
              <button
                type="button"
                className="raw-toggle"
                onClick={() => toggleExpanded('reasoningModes')}
              >
                {expanded.reasoningModes ? 'Hide details' : 'View details'}
              </button>
            </div>

            <div className="context-card-summary">
              Clarification-first mode: <strong>{(settings.clarification_first_enabled || false) ? 'Enabled' : 'Disabled'}</strong>
              <br />
              Max clarification rounds: <span className="settings-mono">{settings.max_clarification_rounds || 5}</span>
            </div>

            {expanded.reasoningModes && (
              <div className="settings-details">
                <div className="settings-help">
                  Clarification-first adds a bounded briefing phase before council analysis. The analyst may ask material questions and produce a
                  structured brief, which is then handed to the council without re-asking clarification.
                </div>

                {isEditing ? (
                  <div className="clarification-settings">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={formData.clarificationFirstEnabled}
                        onChange={(e) => setFormData({ ...formData, clarificationFirstEnabled: e.target.checked })}
                        disabled={!isEditing}
                        className="toggle-checkbox"
                      />
                      <span className="toggle-text">
                        {formData.clarificationFirstEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>

                    <div className="max-rounds-input">
                      <label>
                        <strong>Max clarification rounds</strong>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={formData.maxClarificationRounds}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              maxClarificationRounds: parseInt(e.target.value) || 5
                            })
                          }
                          disabled={!isEditing}
                          className="rounds-input"
                        />
                      </label>
                      <p className="input-hint">Maximum number of clarifying questions (1–20).</p>
                    </div>
                  </div>
                ) : (
                  <div className="settings-readonly-block">
                    <div className="settings-kv">
                      <div className="settings-k">Clarification-first</div>
                      <div className="settings-v">{(settings.clarification_first_enabled || false) ? 'Enabled' : 'Disabled'}</div>
                    </div>
                    <div className="settings-kv">
                      <div className="settings-k">Max rounds</div>
                      <div className="settings-v">{settings.max_clarification_rounds || 5}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section: Credentials */}
          <div className="context-card">
            <div className="context-card-header">
              <div className="context-card-title">Credentials</div>
              <button
                type="button"
                className="raw-toggle"
                onClick={() => toggleExpanded('credentials')}
              >
                {expanded.credentials ? 'Hide details' : 'View details'}
              </button>
            </div>

            <div className="context-card-summary">
              OpenRouter API key: <strong>{apiKeyConfigured ? 'Configured' : 'Not configured'}</strong>
            </div>

            {expanded.credentials && (
              <div className="settings-details">
                <div className="settings-help">
                  API keys are treated as credentials. They are never displayed in read-only mode.
                </div>

                {isEditing ? (
                  <div className="api-key-input-group">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      className="api-key-input"
                      value={formData.openrouterApiKey}
                      onChange={(e) => setFormData({ ...formData, openrouterApiKey: e.target.value })}
                      placeholder="sk-or-v1-…"
                    />
                    <button
                      className="btn-secondary"
                      onClick={() => setShowApiKey(!showApiKey)}
                      type="button"
                    >
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                ) : (
                  <div className="settings-readonly-block">
                    <div className="settings-kv">
                      <div className="settings-k">OpenRouter API key</div>
                      <div className="settings-v">{apiKeyConfigured ? 'Configured' : 'Not configured'}</div>
                    </div>
                    <div className="settings-hint">To update credentials, click “Edit settings”.</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="settings-actions-row">
            <div className="form-actions">
              <button className="btn-primary-subtle" onClick={handleSave} type="button">
                Save
              </button>
              <button className="btn-secondary" onClick={handleCancel} type="button">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


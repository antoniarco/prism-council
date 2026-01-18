import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import './ConversationContextSettings.css';

export default function ConversationContextSettings({ 
  conversation, 
  selectedContext,
  selectedRole,
  onSelectContext,
  onSelectRole,
  onManageContexts,
  onManageRoles
}) {
  const [contexts, setContexts] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const contextDropdownRef = useRef(null);
  const roleDropdownRef = useRef(null);

  const loadContexts = async () => {
    try {
      const data = await api.listContexts();
      setContexts(data);
    } catch (error) {
      console.error('Failed to load contexts:', error);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await api.listRoles();
      setRoles(data);
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  useEffect(() => {
    loadContexts();
    loadRoles();
  }, []);

  // Close context dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (contextDropdownRef.current && !contextDropdownRef.current.contains(event.target)) {
        setIsContextOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close role dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target)) {
        setIsRoleOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectContext = (context) => {
    onSelectContext(context);
    setIsContextOpen(false);
  };

  const handleNoContext = () => {
    onSelectContext(null);
    setIsContextOpen(false);
  };

  const handleSelectRole = (role) => {
    onSelectRole(role);
    setIsRoleOpen(false);
  };

  const handleNoRole = () => {
    onSelectRole(null);
    setIsRoleOpen(false);
  };

  const activeContext = conversation?.context_snapshot || selectedContext;
  const activeRole = conversation?.role_snapshot || selectedRole;

  // Show a more prominent prompt for new reasonings
  const isNewConversation = conversation && conversation.messages && conversation.messages.length === 0;
  const canChangeContext = !conversation?.context_snapshot;
  const canChangeRole = !conversation?.role_snapshot;

  return (
    <div className="conversation-context-settings">
      {isNewConversation && (
        <div className="context-settings-header">
          <span className="settings-title">Reasoning Settings</span>
          {(canChangeContext || canChangeRole) && (
            <span className="settings-badge">Editable</span>
          )}
        </div>
      )}
      
      <div className="settings-grid">
        {/* Context Section */}
        <div className="setting-section" ref={contextDropdownRef}>
          <div className={`context-display ${isNewConversation ? 'persistent-settings' : ''} ${activeContext ? 'has-context' : ''}`} onClick={() => canChangeContext && setIsContextOpen(!isContextOpen)}>
            {activeContext ? (
              <>
                <div className="context-info-display">
                  <div className="context-details">
                    <div className="context-name-display">
                      Context: {activeContext.name}
                    </div>
                    <div className="context-preview-display">
                      {activeContext.content.substring(0, 100)}
                      {activeContext.content.length > 100 ? '...' : ''}
                    </div>
                  </div>
                </div>
                {canChangeContext && (
                  <button className="change-context-btn" onClick={(e) => {
                    e.stopPropagation();
                    setIsContextOpen(!isContextOpen);
                  }}>
                    Change
                  </button>
                )}
              </>
            ) : (
              <div className="no-context-display">
                <div className="context-details">
                  <div className="context-name-display">No Context Selected</div>
                  <div className="context-preview-display">
                    Optional: Add background information
                  </div>
                </div>
                {canChangeContext && (
                  <button className="select-context-btn" onClick={(e) => {
                    e.stopPropagation();
                    setIsContextOpen(!isContextOpen);
                  }}>
                    Choose
                  </button>
                )}
              </div>
            )}
          </div>

          {isContextOpen && !conversation?.context_snapshot && (
            <div className="context-dropdown-panel">
              <div className="context-dropdown-header">
                <span>Select Context</span>
                <button className="manage-contexts-link" onClick={() => {
                  setIsContextOpen(false);
                  onManageContexts();
                }}>
                  Manage
                </button>
              </div>

              <div className="context-options-list">
                <div
                  className={`context-option-item ${!selectedContext ? 'selected' : ''}`}
                  onClick={handleNoContext}
                >
                  <div className="context-option-content">
                    <div className="context-option-name">No Context</div>
                  </div>
                </div>

                {contexts.map((context) => (
                  <div
                    key={context.id}
                    className={`context-option-item ${
                      selectedContext?.id === context.id ? 'selected' : ''
                    }`}
                    onClick={() => handleSelectContext(context)}
                  >
                    <div className="context-option-content">
                      <div className="context-option-name">{context.name}</div>
                      <div className="context-option-desc">
                        {context.content.substring(0, 40)}
                        {context.content.length > 40 ? '...' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {contexts.length === 0 && (
                <div className="no-contexts-available">
                  No contexts yet. Use “Manage” to create one.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Role Section */}
        <div className="setting-section" ref={roleDropdownRef}>
          <div className={`context-display ${isNewConversation ? 'persistent-settings' : ''} ${activeRole ? 'has-role' : ''}`} onClick={() => canChangeRole && setIsRoleOpen(!isRoleOpen)}>
            {activeRole ? (
              <>
                <div className="context-info-display">
                  <div className="context-details">
                    <div className="context-name-display">
                      Role: {activeRole.name}
                    </div>
                    <div className="context-preview-display">
                      {activeRole.description.substring(0, 100)}
                      {activeRole.description.length > 100 ? '...' : ''}
                    </div>
                  </div>
                </div>
                {canChangeRole && (
                  <button className="change-context-btn" onClick={(e) => {
                    e.stopPropagation();
                    setIsRoleOpen(!isRoleOpen);
                  }}>
                    Change
                  </button>
                )}
              </>
            ) : (
              <div className="no-context-display">
                <div className="context-details">
                  <div className="context-name-display">No Role Selected</div>
                  <div className="context-preview-display">
                    Optional: Define a persona
                  </div>
                </div>
                {canChangeRole && (
                  <button className="select-context-btn" onClick={(e) => {
                    e.stopPropagation();
                    setIsRoleOpen(!isRoleOpen);
                  }}>
                    Choose
                  </button>
                )}
              </div>
            )}
          </div>

          {isRoleOpen && !conversation?.role_snapshot && (
            <div className="context-dropdown-panel">
              <div className="context-dropdown-header">
                <span>Select Role</span>
                <button className="manage-contexts-link" onClick={() => {
                  setIsRoleOpen(false);
                  onManageRoles();
                }}>
                  Manage
                </button>
              </div>

              <div className="context-options-list">
                <div
                  className={`context-option-item ${!selectedRole ? 'selected' : ''}`}
                  onClick={handleNoRole}
                >
                  <div className="context-option-content">
                    <div className="context-option-name">No Role</div>
                  </div>
                </div>

                {roles.map((role) => (
                  <div
                    key={role.id}
                    className={`context-option-item ${
                      selectedRole?.id === role.id ? 'selected' : ''
                    }`}
                    onClick={() => handleSelectRole(role)}
                  >
                    <div className="context-option-content">
                      <div className="context-option-name">{role.name}</div>
                      <div className="context-option-desc">
                        {role.description.substring(0, 40)}
                        {role.description.length > 40 ? '...' : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {roles.length === 0 && (
                <div className="no-contexts-available">
                  No roles yet. Use “Manage” to create one.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {(conversation?.context_snapshot || conversation?.role_snapshot) && (
        <div className="context-locked-note">
          <small>Settings lock after the first message. Start a new reasoning to change them.</small>
        </div>
      )}
    </div>
  );
}


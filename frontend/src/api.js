/**
 * API client for the PRISM backend.
 */

const API_BASE = 'http://localhost:8001';

export const api = {
  /**
   * Get application settings.
   */
  async getSettings() {
    const response = await fetch(`${API_BASE}/api/settings`);
    if (!response.ok) {
      throw new Error('Failed to get settings');
    }
    return response.json();
  },

  /**
   * Update application settings.
   */
  async updateSettings(councilModels, chairmanModel, analystModel, clarificationFirstEnabled, maxClarificationRounds, openrouterApiKey) {
    const response = await fetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        council_models: councilModels,
        chairman_model: chairmanModel,
        analyst_model: analystModel,
        clarification_first_enabled: clarificationFirstEnabled,
        max_clarification_rounds: maxClarificationRounds,
        openrouter_api_key: openrouterApiKey,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update settings');
    }
    return response.json();
  },

  /**
   * Get available models from OpenRouter.
   */
  async getModels(forceRefresh = false) {
    const url = new URL(`${API_BASE}/api/models`);
    if (forceRefresh) {
      url.searchParams.append('force_refresh', 'true');
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to get models');
    }
    return response.json();
  },

  /**
   * Pick models dynamically based on reasoning scope and mode.
   */
  async pickModels(clarifiedPrompt, contextContent, roleDescription, mode, numModels) {
    const response = await fetch(`${API_BASE}/api/pick-models`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clarified_prompt: clarifiedPrompt,
        context_content: contextContent,
        role_description: roleDescription,
        mode: mode,
        num_models: numModels
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to pick models');
    }
    return response.json();
  },

  /**
   * List all roles.
   */
  async listRoles() {
    const response = await fetch(`${API_BASE}/api/roles`);
    if (!response.ok) {
      throw new Error('Failed to list roles');
    }
    return response.json();
  },

  /**
   * Create a new role.
   */
  async createRole(name, description) {
    const response = await fetch(`${API_BASE}/api/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, description }),
    });
    if (!response.ok) {
      throw new Error('Failed to create role');
    }
    return response.json();
  },

  /**
   * Update a role.
   */
  async updateRole(roleId, name, description) {
    const response = await fetch(`${API_BASE}/api/roles/${roleId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, description }),
    });
    if (!response.ok) {
      throw new Error('Failed to update role');
    }
    return response.json();
  },

  /**
   * Delete a role.
   */
  async deleteRole(roleId) {
    const response = await fetch(`${API_BASE}/api/roles/${roleId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete role');
    }
    return response.json();
  },

  /**
   * List all contexts.
   */
  async listContexts() {
    const response = await fetch(`${API_BASE}/api/contexts`);
    if (!response.ok) {
      throw new Error('Failed to list contexts');
    }
    return response.json();
  },

  /**
   * Create a new context.
   */
  async createContext(name, content) {
    const response = await fetch(`${API_BASE}/api/contexts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, content }),
    });
    if (!response.ok) {
      throw new Error('Failed to create context');
    }
    return response.json();
  },

  /**
   * Update a context.
   */
  async updateContext(contextId, name, content) {
    const response = await fetch(`${API_BASE}/api/contexts/${contextId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, content }),
    });
    if (!response.ok) {
      throw new Error('Failed to update context');
    }
    return response.json();
  },

  /**
   * Delete a context.
   */
  async deleteContext(contextId) {
    const response = await fetch(`${API_BASE}/api/contexts/${contextId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete context');
    }
    return response.json();
  },

  /**
   * List all reasonings (stored as conversations internally).
   */
  async listConversations() {
    const response = await fetch(`${API_BASE}/api/conversations`);
    if (!response.ok) {
      throw new Error('Failed to list reasonings');
    }
    return response.json();
  },

  /**
   * Create a new reasoning (conversation internally) with optional context and role.
   */
  async createConversation(contextId = null, roleId = null) {
    const response = await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ context_id: contextId, role_id: roleId }),
    });
    if (!response.ok) {
      throw new Error('Failed to create reasoning');
    }
    return response.json();
  },

  /**
   * Get a specific reasoning (conversation internally).
   */
  async getConversation(conversationId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`
    );
    if (!response.ok) {
      throw new Error('Failed to get reasoning');
    }
    return response.json();
  },

  /**
   * Update the context of a reasoning (only before first message).
   */
  async updateConversationContext(conversationId, contextId = null) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/context`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context_id: contextId }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to update reasoning context');
    }
    return response.json();
  },

  /**
   * Update the role of a reasoning (only before first message).
   */
  async updateConversationRole(conversationId, roleId = null) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/role`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role_id: roleId }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to update conversation role');
    }
    return response.json();
  },

  /**
   * Update the model selection for a conversation.
   */
  async updateConversationModelSelection(conversationId, models, mode, rationales) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/model-selection`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ models, mode, rationales }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to update model selection');
    }
    return response.json();
  },

  /**
   * Delete a conversation.
   */
  async deleteConversation(conversationId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}`,
      {
        method: 'DELETE',
      }
    );
    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }
    return response.json();
  },

  /**
   * Send a message in a conversation.
   */
  async sendMessage(conversationId, content) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    return response.json();
  },

  /**
   * Send a message and receive streaming updates.
   * @param {string} conversationId - The conversation ID
   * @param {string} content - The message content
   * @param {function} onEvent - Callback function for each event: (eventType, data) => void
   * @returns {Promise<void>}
   */
  async sendMessageStream(conversationId, content, onEvent) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/message/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const event = JSON.parse(data);
            onEvent(event.type, event);
          } catch (e) {
            console.error('Failed to parse SSE event:', e);
          }
        }
      }
    }
  },

  /**
   * Start clarification phase for a conversation.
   */
  async startClarification(conversationId) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/clarification/start`,
      {
        method: 'POST',
      }
    );
    if (!response.ok) {
      throw new Error('Failed to start clarification');
    }
    return response.json();
  },

  /**
   * Submit an answer to a clarification question.
   */
  async submitClarificationAnswer(conversationId, answer) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/clarification/answer`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answer }),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to submit clarification answer');
    }
    return response.json();
  },

  /**
   * Confirm the clarification briefing and proceed to council with streaming.
   * @param {string} conversationId - The conversation ID
   * @param {function} onEvent - Callback function for each event: (eventType, data) => void
   * @returns {Promise<void>}
   */
  async confirmClarificationBriefing(conversationId, onEvent) {
    const response = await fetch(
      `${API_BASE}/api/conversations/${conversationId}/clarification/confirm`,
      {
        method: 'POST',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to confirm briefing');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          try {
            const event = JSON.parse(data);
            onEvent(event.type, event);
          } catch (e) {
            console.error('Failed to parse SSE event:', e);
          }
        }
      }
    }
  },
};

import { useState, useEffect } from 'react';
import TabNavigation from './components/TabNavigation';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import ContextsManager from './components/ContextsManager';
import RolesManager from './components/RolesManager';
import SettingsManager from './components/SettingsManager';
import { api } from './api';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('conversations');
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedContext, setSelectedContext] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [settings, setSettings] = useState(null);
  const [draftPrefill, setDraftPrefill] = useState(null);
  const [focusRequestId, setFocusRequestId] = useState(0);

  const loadConversations = async () => {
    try {
      const convs = await api.listConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadConversation = async (id) => {
    try {
      const conv = await api.getConversation(id);
      setCurrentConversation(conv);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  // Load conversations and settings on mount
  useEffect(() => {
    loadConversations();
    loadSettings();
  }, []);

  // Load conversation details when selected
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  const handleNewConversation = async () => {
    try {
      const contextId = selectedContext?.id || null;
      const roleId = selectedRole?.id || null;
      const newConv = await api.createConversation(contextId, roleId);
      setConversations([
        { id: newConv.id, created_at: newConv.created_at, title: newConv.title, message_count: 0 },
        ...conversations,
      ]);
      setCurrentConversationId(newConv.id);
      setCurrentConversation(newConv);  // Immediately set the conversation object
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleStartReasoning = async (prefillText = '') => {
    try {
      const contextId = selectedContext?.id || null;
      const roleId = selectedRole?.id || null;

      const newConv = await api.createConversation(contextId, roleId);
      setConversations([
        { id: newConv.id, created_at: newConv.created_at, title: newConv.title, message_count: 0 },
        ...conversations,
      ]);
      setCurrentConversationId(newConv.id);
      setCurrentConversation(newConv);

      setDraftPrefill(prefillText || '');
      setFocusRequestId((x) => x + 1);
    } catch (error) {
      console.error('Failed to create reasoning:', error);
    }
  };

  const consumeDraftPrefill = () => setDraftPrefill(null);

  const handleManageContexts = () => {
    setActiveTab('contexts');
  };

  const handleManageRoles = () => {
    setActiveTab('roles');
  };

  const handleSelectContextForConversation = async (context) => {
    setSelectedContext(context);
    
    // If we have an active reasoning with no messages, allow changing context freely.
    // Context snapshot preserves historical correctness once the reasoning begins.
    if (currentConversation && 
        currentConversation.messages.length === 0) {
      try {
        const contextId = context?.id || null;
        const updatedConv = await api.updateConversationContext(currentConversationId, contextId);
        setCurrentConversation(updatedConv);
      } catch (error) {
        console.error('Failed to update conversation context:', error);
      }
    }
  };

  const handleSelectRoleForConversation = async (role) => {
    setSelectedRole(role);
    
    // If we have an active reasoning with no messages, allow changing role freely.
    if (currentConversation && 
        currentConversation.messages.length === 0) {
      try {
        const roleId = role?.id || null;
        const updatedConv = await api.updateConversationRole(currentConversationId, roleId);
        setCurrentConversation(updatedConv);
      } catch (error) {
        console.error('Failed to update conversation role:', error);
      }
    }
  };

  const handleDeleteConversation = async (conversationId) => {
    try {
      await api.deleteConversation(conversationId);
      
      // Remove from list
      setConversations(conversations.filter(conv => conv.id !== conversationId));
      
      // If deleting current conversation, clear it
      if (conversationId === currentConversationId) {
        setCurrentConversationId(null);
        setCurrentConversation(null);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      alert('Failed to delete conversation. Please try again.');
    }
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
  };

  const handleSendMessage = async (content) => {
    if (!currentConversationId) return;

    setIsLoading(true);
    try {
      // If this is the first prompt, update the left list immediately (optimistic title)
      const isFirstMessage = currentConversation && currentConversation.messages.length === 0;
      if (isFirstMessage) {
        const words = (content || '').trim().split(/\s+/).filter(Boolean);
        const draftTitle = words.slice(0, 6).join(' ') + (words.length > 6 ? '…' : '');

        setConversations((prev) =>
          prev.map((c) => (c.id === currentConversationId ? { ...c, title: draftTitle || 'New reasoning' } : c))
        );
        setCurrentConversation((prev) => (prev ? { ...prev, title: draftTitle || prev.title } : prev));
      }

      // Optimistically add user message to UI
      const userMessage = { role: 'user', content };
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      // Check if this is the first message and clarification is enabled
      const clarificationEnabled = settings?.clarification_first_enabled;
      
      // Don't add assistant message placeholder if clarification will start
      // (clarification will be shown in the ClarificationInterface instead)
      if (!isFirstMessage || !clarificationEnabled) {
        // Create a partial assistant message that will be updated progressively
        const assistantMessage = {
          role: 'assistant',
          stage1: null,
          stage2: null,
          stage3: null,
          metadata: null,
          loading: {
            stage1: false,
            stage2: false,
            stage3: false,
          },
        };

        // Add the partial assistant message
        setCurrentConversation((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMessage],
        }));
      }

      // Send message with streaming
      await api.sendMessageStream(currentConversationId, content, (eventType, event) => {
        switch (eventType) {
          case 'stage1_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage1 = true;
              return { ...prev, messages };
            });
            break;

          case 'stage1_complete':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage1 = event.data;
              lastMsg.loading.stage1 = false;
              return { ...prev, messages };
            });
            break;

          case 'stage2_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage2 = true;
              return { ...prev, messages };
            });
            break;

          case 'stage2_complete':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage2 = event.data;
              lastMsg.metadata = event.metadata;
              lastMsg.loading.stage2 = false;
              return { ...prev, messages };
            });
            break;

          case 'stage3_start':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.loading.stage3 = true;
              return { ...prev, messages };
            });
            break;

          case 'stage3_complete':
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              lastMsg.stage3 = event.data;
              lastMsg.loading.stage3 = false;
              return { ...prev, messages };
            });
            break;

          case 'title_complete':
            // Update left list immediately from the event payload (avoid waiting for a full reload)
            if (event?.data?.title) {
              setConversations((prev) =>
                prev.map((c) => (c.id === currentConversationId ? { ...c, title: event.data.title } : c))
              );
              setCurrentConversation((prev) => (prev ? { ...prev, title: event.data.title } : prev));
            } else {
              loadConversations();
            }
            break;

          case 'clarification_auto_start':
            // Clarification mode was automatically started
            break;

          case 'clarification_question':
            // Update conversation with clarification state directly from event
            // Also remove any assistant message placeholder that was added
            setCurrentConversation((prev) => {
              const messages = [...prev.messages];
              // Remove last message if it's an empty assistant placeholder
              if (messages.length > 0 && 
                  messages[messages.length - 1].role === 'assistant' &&
                  !messages[messages.length - 1].stage1) {
                messages.pop();
              }
              return {
                ...prev,
                messages,
                clarification_state: {
                  active: true,
                  history: [],
                  current_question: event.data
                }
              };
            });
            setIsLoading(false);
            break;

          case 'complete':
            // Stream complete, reload conversations list
            loadConversations();
            setIsLoading(false);
            break;

          case 'error':
            console.error('Stream error:', event.message);
            setIsLoading(false);
            break;

          default:
            console.warn('Unknown event type:', eventType);
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove optimistic messages on error
      setCurrentConversation((prev) => ({
        ...prev,
        messages: prev.messages.slice(0, -2),
      }));
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      {activeTab === 'conversations' ? (
        <div className="app-content">
          <Sidebar
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
          />
          <ChatInterface
            conversation={currentConversation}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            selectedContext={selectedContext}
            selectedRole={selectedRole}
            settings={settings}
            onSelectContext={handleSelectContextForConversation}
            onSelectRole={handleSelectRoleForConversation}
            onManageContexts={handleManageContexts}
            onManageRoles={handleManageRoles}
            onConversationUpdate={loadConversation}
            onUpdateConversationState={setCurrentConversation}
            onStartReasoning={handleStartReasoning}
            draftPrefill={draftPrefill}
            focusRequestId={focusRequestId}
            onConsumeDraftPrefill={consumeDraftPrefill}
          />
        </div>
      ) : activeTab === 'contexts' ? (
        <ContextsManager />
      ) : activeTab === 'roles' ? (
        <RolesManager />
      ) : (
        <SettingsManager />
      )}
    </div>
  );
}

export default App;

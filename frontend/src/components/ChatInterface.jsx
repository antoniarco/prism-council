import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import ReasoningControls from './ReasoningControls';
import ClarificationInterface from './ClarificationInterface';
import AnalyzerReasoning from './AnalyzerReasoning';
import ModelEvaluationStage from './ModelEvaluationStage';
import ReasoningSection from './ReasoningSection';
import { Sparkles, ArrowRight, DecorativeBurstIcon } from './Icons';
import { api } from '../api';
import './ChatInterface.css';

export default function ChatInterface({
  conversation,
  onSendMessage,
  isLoading,
  selectedContext,
  selectedRole,
  settings,
  onSelectContext,
  onSelectRole,
  onConversationUpdate,
  onUpdateConversationState,
  onStartReasoning,
  draftPrefill,
  focusRequestId,
  onConsumeDraftPrefill,
}) {
  const [input, setInput] = useState('');
  const [clarificationData, setClarificationData] = useState(null);
  const [clarificationLoading, setClarificationLoading] = useState(false);
  const [showClarificationUI, setShowClarificationUI] = useState(false);
  const [ghostDraft, setGhostDraft] = useState('');
  const [dynamicPicking, setDynamicPicking] = useState(null); // null = use default settings
  const [modelSelection, setModelSelection] = useState(null); // result from model picking
  const [showModelEvaluation, setShowModelEvaluation] = useState(false);
  const [modelEvaluationLoading, setModelEvaluationLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  // Focus + prefill intake after creating a new reasoning from the empty state.
  useEffect(() => {
    if (!conversation) return;

    if (typeof draftPrefill === 'string') {
      setInput(draftPrefill);
      // Clear the prefill so subsequent renders don't overwrite user's edits.
      if (onConsumeDraftPrefill) onConsumeDraftPrefill();
    }

    // Focus request (even if empty prefill)
    if (focusRequestId) {
      requestAnimationFrame(() => {
        messageInputRef.current?.focus();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id, focusRequestId]);

  // Reset dynamic picking when conversation changes (new reasoning)
  useEffect(() => {
    if (conversation?.messages && conversation.messages.length > 0) {
      // Conversation has started, lock dynamic picking
      // (state is already set, just prevent further changes via ReasoningControls)
    } else {
      // New conversation, reset dynamic picking to null
      setDynamicPicking(null);
    }
  }, [conversation?.id]);

  // Load clarification state from conversation if present
  useEffect(() => {
    if (conversation?.clarification_state) {
      const isConfirmed = !!conversation.clarification_state.confirmed;
      if (conversation.clarification_state.active && conversation.clarification_state.current_question) {
        setClarificationData(conversation.clarification_state.current_question);
        setShowClarificationUI(true);
      } else if (!isConfirmed && !conversation.clarification_state.active && conversation.clarification_state.briefing) {
        setClarificationData({
          type: 'briefing',
          ...conversation.clarification_state.briefing
        });
        setShowClarificationUI(true);
      } else {
        // If briefing is confirmed, we return to the main chat view while reasoning streams.
        setClarificationData(null);
        setShowClarificationUI(false);
      }
    } else {
      setClarificationData(null);
      setShowClarificationUI(false);
    }
  }, [conversation]);

  const handleSubmitClarificationAnswer = async (answer) => {
    if (!conversation) return;
    
    setClarificationLoading(true);
    try {
      const result = await api.submitClarificationAnswer(conversation.id, answer);
      
      // Update clarification data and conversation state with the result
      if (result.type === 'briefing') {
        // Briefing received - clarification is complete
        const briefingData = {
          type: 'briefing',
          ...result
        };
        setClarificationData(briefingData);
        setShowClarificationUI(true); // Keep showing the UI for briefing
        
        // Update conversation state to mark clarification as inactive and add final answer to history
        if (onUpdateConversationState) {
          onUpdateConversationState((prev) => ({
            ...prev,
            clarification_state: {
              ...prev.clarification_state,
              active: false,
              history: [...(prev.clarification_state?.history || []), answer],
              briefing: result
            }
          }));
        }
      } else {
        // Another question - update with new question
        setClarificationData(result);
        setShowClarificationUI(true); // Keep showing the UI for next question
        
        // Update conversation state with new question and add answer to history
        if (onUpdateConversationState) {
          onUpdateConversationState((prev) => ({
            ...prev,
            clarification_state: {
              ...prev.clarification_state,
              active: true,
              history: [...(prev.clarification_state?.history || []), answer],
              current_question: result
            }
          }));
        }
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
      alert('Failed to submit answer. Please try again.');
    } finally {
      setClarificationLoading(false);
    }
  };

  const handleConfirmBriefing = async () => {
    if (!conversation) return;
    
    // IMMEDIATELY hide clarification UI to show messages - this is synchronous
    setShowClarificationUI(false);
    setClarificationData(null);

    // Immediately mark briefing as confirmed locally so rerenders during streaming
    // don't bring the briefing UI back.
    if (onUpdateConversationState) {
      onUpdateConversationState((prev) => ({
        ...prev,
        clarification_state: {
          ...(prev.clarification_state || {}),
          active: false,
          confirmed: true,
          confirmed_at: prev.clarification_state?.confirmed_at || new Date().toISOString(),
        },
      }));
    }

    // Check if dynamic model picking is enabled
    if (dynamicPicking && dynamicPicking.mode) {
      // Phase 1: Model Evaluation Stage
      setModelEvaluationLoading(true);
      try {
        // Get the clarified prompt (first user message)
        const firstUserMessage = conversation.messages.find(m => m.role === 'user');
        const clarifiedPrompt = firstUserMessage?.content || '';
        
        // Get context and role
        const contextContent = conversation.context_snapshot?.content || null;
        const roleDescription = conversation.role_snapshot?.description || null;
        
        // Call model picker API
        const result = await api.pickModels(
          clarifiedPrompt,
          contextContent,
          roleDescription,
          dynamicPicking.mode,
          dynamicPicking.numModels || 5
        );
        
        // Store the result and show Model Evaluation Stage
        setModelSelection(result);
        setShowModelEvaluation(true);
        setModelEvaluationLoading(false);
        
        // Stop here - user must explicitly proceed from Model Evaluation Stage
        return;
      } catch (error) {
        console.error('Failed to pick models:', error);
        alert('Failed to pick models. Falling back to default models from settings.');
        setModelEvaluationLoading(false);
        // Fall through to run reasoning with default models
      }
    }

    // Phase 2: Proceed to Council (either called directly or after model evaluation)
    await proceedToCouncil();
  };

  const proceedToCouncil = async () => {
    if (!conversation) return;
    
    setClarificationLoading(true);
    
    try {
      // Create a partial assistant message for the reasoning response
      const assistantMessage = {
        role: 'assistant',
        stage1: null,
        stage2: null,
        stage3: null,
        metadata: null,
        loading: {
          stage1: true, // Start with stage1 loading immediately
          stage2: false,
          stage3: false,
        },
      };
      
      // Add assistant message with initial loading state
      if (onUpdateConversationState) {
        onUpdateConversationState((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMessage],
        }));
      }
      
      // Aggressive scroll strategy: ensure we scroll after React re-renders
      // Use requestAnimationFrame to wait for DOM update
      requestAnimationFrame(() => {
        scrollToBottom();
        setTimeout(() => scrollToBottom(), 100);
        setTimeout(() => scrollToBottom(), 300);
        setTimeout(() => scrollToBottom(), 600);
      });
      
      // Stream the reasoning process
      await api.confirmClarificationBriefing(conversation.id, (eventType, event) => {
        switch (eventType) {
          case 'stage1_start':
            if (onUpdateConversationState) {
              onUpdateConversationState((prev) => {
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                lastMsg.loading.stage1 = true;
                return { ...prev, messages };
              });
            }
            break;
            
          case 'stage1_complete':
            if (onUpdateConversationState) {
              onUpdateConversationState((prev) => {
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                lastMsg.stage1 = event.data;
                lastMsg.loading.stage1 = false;
                return { ...prev, messages };
              });
            }
            setTimeout(() => scrollToBottom(), 100);
            break;
            
          case 'stage2_start':
            if (onUpdateConversationState) {
              onUpdateConversationState((prev) => {
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                lastMsg.loading.stage2 = true;
                return { ...prev, messages };
              });
            }
            setTimeout(() => scrollToBottom(), 100);
            break;
            
          case 'stage2_complete':
            if (onUpdateConversationState) {
              onUpdateConversationState((prev) => {
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                lastMsg.stage2 = event.data;
                lastMsg.metadata = event.metadata;
                lastMsg.loading.stage2 = false;
                return { ...prev, messages };
              });
            }
            setTimeout(() => scrollToBottom(), 100);
            break;
            
          case 'stage3_start':
            if (onUpdateConversationState) {
              onUpdateConversationState((prev) => {
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                lastMsg.loading.stage3 = true;
                return { ...prev, messages };
              });
            }
            setTimeout(() => scrollToBottom(), 100);
            break;
            
          case 'stage3_complete':
            if (onUpdateConversationState) {
              onUpdateConversationState((prev) => {
                const messages = [...prev.messages];
                const lastMsg = messages[messages.length - 1];
                lastMsg.stage3 = event.data;
                lastMsg.loading.stage3 = false;
                return { ...prev, messages };
              });
            }
            setTimeout(() => scrollToBottom(), 100);
            break;
            
          case 'complete':
            setClarificationLoading(false);
            // Final scroll to show complete response
            setTimeout(() => scrollToBottom(), 100);
            // Reload conversation list to update titles
            if (onConversationUpdate) {
              onConversationUpdate(conversation.id);
            }
            break;
            
          case 'error':
            console.error('Council error:', event.message);
            alert('Error during reasoning process: ' + event.message);
            setClarificationLoading(false);
            break;
        }
      });
    } catch (error) {
      console.error('Failed to confirm briefing:', error);
      console.error('Error stack:', error.stack);
      alert('Failed to confirm briefing: ' + error.message);
      setClarificationLoading(false);
    }
  };

  const handleProceedFromModelEvaluation = async () => {
    // Store the selected models in the conversation state (both frontend and backend)
    if (modelSelection && conversation) {
      // Update frontend state
      if (onUpdateConversationState) {
        onUpdateConversationState((prev) => ({
          ...prev,
          model_selection: {
            models: modelSelection.models,
            mode: modelSelection.mode_used || modelSelection.mode,
            rationales: modelSelection.rationales
          }
        }));
      }
      
      // Persist to backend storage
      try {
        await api.updateConversationModelSelection(
          conversation.id,
          modelSelection.models,
          modelSelection.mode_used || modelSelection.mode,
          modelSelection.rationales
        );
      } catch (error) {
        console.error('Failed to save model selection:', error);
        alert('Failed to save model selection. Default models will be used.');
      }
    }
    
    // Hide Model Evaluation Stage and proceed to reasoning
    setShowModelEvaluation(false);
    await proceedToCouncil();
  };

  const handleCancelModelEvaluation = () => {
    // Cancel and go back to empty state (restart reasoning)
    setShowModelEvaluation(false);
    setModelSelection(null);
    setDynamicPicking(null);
    // Clear conversation state to start fresh
    if (onUpdateConversationState) {
      onUpdateConversationState((prev) => ({
        ...prev,
        messages: [],
        clarification_state: null
      }));
    }
  };

  const buildFullPrompt = (userMessage, messageIndex) => {
    // Get the conversation context and role
    const context = conversation?.context_snapshot;
    const role = conversation?.role_snapshot;
    
    // Build the full prompt as sent to models
    let fullPrompt = '';
    
    // Add role if present
    if (role) {
      fullPrompt += `[ROLE - You must adopt this role for all responses]\n\n${role.description}\n\n[END ROLE]\n\n`;
    }
    
    // Add context if present
    if (context) {
      fullPrompt += `[CONTEXT - Treat as authoritative background]\n\n${context.content}\n\n[END CONTEXT]\n\n`;
    }
    
    // Add conversation history (all messages before this one)
    const historyMessages = conversation.messages.slice(0, messageIndex);
    if (historyMessages.length > 0) {
      fullPrompt += `[CONVERSATION HISTORY]\n\n`;
      historyMessages.forEach((msg) => {
        if (msg.role === 'user') {
          fullPrompt += `User: ${msg.content}\n\n`;
        } else if (msg.role === 'assistant' && msg.stage3) {
          fullPrompt += `Assistant: ${msg.stage3.response}\n\n`;
        }
      });
      fullPrompt += `[END HISTORY]\n\n`;
    }
    
    // Add current user message
    fullPrompt += `[CURRENT QUERY]\n\n${userMessage}`;
    
    return fullPrompt;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    // Writing-first behavior:
    // - Enter inserts a newline
    // - Shift+Enter submits (optional, secondary)
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const triggerStartReasoning = async (prefillText = '') => {
    if (!onStartReasoning) return;
    await onStartReasoning(prefillText);
  };

  const handleGhostMouseDown = (e) => {
    // Create the reasoning on explicit click (ChatGPT/Claude-style entry point).
    // MouseDown ensures we trigger before the textarea fully captures focus/typing.
    e.preventDefault();
    triggerStartReasoning(ghostDraft.trim());
  };

  const handleGhostKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      triggerStartReasoning(ghostDraft.trim());
      return;
    }

    // First keystroke should create a reasoning and carry content over.
    const isPrintable =
      e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey;

    if (isPrintable) {
      e.preventDefault();
      triggerStartReasoning((ghostDraft + e.key).trimStart());
    }
  };

  const handleGhostPaste = (e) => {
    const pasted = e.clipboardData?.getData('text') ?? '';
    if (!pasted) return;
    e.preventDefault();
    triggerStartReasoning((ghostDraft + pasted).trim());
  };

  if (!conversation) {
    return (
      <div className="chat-interface">
        <div className="empty-state prism-empty-v0">
          <div className="prism-empty-headline">
            <DecorativeBurstIcon className="prism-decorative-burst" size={30} />
            Think deliberately. Decide intentionally.
          </div>

          <div className="prism-empty-input">
            <div className="prism-empty-prompt">
              <div className="prism-ghost-wrapper">
                <textarea
                  className="prism-ghost prism-ghost--hero"
                  rows={3}
                  placeholder="Describe the decision or question you want to reason about…"
                  value={ghostDraft}
                  onChange={(e) => setGhostDraft(e.target.value)}
                  onMouseDown={handleGhostMouseDown}
                  onKeyDown={handleGhostKeyDown}
                  onPaste={handleGhostPaste}
                  aria-label="Start a new reasoning"
                />
                <div className="prism-cta-footer">
                  <div className="prism-cta-helper">
                    <Sparkles className="icon" size={16} />
                    <span>AI-powered reasoning</span>
                  </div>
                  <button 
                    className="prism-cta-button"
                    onClick={() => {
                      if (ghostDraft.trim()) {
                        triggerStartReasoning(ghostDraft.trim());
                      }
                    }}
                    disabled={!ghostDraft.trim()}
                  >
                    Start Reasoning
                    <ArrowRight className="icon" size={16} />
                  </button>
                </div>
              </div>
            </div>
            {/* Model providers - subtle credibility indicator */}
            <div className="frontier-credibility">
              <div className="frontier-providers">
                <div className="frontier-icon-group">
                  <div className="frontier-logo-container">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="frontier-icon frontier-icon-emerald">
                      <path d="M12 8V4H8"></path>
                      <rect width="16" height="12" x="4" y="8" rx="2"></rect>
                      <path d="M2 14h2"></path>
                      <path d="M20 14h2"></path>
                      <path d="M15 13v2"></path>
                      <path d="M9 13v2"></path>
                    </svg>
                  </div>
                  <div className="frontier-logo-tooltip">OpenAI</div>
                </div>

                <div className="frontier-icon-group">
                  <div className="frontier-logo-container">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="frontier-icon frontier-icon-amber">
                      <rect width="16" height="16" x="4" y="4" rx="2"></rect>
                      <rect width="6" height="6" x="9" y="9" rx="1"></rect>
                      <path d="M15 2v2"></path>
                      <path d="M15 20v2"></path>
                      <path d="M2 15h2"></path>
                      <path d="M2 9h2"></path>
                      <path d="M20 15h2"></path>
                      <path d="M20 9h2"></path>
                      <path d="M9 2v2"></path>
                      <path d="M9 20v2"></path>
                    </svg>
                  </div>
                  <div className="frontier-logo-tooltip">Anthropic</div>
                </div>

                <div className="frontier-icon-group">
                  <div className="frontier-logo-container">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="frontier-icon frontier-icon-blue">
                      <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>
                    </svg>
                  </div>
                  <div className="frontier-logo-tooltip">Google</div>
                </div>
              </div>
              <p className="frontier-scale">+ 300 additional models across providers</p>
              <p className="frontier-descriptor">Decision-grade multi-model reasoning infrastructure</p>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {/* Clarification Phase - controlled by explicit flag for immediate UI updates */}
        {showClarificationUI && clarificationData && (
          <ClarificationInterface
            clarificationData={clarificationData}
            onSubmitAnswer={handleSubmitClarificationAnswer}
            onConfirmBriefing={handleConfirmBriefing}
            isLoading={clarificationLoading}
          />
        )}

        {!showClarificationUI && conversation.messages.length === 0 && (
          <div className="empty-state">
            <h2>New reasoning</h2>
            <p>Write a prompt to start the reasoning process.</p>
            <div className="empty-state-hint">
              You can optionally set a context and role above.
            </div>
          </div>
        )}

        {!showClarificationUI && conversation.messages.length > 0 && (
          conversation.messages.map((msg, index) => {
            // Skip rendering assistant messages if we're showing model evaluation stage
            // (Council hasn't started yet, user needs to confirm model selection first)
            if (msg.role === 'assistant' && showModelEvaluation) {
              return null;
            }

            return (
              <div key={index} className="message-group">
                {msg.role === 'user' ? (
                  <div className="user-message">
                    <ReasoningSection title="Prompt" defaultExpanded={true}>
                      <div className="markdown-content">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      
                      <details className="reasoning-disclosure" open={false}>
                        <summary>View full prompt payload</summary>
                        <pre className="reasoning-pre">
                          {buildFullPrompt(msg.content, index)}
                        </pre>
                      </details>
                    </ReasoningSection>
                    
                    {/* Analyzer reasoning block (between prompt and multi-model deliberation) */}
                    {index === 0 && conversation.clarification_state && conversation.clarification_state.confirmed && (
                      <AnalyzerReasoning clarificationState={conversation.clarification_state} />
                    )}

                    {/* Model Evaluation Stage (between analyzer and multi-model deliberation) */}
                    {/* Show during active selection OR as historical record */}
                    {index === 0 && (
                      (showModelEvaluation && modelSelection) ? (
                        <ModelEvaluationStage
                          modelSelection={modelSelection}
                          onProceed={handleProceedFromModelEvaluation}
                          onCancel={handleCancelModelEvaluation}
                          isLoading={modelEvaluationLoading}
                        />
                      ) : (modelSelection || conversation.model_selection) ? (
                        <ModelEvaluationStage
                          modelSelection={modelSelection || conversation.model_selection}
                          readOnly={true}
                        />
                      ) : null
                    )}
                  </div>
                ) : (
                  <div className="assistant-message">
                    <ReasoningSection 
                      title="PRISM Council" 
                      metadata={msg.stage1 ? `${msg.stage1.length} models` : null}
                      defaultExpanded={false}
                    >
                      {/* Stage 1 */}
                      {msg.loading?.stage1 && (
                        <div className="reasoning-loading">
                          <div className="spinner"></div>
                          <span>Stage 1: collecting individual outputs…</span>
                        </div>
                      )}
                      {msg.stage1 && <Stage1 responses={msg.stage1} />}

                      {/* Stage 2 */}
                      {msg.loading?.stage2 && (
                        <div className="reasoning-loading">
                          <div className="spinner"></div>
                          <span>Stage 2: peer evaluation…</span>
                        </div>
                      )}
                      {msg.stage2 && (
                        <Stage2
                          rankings={msg.stage2}
                          labelToModel={msg.metadata?.label_to_model}
                          aggregateRankings={msg.metadata?.aggregate_rankings}
                        />
                      )}
                    </ReasoningSection>

                    <ReasoningSection title="Final synthesis" defaultExpanded={true}>
                      {msg.loading?.stage3 && (
                        <div className="reasoning-loading">
                          <div className="spinner"></div>
                          <span>Synthesizing…</span>
                        </div>
                      )}
                      {msg.stage3 && <Stage3 finalResponse={msg.stage3} />}
                    </ReasoningSection>
                  </div>
                )}
              </div>
            );
          })
        )}

        {(isLoading || clarificationLoading || modelEvaluationLoading) && !showClarificationUI && !showModelEvaluation && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <span>
              {modelEvaluationLoading
                ? 'Evaluating model selection...'
                : conversation.messages.length === 1 && settings?.clarification_first_enabled && !conversation.clarification_state
                ? 'Clarification Analyzer analyzing...'
                : clarificationLoading
                ? 'Clarification Analyzer analyzing...'
                : 'Analyzing...'}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Only show regular input if not showing clarification UI */}
      {!showClarificationUI && (
        <form className="input-form" onSubmit={handleSubmit}>
          <div className="composer-area">
            <ReasoningControls
              conversation={conversation}
              selectedContext={selectedContext}
              selectedRole={selectedRole}
              onSelectContext={onSelectContext}
              onSelectRole={onSelectRole}
              dynamicPicking={dynamicPicking}
              onDynamicPickingChange={setDynamicPicking}
            />
            <div className="composer" role="group" aria-label="Reasoning intake">
            <textarea
              className="message-input"
              placeholder="Describe the decision or question you want to reason about…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={4}
              ref={messageInputRef}
            />
            <div className="composer-footer">
              <div className="composer-hint">Shift+Enter to proceed</div>
              <button
                type="submit"
                className="composer-action"
                disabled={!input.trim() || isLoading}
              >
                {conversation?.messages?.length === 0 ? 'Start reasoning' : 'Continue'}
              </button>
            </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

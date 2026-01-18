import ReasoningSection from './ReasoningSection';
import './ModelEvaluationStage.css';

export default function ModelEvaluationStage({ 
  modelSelection, 
  onProceed, 
  onCancel,
  isLoading,
  readOnly = false
}) {
  if (!modelSelection) return null;

  const { models, rationales, mode_used, mode } = modelSelection;
  const actualMode = mode_used || mode; // Support both field names

  const modeLabels = {
    max_stakes: 'Maximum Stakes',
    max_stakes_optimized: 'Maximum Stakes (Cost-Optimized)',
    max_cultural_biases: 'Maximum Cultural Biases',
    cheapest: 'Cheapest'
  };

  const modeDescriptions = {
    max_stakes: 'Strongest available models for high-stakes reasoning',
    max_stakes_optimized: 'High-quality models optimized for cost relative to task scope',
    max_cultural_biases: 'Highly differentiated models to surface bias and disagreement',
    cheapest: 'Lowest-cost models suitable for the task'
  };

  return (
    <ReasoningSection
      title="Model evaluation stage"
      metadata={modeLabels[actualMode] || actualMode}
      defaultExpanded={false}
    >
      <div className="model-eval-intro">
        <p className="model-eval-explanation">
          PRISM selected {models.length} model{models.length !== 1 ? 's' : ''} based on the reasoning scope using <strong>{modeLabels[actualMode]}</strong> mode.
        </p>
        <p className="model-eval-description">
          {modeDescriptions[actualMode]}
        </p>
      </div>

      <div className="model-eval-list">
        <div className="model-eval-list-header">Selected Models</div>
        {models.map((modelId) => {
          // Extract provider and model name from ID (e.g., "openai/gpt-4o" -> "OpenAI" + "GPT-4o")
          const parts = modelId.split('/');
          const provider = parts[0] || 'Unknown';
          const modelName = parts[1] || modelId;

          return (
            <div key={modelId} className="model-eval-item">
              <div className="model-eval-item-header">
                <div className="model-eval-item-provider">{provider}</div>
                <div className="model-eval-item-name">{modelName}</div>
              </div>
              <div className="model-eval-item-rationale">
                {rationales[modelId] || 'Selected for this reasoning task'}
              </div>
            </div>
          );
        })}
      </div>

      {!readOnly && !isLoading && (
        <div className="model-eval-actions">
          <button 
            type="button" 
            className="model-eval-btn model-eval-btn-primary" 
            onClick={onProceed}
          >
            ✓ Proceed to Council
          </button>
          <button 
            type="button" 
            className="model-eval-btn model-eval-btn-secondary" 
            onClick={onCancel}
          >
            Cancel & Restart
          </button>
        </div>
      )}

      {!readOnly && isLoading && (
        <div className="reasoning-loading">
          <div className="spinner"></div>
          <span>Preparing multi-model reasoning with selected models...</span>
        </div>
      )}
    </ReasoningSection>
  );
}


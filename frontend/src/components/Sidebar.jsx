import './Sidebar.css';
import { Plus, Clock, X } from './Icons';

function parseISO(s) {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function relativeLabel(date) {
  if (!date) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHr = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMin < 2) return 'Updated just now';
  if (diffMin < 60) return `Updated ${diffMin}m ago`;
  if (diffHr < 24) return `Updated ${diffHr}h ago`;
  if (diffDay === 1) return 'Updated yesterday';
  if (diffDay < 7) return `Updated ${diffDay}d ago`;
  return `Updated ${date.toLocaleDateString()}`;
}

function bucketLabel(date) {
  if (!date) return 'Older';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  if (date >= startOfToday) return 'Today';
  if (date >= startOfWeek) return 'This week';
  return 'Older';
}

export default function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}) {
  const handleDelete = (e, convId) => {
    e.stopPropagation(); // Prevent conversation selection
    if (window.confirm('Delete this reasoning? This cannot be undone.')) {
      onDeleteConversation(convId);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <button className="new-conversation-btn" onClick={onNewConversation}>
          <Plus className="icon" size={16} />
          New reasoning
        </button>
      </div>

      <div className="conversation-list">
        {conversations.length === 0 ? (
          <div className="no-conversations">No reasonings yet.</div>
        ) : (
          (() => {
            // Group by updated_at (preferred) or created_at.
            const groups = { Today: [], 'This week': [], Older: [] };
            conversations.forEach((conv) => {
              const d = parseISO(conv.updated_at || conv.created_at);
              const b = bucketLabel(d);
              groups[b].push({ ...conv, _date: d });
            });

            const order = ['Today', 'This week', 'Older'];

            return order.map((label) => {
              const items = groups[label];
              if (!items || items.length === 0) return null;

              return (
                <div key={label} className="archive-group">
                  <div className="archive-group-label">{label}</div>
                  {items.map((conv) => {
                    const normalizedTitle =
                      conv.title === 'New Conversation' || conv.title === 'New reasoning'
                        ? 'Untitled reasoning'
                        : (conv.title || 'Untitled reasoning');
                    return (
                      <div
                        key={conv.id}
                        className={`conversation-item ${conv.id === currentConversationId ? 'active' : ''}`}
                        onClick={() => onSelectConversation(conv.id)}
                      >
                        <div className="conversation-content">
                          <div className="conversation-title">{normalizedTitle}</div>
                          <div className="conversation-meta">
                            <Clock className="icon" size={12} />
                            <span>{relativeLabel(conv._date)}</span>
                          </div>
                        </div>
                        <button
                          className="delete-conversation-btn"
                          onClick={(e) => handleDelete(e, conv.id)}
                          title="Delete reasoning"
                          aria-label="Delete reasoning"
                        >
                          <X className="icon" size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()
        )}
      </div>
    </div>
  );
}

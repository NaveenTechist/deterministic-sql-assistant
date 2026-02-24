import { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ChatInput from './components/ChatInput';

const API_BASE = '/api';

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messagesByConvo, setMessagesByConvo] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const activeMessages = activeConversationId
    ? (messagesByConvo[activeConversationId] || [])
    : [];

  /* ── New Chat ─────────────────────────────────────────────────────────── */
  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  /* ── Select Conversation ──────────────────────────────────────────────── */
  const handleSelectConversation = useCallback((id) => {
    setActiveConversationId(id);
  }, []);

  /* ── Send Message ─────────────────────────────────────────────────────── */
  const handleSend = useCallback(async (prompt) => {
    // Optimistically add user message
    const tempId = activeConversationId || '__new__';
    setMessagesByConvo(prev => ({
      ...prev,
      [tempId]: [...(prev[tempId] || []), { role: 'user', content: prompt }],
    }));

    if (!activeConversationId) {
      setActiveConversationId(tempId);
    }

    setIsLoading(true);

    try {
      const resp = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          conversation_id: activeConversationId,
        }),
      });

      const data = await resp.json();
      const convoId = data.conversation_id;

      // Build assistant message
      const assistantMessage = {
        role: 'assistant',
        sql: data.sql || null,
        columns: data.columns || null,
        rows: data.rows || null,
        error: data.error || null,
        content: data.message || null,
      };

      // If this was a new conversation, migrate messages from tempId
      setMessagesByConvo(prev => {
        const prevMessages = prev[tempId] || [];
        const updated = { ...prev };
        if (tempId === '__new__') {
          delete updated['__new__'];
        }
        updated[convoId] = [...prevMessages, assistantMessage];
        return updated;
      });

      setActiveConversationId(convoId);

      // Update sidebar conversations list
      setConversations(prev => {
        const exists = prev.find(c => c.id === convoId);
        if (exists) return prev;
        return [
          { id: convoId, title: prompt.length > 50 ? prompt.slice(0, 50) + '...' : prompt },
          ...prev,
        ];
      });
    } catch (err) {
      // Network or server error
      const errorMessage = {
        role: 'assistant',
        error: `Connection error: ${err.message}. Make sure the backend is running on port 8000.`,
      };

      setMessagesByConvo(prev => ({
        ...prev,
        [tempId]: [...(prev[tempId] || []), errorMessage],
      }));
    } finally {
      setIsLoading(false);
    }
  }, [activeConversationId]);

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-primary)',
      transition: `background-color var(--transition-base)`,
    }}>
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversation={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
      />

      {/* Main Area */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        transition: `all var(--transition-base)`,
      }}>
        {/* Chat messages */}
        <ChatArea messages={activeMessages} isLoading={isLoading} />

        {/* Input */}
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </main>
    </div>
  );
}

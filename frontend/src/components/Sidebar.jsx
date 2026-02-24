import { useState } from 'react';
import ThemeToggle from './ThemeToggle';

export default function Sidebar({
    conversations,
    activeConversation,
    onSelectConversation,
    onNewChat,
    collapsed,
    onToggleCollapse,
}) {
    return (
        <>
            {/* Sidebar */}
            <aside
                id="sidebar"
                style={{
                    width: collapsed ? '0px' : 'var(--sidebar-width)',
                    minWidth: collapsed ? '0px' : 'var(--sidebar-width)',
                    backgroundColor: 'var(--bg-sidebar)',
                    borderRight: collapsed ? 'none' : '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    transition: `all var(--transition-base)`,
                    position: 'relative',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    opacity: collapsed ? 0 : 1,
                    transition: `opacity var(--transition-fast)`,
                }}>
                    <button
                        id="new-chat-btn"
                        onClick={onNewChat}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'transparent',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            fontFamily: 'var(--font-family)',
                            transition: `background-color var(--transition-fast)`,
                            whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        New Chat
                    </button>

                    <button
                        id="sidebar-collapse-btn"
                        onClick={onToggleCollapse}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-secondary)',
                            transition: `all var(--transition-fast)`,
                            display: 'flex',
                            alignItems: 'center',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Collapse sidebar"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="9" y1="3" x2="9" y2="21" />
                        </svg>
                    </button>
                </div>

                {/* Conversation list */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '4px 8px',
                    opacity: collapsed ? 0 : 1,
                    transition: `opacity var(--transition-fast)`,
                }}>
                    {conversations.length === 0 && (
                        <p style={{
                            textAlign: 'center',
                            color: 'var(--text-muted)',
                            fontSize: '13px',
                            padding: '20px 10px',
                        }}>
                            No conversations yet
                        </p>
                    )}
                    {conversations.map((c) => (
                        <button
                            key={c.id}
                            id={`convo-${c.id}`}
                            onClick={() => onSelectConversation(c.id)}
                            style={{
                                width: '100%',
                                display: 'block',
                                padding: '10px 12px',
                                marginBottom: '2px',
                                borderRadius: 'var(--radius-sm)',
                                border: 'none',
                                backgroundColor: c.id === activeConversation ? 'var(--bg-hover)' : 'transparent',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontFamily: 'var(--font-family)',
                                textAlign: 'left',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                transition: `background-color var(--transition-fast)`,
                            }}
                            onMouseEnter={e => { if (c.id !== activeConversation) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                            onMouseLeave={e => { if (c.id !== activeConversation) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                            {c.title}
                        </button>
                    ))}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '12px',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: collapsed ? 0 : 1,
                    transition: `opacity var(--transition-fast)`,
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: 'var(--radius-full)',
                            background: 'linear-gradient(135deg, var(--accent), #6366f1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: 600,
                        }}>
                            DB
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>SQL Bot</span>
                    </div>
                    <ThemeToggle />
                </div>
            </aside>

            {/* Floating expand button when collapsed */}
            {collapsed && (
                <button
                    id="sidebar-expand-btn"
                    onClick={onToggleCollapse}
                    style={{
                        position: 'fixed',
                        top: '14px',
                        left: '14px',
                        zIndex: 50,
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        boxShadow: 'var(--shadow-md)',
                        transition: `all var(--transition-fast)`,
                        display: 'flex',
                        alignItems: 'center',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                    title="Expand sidebar"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                    </svg>
                </button>
            )}
        </>
    );
}

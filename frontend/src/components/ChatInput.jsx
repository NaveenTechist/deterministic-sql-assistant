import { useState, useRef, useEffect } from 'react';

export default function ChatInput({ onSend, disabled }) {
    const [value, setValue] = useState('');
    const textareaRef = useRef(null);

    // Auto-resize textarea
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }, [value]);

    const handleSubmit = () => {
        const trimmed = value.trim();
        if (!trimmed || disabled) return;
        onSend(trimmed);
        setValue('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const isEmpty = value.trim().length === 0;

    return (
        <div style={{
            width: '100%',
            maxWidth: '768px',
            margin: '0 auto',
            padding: '0 16px 24px',
        }}>
            {/* Read-Only Badge */}
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '8px',
            }}>
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-color)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Read-Only Mode
                </span>
            </div>

            {/* Input container */}
            <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-end',
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '8px 48px 8px 16px',
                boxShadow: 'var(--shadow-sm)',
                transition: `all var(--transition-fast)`,
            }}>
                <textarea
                    ref={textareaRef}
                    id="chat-input"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your data…"
                    disabled={disabled}
                    rows={1}
                    style={{
                        flex: 1,
                        resize: 'none',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        color: 'var(--text-primary)',
                        fontSize: '15px',
                        lineHeight: '1.5',
                        fontFamily: 'var(--font-family)',
                        maxHeight: '200px',
                        padding: '4px 0',
                    }}
                />
                {/* Send button */}
                <button
                    id="send-btn"
                    onClick={handleSubmit}
                    disabled={isEmpty || disabled}
                    style={{
                        position: 'absolute',
                        right: '8px',
                        bottom: '8px',
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-full)',
                        border: 'none',
                        backgroundColor: (!isEmpty && !disabled) ? 'var(--text-primary)' : 'var(--text-muted)',
                        color: 'var(--bg-primary)',
                        cursor: (!isEmpty && !disabled) ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: `all var(--transition-fast)`,
                        opacity: (!isEmpty && !disabled) ? 1 : 0.4,
                    }}
                    title="Send message"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                </button>
            </div>

            <p style={{
                textAlign: 'center',
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginTop: '8px',
            }}>
                SQL Bot can make mistakes. Verify important queries.
            </p>
        </div>
    );
}

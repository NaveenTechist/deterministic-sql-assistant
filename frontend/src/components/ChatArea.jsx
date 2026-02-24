import { useRef, useEffect, useState } from 'react';

/* ── Helper: export rows to CSV ─────────────────────────────────────────── */
function downloadCSV(columns, rows) {
    const header = columns.join(',');
    const body = rows.map(r => columns.map(c => {
        const val = r[c] ?? '';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    }).join(',')).join('\n');
    const csv = header + '\n' + body;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_results_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}


/* ── Typing dots animation ──────────────────────────────────────────────── */
function TypingIndicator() {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '12px 16px',
        }}>
            {[0, 1, 2].map(i => (
                <div
                    key={i}
                    style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--text-muted)',
                        animation: `pulse-dot 1.4s infinite ease-in-out`,
                        animationDelay: `${i * 0.2}s`,
                    }}
                />
            ))}
        </div>
    );
}


/* ── SQL code block ─────────────────────────────────────────────────────── */
function SQLBlock({ sql }) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{
            backgroundColor: 'var(--bg-code)',
            borderRadius: 'var(--radius-sm)',
            marginTop: '8px',
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 12px',
                borderBottom: '1px solid var(--border-color)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
            }}>
                <span>SQL</span>
                <button
                    onClick={copy}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        fontSize: '11px',
                        fontFamily: 'var(--font-family)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                    }}
                >
                    {copied ? '✓ Copied' : 'Copy'}
                </button>
            </div>
            <pre style={{
                padding: '12px',
                margin: 0,
                fontSize: '13px',
                lineHeight: '1.6',
                fontFamily: "'Fira Code', 'Consolas', monospace",
                overflowX: 'auto',
                color: 'var(--text-primary)',
            }}>{sql}</pre>
        </div>
    );
}


/* ── Results table ──────────────────────────────────────────────────────── */
function ResultsTable({ columns, rows }) {
    if (!columns || columns.length === 0) return null;

    return (
        <div style={{ marginTop: '10px' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
            }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {rows.length} row{rows.length !== 1 ? 's' : ''} returned
                </span>
                <button
                    onClick={() => downloadCSV(columns, rows)}
                    style={{
                        background: 'none',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '3px 10px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-family)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: `background-color var(--transition-fast)`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Export CSV
                </button>
            </div>
            <div style={{
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                overflow: 'auto',
                maxHeight: '320px',
            }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                    fontFamily: "'Fira Code', 'Consolas', monospace",
                }}>
                    <thead>
                        <tr>
                            {columns.map(col => (
                                <th key={col} style={{
                                    position: 'sticky',
                                    top: 0,
                                    backgroundColor: 'var(--bg-input)',
                                    padding: '8px 12px',
                                    textAlign: 'left',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    color: 'var(--text-secondary)',
                                    borderBottom: '2px solid var(--border-color)',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {col}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr
                                key={i}
                                style={{
                                    transition: `background-color var(--transition-fast)`,
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                {columns.map(col => (
                                    <td key={col} style={{
                                        padding: '7px 12px',
                                        borderBottom: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>null</span>}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


/* ── Error display ──────────────────────────────────────────────────────── */
function ErrorBlock({ error }) {
    return (
        <div style={{
            marginTop: '8px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: 'var(--danger)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
        }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '1px', flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
        </div>
    );
}


/* ── Main ChatArea component ────────────────────────────────────────────── */
export default function ChatArea({ messages, isLoading }) {
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    return (
        <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 16px',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* Empty state */}
            {messages.length === 0 && !isLoading && (
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    opacity: 0.7,
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, var(--accent), #6366f1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 32px rgba(16, 163, 127, 0.25)',
                    }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <ellipse cx="12" cy="5" rx="9" ry="3" />
                            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                        </svg>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-primary)' }}>
                            SQL Bot
                        </h2>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                            Ask questions about your database in plain English
                        </p>
                    </div>
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        justifyContent: 'center',
                        marginTop: '8px',
                        maxWidth: '500px',
                    }}>
                        {[
                            'Show all users',
                            'Top 5 orders by amount',
                            'Count users by status',
                            'Recent orders this month',
                        ].map(q => (
                            <span
                                key={q}
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: 'var(--radius-full)',
                                    border: '1px solid var(--border-color)',
                                    fontSize: '13px',
                                    color: 'var(--text-secondary)',
                                    cursor: 'default',
                                }}
                            >
                                "{q}"
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div style={{ maxWidth: '768px', width: '100%', margin: '0 auto' }}>
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className="animate-fade-in-up"
                        style={{
                            marginBottom: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        }}
                    >
                        {/* Label */}
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            marginBottom: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            {msg.role === 'user' ? 'You' : 'SQL Bot'}
                        </span>

                        {/* Bubble */}
                        <div style={{
                            backgroundColor: msg.role === 'user' ? 'var(--bg-user-bubble)' : 'var(--bg-assistant-bubble)',
                            borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            padding: msg.role === 'user' ? '10px 16px' : '4px 0',
                            maxWidth: msg.role === 'user' ? '85%' : '100%',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            color: 'var(--text-primary)',
                        }}>
                            {msg.role === 'user' ? (
                                msg.content
                            ) : (
                                <>
                                    {msg.sql && <SQLBlock sql={msg.sql} />}
                                    {msg.error && <ErrorBlock error={msg.error} />}
                                    {msg.columns && msg.rows && (
                                        <ResultsTable columns={msg.columns} rows={msg.rows} />
                                    )}
                                    {msg.content && !msg.sql && !msg.error && (
                                        <p style={{ padding: '8px 4px' }}>{msg.content}</p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ))}

                {/* Typing indicator */}
                {isLoading && (
                    <div className="animate-fade-in-up" style={{ marginBottom: '24px' }}>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            marginBottom: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            display: 'block',
                        }}>
                            SQL Bot
                        </span>
                        <TypingIndicator />
                    </div>
                )}

                <div ref={bottomRef} />
            </div>
        </div>
    );
}

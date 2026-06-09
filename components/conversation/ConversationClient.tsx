'use client'

import { useState, useEffect, useRef } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

type Props = {
  firstName: string
  coachName: string
  coachStyle: string
  initialHistory: { role: string; content: string; created_at: string }[]
}

const QUICK_SUGGESTIONS = [
  'Adapter mon plan',
  'Douleur au genou',
  'Nutrition avant course',
  'Mon allure cible',
]

const SendIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13"/>
    <path d="M22 2l-7 20-4-9-9-4 20-7z"/>
  </svg>
)

const MicIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#6E5E55" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
    <path d="M19 10v2a7 7 0 01-14 0v-2"/>
    <path d="M12 19v4"/>
    <path d="M8 23h8"/>
  </svg>
)

const PhoneIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#6E5E55" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013 5.18 2 2 0 014.99 3h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L9.09 10a16 16 0 006.29 6.29l1.36-1.36a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
  </svg>
)

export default function ConversationClient({ firstName, coachName, coachStyle, initialHistory }: Props) {
  const [messages,  setMessages]  = useState<Message[]>(
    initialHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  )
  const [input,     setInput]     = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const messagesEndRef            = useRef<HTMLDivElement>(null)
  const textareaRef               = useRef<HTMLTextAreaElement>(null)

  const initial = coachName.charAt(0).toUpperCase()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || streaming) return

    setInput('')
    setError(null)
    setMessages(prev => [
      ...prev,
      { role: 'user',      content: trimmed },
      { role: 'assistant', content: '' },
    ])
    setStreaming(true)

    try {
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })

      if (!response.ok || !response.body) throw new Error('Erreur réseau')

      const reader  = response.body.getReader()
      const decoder = new TextDecoder()
      let streamedText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        streamedText += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: streamedText }
          return updated
        })
      }
    } catch {
      setError("Le coach n'est pas disponible pour le moment. Réessaie.")
      setMessages(prev => {
        const last = prev[prev.length - 1]
        return last?.role === 'assistant' && last.content === '' ? prev.slice(0, -1) : prev
      })
    } finally {
      setStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleSuggestion = (text: string) => {
    setInput(text)
    textareaRef.current?.focus()
  }

  const isTyping = streaming && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#F4F0EA', overflow: 'hidden' }}>

      {/* Header coach */}
      <div style={{
        padding: '8px 16px 10px', borderBottom: '1px solid #DDD7CE',
        background: '#FFFFFF', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: '#C5402C',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 16, fontWeight: 900,
              boxShadow: '0 3px 10px rgba(197,64,44,0.10)',
            }}>
              {initial}
            </div>
            <div style={{
              position: 'absolute', bottom: 1, right: 1,
              width: 10, height: 10, borderRadius: '50%',
              background: '#22C55E', border: '2px solid #FFFFFF',
            }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ color: '#160E08', fontSize: 14, fontWeight: 800, margin: '0 0 1px', letterSpacing: -0.3 }}>
              {coachName}
            </p>
            <p style={{ color: '#22C55E', fontSize: 11, margin: 0, fontWeight: 600 }}>
              En ligne · Coach IA Foulée
            </p>
          </div>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', background: '#EDE8E1',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <PhoneIcon />
          </div>
        </div>
      </div>

      {/* Zone messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '14px 14px 10px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#C5BCAF', fontSize: 13, marginTop: 32, padding: '0 20px' }}>
            <p style={{ margin: '0 0 4px' }}>Pose-moi une question, {firstName}.</p>
            <p style={{ fontSize: 11, margin: 0 }}>Entraînement, récupération, nutrition, motivation…</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe            = msg.role === 'user'
          const isStreamingThis = streaming && i === messages.length - 1 && msg.role === 'assistant'

          return (
            <div key={i} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 7, alignItems: 'flex-end' }}>
              {!isMe && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#C5402C',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 11, fontWeight: 900, flexShrink: 0, marginBottom: 2,
                }}>
                  {initial}
                </div>
              )}
              <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: 2, alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  background:    isMe ? '#C5402C'    : '#FFFFFF',
                  color:         isMe ? 'white'      : '#160E08',
                  borderRadius:  isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding:       '10px 13px',
                  fontSize:      12, lineHeight: 1.5, fontWeight: 400,
                  border:        isMe ? 'none' : '1px solid #DDD7CE',
                  boxShadow:     isMe ? '0 3px 10px rgba(197,64,44,0.10)' : 'none',
                  minWidth:      isStreamingThis && !msg.content ? 48 : 'auto',
                  minHeight:     isStreamingThis && !msg.content ? 20 : 'auto',
                }}>
                  {msg.content ? (
                    <>
                      {msg.content}
                      {isStreamingThis && <span style={{ opacity: 0.5, marginLeft: 2 }}>▊</span>}
                    </>
                  ) : isStreamingThis ? (
                    <span style={{ opacity: 0.4 }}>…</span>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div style={{ display: 'flex', gap: 7, alignItems: 'flex-end' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: '#C5402C',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 11, fontWeight: 900, flexShrink: 0,
            }}>
              {initial}
            </div>
            <div style={{
              background: '#FFFFFF', border: '1px solid #DDD7CE',
              borderRadius: '18px 18px 18px 4px', padding: '12px 16px',
              display: 'flex', gap: 4, alignItems: 'center',
            }}>
              {[0, 1, 2].map(j => (
                <div key={j} style={{
                  width: 6, height: 6, borderRadius: '50%', background: '#C5BCAF',
                  animation: 'bounce 1.2s ease-in-out infinite',
                  animationDelay: `${j * 0.15}s`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Erreur */}
      {error && (
        <div style={{
          margin: '0 14px 8px', padding: '10px 13px', borderRadius: 12,
          background: 'rgba(197,64,44,0.08)', border: '1px solid rgba(197,64,44,0.20)',
          color: '#C5402C', fontSize: 12,
        }}>
          {error}
        </div>
      )}

      {/* Suggestions rapides */}
      <div style={{
        padding: '8px 14px 6px', display: 'flex', gap: 6,
        overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none',
      }}>
        {QUICK_SUGGESTIONS.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSuggestion(q)}
            style={{
              padding: '7px 13px', borderRadius: 99, fontSize: 11, fontWeight: 600,
              flexShrink: 0, cursor: 'pointer', whiteSpace: 'nowrap',
              background: '#FFFFFF', color: '#C5402C',
              border: '1px solid rgba(197,64,44,0.27)',
              transition: 'all 0.15s',
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Zone de saisie */}
      <div style={{
        padding: '8px 14px 12px', borderTop: '1px solid #DDD7CE',
        background: '#FFFFFF', flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          background: '#EDE8E1', borderRadius: 99, padding: '8px 8px 8px 16px',
          border: '1px solid #DDD7CE',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Écris à ${coachName}…`}
            disabled={streaming}
            rows={1}
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              fontSize: 13, color: '#160E08', resize: 'none',
              maxHeight: 100, overflow: 'auto', lineHeight: 1.5,
              fontFamily: 'inherit', padding: 0,
            }}
          />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', background: '#E3DDD5',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <MicIcon />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || streaming}
              style={{
                width: 34, height: 34, borderRadius: '50%', border: 'none',
                background: !input.trim() || streaming ? '#E3DDD5' : '#C5402C',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: !input.trim() || streaming ? 'not-allowed' : 'pointer',
                boxShadow: input.trim() ? '0 3px 10px rgba(197,64,44,0.10)' : 'none',
                transition: 'all 0.15s', flexShrink: 0,
              }}
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}

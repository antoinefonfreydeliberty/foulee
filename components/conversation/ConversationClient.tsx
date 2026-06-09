'use client'

import { useState, useEffect, useRef } from 'react'
import { Avatar } from '@/components/ui/Avatar'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type Props = {
  firstName: string
  coachName: string
  coachStyle: string
  initialHistory: { role: string; content: string; created_at: string }[]
}

const COACH_STYLE_LABEL: Record<string, string> = {
  warm: 'Coach bienveillante',
  direct: 'Coach direct',
  technical: 'Coach analytique',
  playful: 'Coach motivante',
}

export default function ConversationClient({ firstName, coachName, coachStyle, initialHistory }: Props) {
  const [messages, setMessages] = useState<Message[]>(
    initialHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
  )
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
      { role: 'user', content: trimmed },
      { role: 'assistant', content: '' },
    ])
    setStreaming(true)

    try {
      const response = await fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })

      if (!response.ok || !response.body) {
        throw new Error('Erreur réseau')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let streamedText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        streamedText += chunk
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: streamedText }
          return updated
        })
      }
    } catch (err) {
      console.error('[conversation]', err)
      setError("Le coach n'est pas disponible pour le moment. Réessaie.")
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && last.content === '') {
          return prev.slice(0, -1)
        }
        return prev
      })
    } finally {
      setStreaming(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">

      {/* Header coach */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#EEE0D0] bg-[#FDF8F3] sticky top-0 z-10">
        <Avatar initiale={coachName.charAt(0)} variant="coach" size="sm" />
        <div>
          <p className="font-semibold text-[#3D2314] text-sm">{coachName}</p>
          <p className="text-xs text-[#A07860]">{COACH_STYLE_LABEL[coachStyle] ?? 'Coach'}</p>
        </div>
      </div>

      {/* Zone messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-[#A07860] mt-8 px-4">
            <p className="mb-2">Pose-moi une question, {firstName}.</p>
            <p className="text-xs">Entraînement, récupération, nutrition, motivation...</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isStreamingThis = streaming && i === messages.length - 1 && msg.role === 'assistant'
          return (
            <div
              key={i}
              className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {msg.role === 'assistant' && (
                <Avatar initiale={coachName.charAt(0)} variant="coach" size="sm" />
              )}
              <div
                className={`max-w-[78%] px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#F5BDAF] text-[#3D2314] rounded-2xl rounded-tr-sm'
                    : 'bg-[#F5EDE4] text-[#3D2314] rounded-2xl rounded-tl-sm'
                }`}
                style={isStreamingThis && !msg.content ? { minWidth: 48, minHeight: 20 } : {}}
              >
                {msg.content ? (
                  <>
                    {msg.content}
                    {isStreamingThis && <span className="animate-pulse ml-0.5">▊</span>}
                  </>
                ) : isStreamingThis ? (
                  <span className="opacity-40">...</span>
                ) : null}
              </div>
            </div>
          )
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Erreur */}
      {error && (
        <div
          className="mx-4 mb-2 px-4 py-3 rounded-lg text-sm"
          style={{ backgroundColor: '#FFF0EE', border: '0.5px solid #F5BDAF', color: '#D4845A' }}
        >
          {error}
        </div>
      )}

      {/* Zone de saisie */}
      <div className="px-4 py-3 border-t border-[#EEE0D0] bg-white flex gap-2 items-end">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message pour ${coachName}...`}
          disabled={streaming}
          rows={1}
          className="flex-1 border border-[#EEE0D0] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C1532B] resize-none disabled:bg-[#F5F5F5] bg-[#FDF8F3]"
          style={{ maxHeight: 120, overflow: 'auto', lineHeight: 1.5, fontFamily: 'inherit' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || streaming}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-colors disabled:cursor-default"
          style={{
            backgroundColor: !input.trim() || streaming ? '#EEE0D0' : '#C1532B',
            color: !input.trim() || streaming ? '#A07860' : '#FDF8F3',
          }}
        >
          ↑
        </button>
      </div>

    </div>
  )
}

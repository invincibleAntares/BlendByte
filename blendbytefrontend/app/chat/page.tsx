"use client"

import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { KeyboardEvent, useEffect, useMemo, useState } from 'react'
import { IntakeMessage, runAgent1Chat, verifyToken } from '@/lib/api'

type PanelAnimation = 'idle' | 'slideIn' | 'slideOut'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function getLatestAssistantQuestion(messages: IntakeMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'assistant') {
      return messages[i].content
    }
  }
  return ''
}

export default function ChatPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<IntakeMessage[]>([])
  const [input, setInput] = useState('')
  const [isInitializing, setIsInitializing] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const [recipientProfile, setRecipientProfile] = useState<Record<string, unknown> | null>(null)
  const [cardQuestion, setCardQuestion] = useState('')
  const [cardAnswer, setCardAnswer] = useState('')
  const [panelAnimation, setPanelAnimation] = useState<PanelAnimation>('idle')
  const answeredCount = useMemo(
    () => messages.filter((message) => message.role === 'user').length,
    [messages]
  )
  const questionNumber = answeredCount + 1

  const initializeConversation = async () => {
    setError('')
    setIsInitializing(true)
    try {
      const token = await getToken()
      if (!token) {
        router.replace('/')
        return
      }
      await verifyToken(token)
      const initial = await runAgent1Chat(token, [])
      setMessages(initial.messages)
      setIsComplete(initial.is_complete)
      setRecipientProfile(initial.recipient_profile)
      setCardQuestion(initial.next_question || getLatestAssistantQuestion(initial.messages))
      setCardAnswer('')
      setPanelAnimation('slideIn')
      setTimeout(() => setPanelAnimation('idle'), 230)
    } catch {
      setError('Unable to start chat right now. Please retry.')
    } finally {
      setIsInitializing(false)
    }
  }

  useEffect(() => {
    const ensureAuthAndSync = async () => {
      if (!isLoaded) {
        return
      }

      if (!isSignedIn) {
        router.replace('/')
        return
      }
      await initializeConversation()
    }

    ensureAuthAndSync()
  }, [isLoaded, isSignedIn, getToken, router])

  const canSend = useMemo(
    () => input.trim().length > 0 && !isInitializing && !isBusy && !isComplete,
    [input, isInitializing, isBusy, isComplete]
  )

  if (!isLoaded) {
    return null
  }

  if (!isSignedIn) {
    return null
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isBusy || isComplete) {
      return
    }

    setError('')
    const activeQuestion = cardQuestion || getLatestAssistantQuestion(messages)
    const userAnswer = text

    setIsBusy(true)
    setCardAnswer(userAnswer)
    setPanelAnimation('slideOut')

    const nextMessages: IntakeMessage[] = [
      ...messages,
      { role: 'user', content: userAnswer },
    ]

    setMessages(nextMessages)
    setInput('')

    try {
      await sleep(220)
      const token = await getToken()
      if (!token) {
        router.replace('/')
        return
      }

      const response = await runAgent1Chat(token, nextMessages)
      setMessages(response.messages)
      setIsComplete(response.is_complete)
      setRecipientProfile(response.recipient_profile)
      if (!response.is_complete) {
        const nextQuestion =
          response.next_question || getLatestAssistantQuestion(response.messages)
        setCardQuestion(nextQuestion)
        setCardAnswer('')
        setPanelAnimation('slideIn')
        setTimeout(() => setPanelAnimation('idle'), 230)
      }
    } catch (sendError) {
      setCardQuestion(activeQuestion)
      setCardAnswer(userAnswer)
      setPanelAnimation('slideIn')
      setTimeout(() => setPanelAnimation('idle'), 230)
      setError('Unable to continue chat right now. Please try again.')
      console.error(sendError)
    } finally {
      setIsBusy(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="app-shell">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <button
              onClick={() => router.push('/')}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              ← Back to Home
            </button>
          </div>

          <div className="surface-card p-6 md:p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Help me understand your person
            </h1>

            <p className="text-gray-700 mb-6">
              I will ask a few quick, practical questions so recommendations feel personal and useful.
            </p>

            {!isComplete && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>Question {questionNumber}</span>
                  <span>{isBusy ? 'Thinking...' : 'In progress'}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, questionNumber * 10)}%` }}
                  />
                </div>
              </div>
            )}

            {!isComplete && (
              <div className="h-[280px] rounded-2xl border border-gray-200 bg-gray-50 p-5 flex items-center justify-center">
                {isInitializing && !cardQuestion ? (
                  <div className="text-sm text-gray-500">Starting conversation...</div>
                ) : (
                  <div
                    className={`w-full max-w-2xl rounded-2xl px-5 py-5 shadow-sm bg-white border border-gray-200 text-gray-900 ${
                      panelAnimation === 'slideIn'
                        ? 'qa-slide-in-right'
                        : panelAnimation === 'slideOut'
                          ? 'qa-slide-out-left'
                          : ''
                    }`}
                  >
                    <p className="text-lg leading-relaxed font-semibold text-gray-900">
                      {cardQuestion}
                    </p>

                    {cardAnswer && (
                      <div className="mt-5 border-t border-gray-200 pt-4">
                        <p className="text-base leading-relaxed text-purple-700 font-medium">
                          {cardAnswer}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isComplete && recipientProfile && (
              <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-4">
                <p className="text-sm font-semibold text-green-800 mb-2">
                  Intake complete. Recipient profile generated.
                </p>
                <pre className="text-xs text-green-900 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(recipientProfile, null, 2)}
                </pre>
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                <div className="flex items-center justify-between gap-3">
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={initializeConversation}
                    className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {!isComplete && (
              <div className="mt-5 flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isInitializing
                      ? 'Loading...'
                      : 'Type your answer...'
                  }
                  disabled={isInitializing || isBusy}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                />
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className="primary-cta px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isInitializing ? 'Loading...' : isBusy ? 'Sending...' : 'Send'}
                </button>
              </div>
            )}

            {isComplete && (
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => {
                    if (recipientProfile && typeof window !== 'undefined') {
                      sessionStorage.setItem(
                        'blendbyte_recipient_profile',
                        JSON.stringify(recipientProfile)
                      )
                    }
                    router.push('/results')
                  }}
                  className="primary-cta px-5 py-3 text-sm"
                >
                  Continue to Results
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

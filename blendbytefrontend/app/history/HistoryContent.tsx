"use client"

import { useAuth } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { SessionRecord, getSessionById, getSessions, verifyToken } from '@/lib/api'

const formatDateTime = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date'
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const formatPrice = (price: number | null) =>
  price === null || Number.isNaN(price)
    ? 'Price unavailable'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(price)

const normalizeSessionArray = (payload: unknown): SessionRecord[] => {
  if (Array.isArray(payload)) {
    return payload as SessionRecord[]
  }

  if (payload && typeof payload === 'object') {
    const container = payload as { sessions?: unknown; data?: unknown }
    if (Array.isArray(container.sessions)) {
      return container.sessions as SessionRecord[]
    }
    if (Array.isArray(container.data)) {
      return container.data as SessionRecord[]
    }
  }

  return []
}

const normalizeSessionObject = (payload: unknown): SessionRecord | null => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload) && 'id' in payload) {
    return payload as SessionRecord
  }

  if (payload && typeof payload === 'object') {
    const container = payload as { session?: unknown; data?: unknown }
    if (container.session && typeof container.session === 'object') {
      return container.session as SessionRecord
    }
    if (container.data && typeof container.data === 'object') {
      return container.data as SessionRecord
    }
  }

  return null
}

export default function HistoryContent() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedSessionId = searchParams.get('sessionId')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [error, setError] = useState('')
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [selectedSession, setSelectedSession] = useState<SessionRecord | null>(null)

  const hasSessions = sessions.length > 0

  const totalProductsInSelection = useMemo(() => {
    if (!selectedSession) {
      return 0
    }
    return selectedSession.products_returned?.length ?? 0
  }, [selectedSession])

  const fetchHistory = async () => {
    setIsLoading(true)
    setError('')

    try {
      const token = await getToken()
      if (!token) {
        router.replace('/')
        return
      }

      await verifyToken(token)

      const historyPayload = await getSessions(token)
      const normalizedSessions = normalizeSessionArray(historyPayload)
      setSessions(normalizedSessions)

      if (selectedSessionId) {
        setIsLoadingSession(true)
        const sessionPayload = await getSessionById(token, selectedSessionId)
        const normalizedSession = normalizeSessionObject(sessionPayload)
        if (normalizedSession) {
          setSelectedSession(normalizedSession)
        } else {
          setSelectedSession(null)
          setError('Could not load that session. Select another one from the list.')
        }
        setIsLoadingSession(false)
      } else {
        setSelectedSession(null)
      }
    } catch (requestError) {
      console.error(requestError)
      setError('Could not load history right now. Please retry.')
      setSelectedSession(null)
      setSessions([])
    } finally {
      setIsLoading(false)
      setIsLoadingSession(false)
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

      try {
        await fetchHistory()
      } catch {
        router.replace('/')
      }
    }

    void ensureAuthAndSync()
  }, [isLoaded, isSignedIn, selectedSessionId, getToken, router])

  const openSession = (sessionId: string) => {
    router.push(`/history?sessionId=${sessionId}`)
  }

  if (!isLoaded) {
    return null
  }

  if (!isSignedIn) {
    return null
  }

  return (
    <div className="app-shell">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <button
              onClick={() => router.push('/')}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              ← Back to Home
            </button>
          </div>

          <div className="surface-card p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              Past Gift Searches
            </h1>
            <p className="text-gray-700 mb-6">
              Revisit saved sessions, compare recommendations, and reopen products without rerunning the pipeline.
            </p>

            {error && (
              <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-800 mb-3">{error}</p>
                <button
                  type="button"
                  onClick={fetchHistory}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            )}

            {isLoading && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-5 text-gray-900">
                Loading your session history...
              </div>
            )}

            {!isLoading && !error && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-1 rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Saved Sessions</h2>

                  {!hasSessions && (
                    <p className="text-sm text-gray-800">
                      No saved sessions yet. Run a results pipeline to create one.
                    </p>
                  )}

                  {hasSessions && (
                    <div className="space-y-3">
                      {sessions.map((session) => {
                        const isSelected = selectedSessionId === session.id
                        return (
                          <button
                            key={session.id}
                            type="button"
                            onClick={() => openSession(session.id)}
                            className={`w-full rounded-lg border p-3 text-left ${
                              isSelected
                                ? 'border-purple-400 bg-purple-50'
                                : 'border-gray-200 bg-white hover:bg-gray-100'
                            }`}
                          >
                            <p className="text-sm font-semibold text-gray-900">
                              {formatDateTime(session.created_at)}
                            </p>
                            <p className="mt-1 text-xs text-gray-800">
                              Budget: ₹{session.budget_stated ?? 'N/A'} | Products:{' '}
                              {session.products_returned?.length ?? 0}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </section>

                <section className="lg:col-span-2 rounded-lg border border-gray-200 p-4 bg-white">
                  {!selectedSessionId && (
                    <p className="text-sm text-gray-900">
                      Select a session to view stored products and details.
                    </p>
                  )}

                  {selectedSessionId && isLoadingSession && (
                    <p className="text-sm text-gray-900">Loading selected session...</p>
                  )}

                  {selectedSessionId && !isLoadingSession && selectedSession && (
                    <div className="space-y-5">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Session Details</h2>
                        <p className="text-sm text-gray-900 mb-1">
                          Saved on: {formatDateTime(selectedSession.created_at)}
                        </p>
                        <p className="text-sm text-gray-900 mb-1">
                          Budget stated: ₹{selectedSession.budget_stated ?? 'N/A'}
                        </p>
                        <p className="text-sm text-gray-900">
                          Queries used: {selectedSession.search_queries?.length ?? 0}
                        </p>
                      </div>

                      <div>
                        <h3 className="text-base font-semibold text-gray-900 mb-3">
                          Stored Products ({totalProductsInSelection})
                        </h3>
                        {totalProductsInSelection === 0 && (
                          <p className="text-sm text-gray-900">No products stored for this session.</p>
                        )}
                        {totalProductsInSelection > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(selectedSession.products_returned ?? []).map((product) => (
                              <article
                                key={`${selectedSession.id}-${product.asin}`}
                                className="rounded-lg border border-gray-200 bg-white p-4"
                              >
                                <h4 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">
                                  {product.name}
                                </h4>
                                <p className="text-sm font-semibold text-gray-900 mb-1">
                                  {formatPrice(product.price)}
                                </p>
                                <p className="text-xs text-gray-800 mb-2">
                                  Rating: {product.rating ?? 'N/A'} | Reviews:{' '}
                                  {product.review_count ?? 'N/A'}
                                </p>
                                <p className="text-xs text-purple-900 bg-purple-50 border border-purple-200 rounded-md p-2">
                                  {product.personalized_reason || 'No personalized reason stored.'}
                                </p>
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}

            {!isLoading && !error && hasSessions && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => router.push('/results')}
                  className="primary-cta px-4 py-2 text-sm"
                >
                  Start New Search
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

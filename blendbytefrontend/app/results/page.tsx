"use client"

import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Agent2BuildQueriesResponse,
  Agent3ScrapeResponse,
  Agent4RankResponse,
  PersonalizedProduct,
  logAffiliateClick,
  runAgent2BuildQueries,
  runAgent5Personalize,
  runAgent4Rank,
  runAgent3Scrape,
  saveSession,
  verifyToken,
} from '@/lib/api'

type PipelineStep =
  | 'understanding'
  | 'building'
  | 'scraping'
  | 'ranking'
  | 'personalizing'
  | 'saving'

type StepStatus = 'pending' | 'active' | 'done' | 'error'

const STEP_LABELS: Record<PipelineStep, string> = {
  understanding: 'Understanding profile',
  building: 'Building queries',
  scraping: 'Scraping products',
  ranking: 'Ranking matches',
  personalizing: 'Personalizing picks',
  saving: 'Saving session',
}

const PIPELINE_ORDER: PipelineStep[] = [
  'understanding',
  'building',
  'scraping',
  'ranking',
  'personalizing',
  'saving',
]

const PRODUCTS_PER_PAGE = 5

const formatPrice = (price: number | null) =>
  price === null || Number.isNaN(price)
    ? 'Price unavailable'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(price)

const formatCount = (value: number | null) => {
  if (value === null || Number.isNaN(value)) {
    return 'N/A'
  }

  return new Intl.NumberFormat('en-IN').format(value)
}

const createInitialStepStatus = (): Record<PipelineStep, StepStatus> => ({
  understanding: 'pending',
  building: 'pending',
  scraping: 'pending',
  ranking: 'pending',
  personalizing: 'pending',
  saving: 'pending',
})

export default function ResultsPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const router = useRouter()
  const clickLoggedAtRef = useRef<Record<string, number>>({})
  const [isRunningPipeline, setIsRunningPipeline] = useState(true)
  const [stepStatus, setStepStatus] = useState<Record<PipelineStep, StepStatus>>(
    createInitialStepStatus()
  )
  const [pipelineError, setPipelineError] = useState<{
    step: PipelineStep
    message: string
  } | null>(null)
  const [recipientProfile, setRecipientProfile] = useState<Record<string, unknown> | null>(null)
  const [result, setResult] = useState<Agent2BuildQueriesResponse | null>(null)
  const [scrapeResult, setScrapeResult] = useState<Agent3ScrapeResponse | null>(null)
  const [rankResult, setRankResult] = useState<Agent4RankResponse | null>(null)
  const [finalProducts, setFinalProducts] = useState<PersonalizedProduct[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasExpandedBudgetRun, setHasExpandedBudgetRun] = useState(false)
  const [hasDismissedBudgetNudge, setHasDismissedBudgetNudge] = useState(false)

  const setSingleStepStatus = (step: PipelineStep, status: StepStatus) => {
    setStepStatus((previous) => ({
      ...previous,
      [step]: status,
    }))
  }

  const runStep = async <T,>(
    step: PipelineStep,
    task: () => Promise<T>,
    errorMessage: string
  ): Promise<T | null> => {
    setSingleStepStatus(step, 'active')
    try {
      const value = await task()
      setSingleStepStatus(step, 'done')
      return value
    } catch (error) {
      console.error(error)
      setSingleStepStatus(step, 'error')
      setPipelineError({
        step,
        message: errorMessage,
      })
      return null
    }
  }

  const getStoredRecipientProfile = (): Record<string, unknown> => {
    const rawProfile =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('blendbyte_recipient_profile')
        : null

    if (!rawProfile) {
      throw new Error('Recipient profile missing. Please complete intake again.')
    }

    let parsedProfile: unknown
    try {
      parsedProfile = JSON.parse(rawProfile)
    } catch {
      throw new Error('Could not read recipient profile. Please complete intake again.')
    }

    if (!parsedProfile || Array.isArray(parsedProfile) || typeof parsedProfile !== 'object') {
      throw new Error('Recipient profile is invalid. Please complete intake again.')
    }

    return parsedProfile as Record<string, unknown>
  }

  const runPipeline = async (options?: { forceExpandBudget?: boolean }) => {
    const forceExpandBudget = options?.forceExpandBudget ?? false
    if (forceExpandBudget) {
      setHasExpandedBudgetRun(true)
      setHasDismissedBudgetNudge(true)
    }

    setIsRunningPipeline(true)
    setPipelineError(null)
    setResult(null)
    setScrapeResult(null)
    setRankResult(null)
    setFinalProducts([])
    setSessionId(null)
    setCurrentPage(1)
    setStepStatus(createInitialStepStatus())

    const authState = await runStep(
      'understanding',
      async () => {
        const nextToken = await getToken()
        if (!nextToken) {
          router.replace('/')
          throw new Error('Not signed in')
        }
        await verifyToken(nextToken)
        const profile = getStoredRecipientProfile()
        setRecipientProfile(profile)
        return {
          token: nextToken,
          profile,
        }
      },
      'We could not understand the recipient profile. Go back to intake and try again.'
    )

    if (!authState) {
      setIsRunningPipeline(false)
      return
    }

    const { token, profile } = authState

    const queryPlan = await runStep(
      'building',
      async () => runAgent2BuildQueries(token, profile, { forceExpandBudget: options?.forceExpandBudget }),
      'Failed while building search queries. Please retry.'
    )
    if (!queryPlan) {
      setIsRunningPipeline(false)
      return
    }
    setResult(queryPlan)

    const scraped = await runStep(
      'scraping',
      async () => runAgent3Scrape(token, queryPlan.queries, queryPlan.budget_searched),
      'Scraping is having trouble right now. Please retry.'
    )
    if (!scraped) {
      setIsRunningPipeline(false)
      return
    }
    setScrapeResult(scraped)

    const ranked = await runStep(
      'ranking',
      async () => runAgent4Rank(token, scraped.products, queryPlan.budget_searched),
      'Ranking failed right now. Please retry.'
    )
    if (!ranked) {
      setIsRunningPipeline(false)
      return
    }
    setRankResult(ranked)

    const personalized = await runStep(
      'personalizing',
      async () => runAgent5Personalize(token, ranked.ranked_products, profile),
      'Personalization failed right now. Please retry.'
    )
    if (!personalized) {
      setIsRunningPipeline(false)
      return
    }
    const personalizedResponse = personalized as {
      personalized_products?: PersonalizedProduct[]
      products?: PersonalizedProduct[]
    }
    const personalizedProducts = Array.isArray(personalizedResponse.personalized_products)
      ? personalizedResponse.personalized_products
      : Array.isArray(personalizedResponse.products)
        ? personalizedResponse.products
        : []
    setFinalProducts(personalizedProducts)

    const savedSession = await runStep(
      'saving',
      async () =>
        saveSession(token, {
          recipient_profile: profile,
          search_queries: queryPlan.queries,
          products_returned: personalizedProducts,
          budget_stated: queryPlan.budget_stated,
          budget_searched: queryPlan.budget_searched,
        }),
      'Recommendations are ready, but we could not save this session. Retry saving.'
    )
    if (!savedSession) {
      setIsRunningPipeline(false)
      return
    }
    setSessionId(savedSession.id || null)
    setIsRunningPipeline(false)
  }

  const handleRetrySave = async () => {
    if (!result || !recipientProfile || finalProducts.length === 0) {
      await runPipeline({ forceExpandBudget: hasExpandedBudgetRun })
      return
    }

    setPipelineError(null)
    setSingleStepStatus('saving', 'active')

    try {
      const token = await getToken()
      if (!token) {
        router.replace('/')
        return
      }

      const savedSession = await saveSession(token, {
        recipient_profile: recipientProfile,
        search_queries: result.queries,
        products_returned: finalProducts,
        budget_stated: result.budget_stated,
        budget_searched: result.budget_searched,
      })

      setSessionId(savedSession.id || null)
      setSingleStepStatus('saving', 'done')
    } catch (error) {
      console.error(error)
      setSingleStepStatus('saving', 'error')
      setPipelineError({
        step: 'saving',
        message: 'Recommendations are ready, but we could not save this session. Retry saving.',
      })
    }
  }

  const countWithinStatedBudget = useMemo(() => {
    if (!result) {
      return 0
    }
    return finalProducts.filter(
      (product) => product.price !== null && product.price <= result.budget_stated
    ).length
  }, [finalProducts, result])

  const showBudgetNudge =
    !!result &&
    result.budget_strategy === 'strict' &&
    !hasExpandedBudgetRun &&
    !hasDismissedBudgetNudge &&
    finalProducts.length > 0 &&
    countWithinStatedBudget < 8

  const expandedBudgetCap = result ? Math.round(result.budget_stated * 1.3) : null

  const totalPages = Math.max(1, Math.ceil(finalProducts.length / PRODUCTS_PER_PAGE))

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PRODUCTS_PER_PAGE
    return finalProducts.slice(start, start + PRODUCTS_PER_PAGE)
  }, [currentPage, finalProducts])

  const handleOpenProduct = (product: PersonalizedProduct) => {
    window.open(product.affiliate_url, '_blank', 'noopener,noreferrer')

    const now = Date.now()
    const lastLogged = clickLoggedAtRef.current[product.asin]
    if (lastLogged && now - lastLogged < 5000) {
      return
    }
    clickLoggedAtRef.current[product.asin] = now

    void (async () => {
      try {
        const token = await getToken()
        if (!token) {
          return
        }
        await logAffiliateClick(token, {
          product_asin: product.asin,
          session_id: sessionId,
        })
      } catch {
        // Fire-and-forget by design. Navigation must not wait for click logging.
      }
    })()
  }

  const runExpandedBudget = async () => {
    setHasExpandedBudgetRun(true)
    setHasDismissedBudgetNudge(true)
    await runPipeline({ forceExpandBudget: true })
  }

  const handleRetry = async () => {
    if (pipelineError?.step === 'saving') {
      await handleRetrySave()
      return
    }
    await runPipeline({ forceExpandBudget: hasExpandedBudgetRun })
  }

  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (!isSignedIn) {
      router.replace('/')
      return
    }

    void runPipeline()
  }, [isLoaded, isSignedIn, getToken, router])

  const handleBackToIntake = () => {
    router.push('/chat')
  }

  const handleGoToHistory = () => {
    if (sessionId) {
      router.push(`/history?sessionId=${sessionId}`)
      return
    }
    router.push('/history')
  }

  const isProfileError =
    pipelineError?.step === 'understanding' &&
    pipelineError.message.toLowerCase().includes('intake')

  const renderStepStatus = (status: StepStatus) => {
    if (status === 'done') {
      return 'Done'
    }
    if (status === 'active') {
      return 'Running'
    }
    if (status === 'error') {
      return 'Failed'
    }
    return 'Pending'
  }

  if (!isLoaded || !isSignedIn) {
    return null
  }

  return (
    <div className="app-shell">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <button
              onClick={() => router.push('/')}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              ← Back to Home
            </button>
          </div>

          <div className="surface-card p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Personalized Gift Results
            </h1>
            <p className="text-gray-700 mb-8">
              Your gift plan is generated step-by-step and tuned for quality before you view products.
            </p>

            <div className="rounded-lg border border-gray-200 p-5 mb-6 bg-gray-50">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Pipeline Progress</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PIPELINE_ORDER.map((step) => {
                  const status = stepStatus[step]
                  const statusClasses =
                    status === 'done'
                      ? 'border-green-200 bg-green-50 text-green-800'
                      : status === 'active'
                        ? 'border-purple-200 bg-purple-50 text-purple-800'
                        : status === 'error'
                          ? 'border-red-200 bg-red-50 text-red-800'
                          : 'border-gray-200 bg-white text-gray-700'

                  return (
                    <div
                      key={step}
                      className={`rounded-md border px-3 py-2 text-sm font-medium ${statusClasses}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{STEP_LABELS[step]}</span>
                        <span className="text-xs">{renderStepStatus(status)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {pipelineError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-5 mb-6">
                <p className="text-red-800 text-sm mb-4">{pipelineError.message}</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="primary-cta px-4 py-2 text-sm"
                  >
                    Retry
                  </button>
                  {isProfileError && (
                    <button
                      type="button"
                      onClick={handleBackToIntake}
                      className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
                    >
                      Back to Intake
                    </button>
                  )}
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-7">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                    <p className="text-xs uppercase tracking-wide text-gray-700 mb-1">Budget Stated</p>
                    <p className="text-xl font-bold text-gray-900">₹{result.budget_stated}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                    <p className="text-xs uppercase tracking-wide text-gray-700 mb-1">Budget Searched</p>
                    <p className="text-xl font-bold text-gray-900">₹{result.budget_searched}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                    <p className="text-xs uppercase tracking-wide text-gray-700 mb-1">Strategy</p>
                    <p className="text-sm font-semibold text-purple-800">
                      {result.budget_strategy === 'strict' ? 'Strict Budget' : 'Expanded +30%'}
                    </p>
                    <p className="text-xs text-gray-700 mt-1">
                      Category: {result.category_specificity}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-5 bg-white">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Generated Queries</h2>
                  <ol className="space-y-2 list-decimal pl-5">
                    {result.queries.map((query) => (
                      <li key={query} className="text-gray-900">
                        {query}
                      </li>
                    ))}
                  </ol>
                </div>

                {scrapeResult && (
                  <div className="rounded-lg border border-gray-200 p-5 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">Scrape Summary</h2>
                    <div className="text-sm text-gray-900">
                      Total scraped products: <span className="font-semibold">{scrapeResult.total_products}</span>
                    </div>
                    {scrapeResult.warning_message && (
                      <div className="rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-900 mt-3">
                        {scrapeResult.warning_message}
                      </div>
                    )}
                  </div>
                )}

                {rankResult && (
                  <div className="rounded-lg border border-gray-200 p-5 bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Ranking Summary</h2>
                    <div className="text-sm text-gray-900">
                      Total ranked products: <span className="font-semibold">{rankResult.total_ranked}</span>
                    </div>
                  </div>
                )}

                {showBudgetNudge && expandedBudgetCap && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-5">
                    <h2 className="text-lg font-semibold text-amber-900 mb-2">Need more in-budget options?</h2>
                    <p className="text-sm text-amber-900 mb-4">
                      Only {countWithinStatedBudget} products are within your stated budget. Want us to expand
                      search up to ₹{expandedBudgetCap} and rerun ranking + personalization?
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={runExpandedBudget}
                        disabled={isRunningPipeline}
                        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-amber-400"
                      >
                        Yes, expand budget
                      </button>
                      <button
                        type="button"
                        onClick={() => setHasDismissedBudgetNudge(true)}
                        className="rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
                      >
                        Keep current budget
                      </button>
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-gray-200 p-5 bg-white">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Final Products</h2>
                    <span className="text-sm text-gray-800">
                      {finalProducts.length > 0
                        ? `Showing ${Math.min(
                            (currentPage - 1) * PRODUCTS_PER_PAGE + 1,
                            finalProducts.length
                          )}-${Math.min(currentPage * PRODUCTS_PER_PAGE, finalProducts.length)} of ${
                            finalProducts.length
                          }`
                        : 'No products yet'}
                    </span>
                  </div>

                  {isRunningPipeline && finalProducts.length === 0 && (
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
                      Running recommendation pipeline...
                    </div>
                  )}

                  {!isRunningPipeline && finalProducts.length === 0 && !pipelineError && (
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
                      No personalized products were returned. Retry the pipeline to fetch fresh results.
                    </div>
                  )}

                  {paginatedProducts.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {paginatedProducts.map((product) => (
                        <article
                          key={product.asin}
                          className="rounded-lg border border-gray-200 bg-white p-4 flex flex-col"
                        >
                          <div className="mb-3 h-44 w-full overflow-hidden rounded-md bg-gray-100 flex items-center justify-center">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-sm text-gray-700">No image available</span>
                            )}
                          </div>

                          <h3 className="text-base font-semibold text-gray-900 line-clamp-2 mb-2">
                            {product.name}
                          </h3>

                          <p className="text-sm font-semibold text-gray-900 mb-1">{formatPrice(product.price)}</p>
                          <p className="text-sm text-gray-800 mb-3">
                            Rating: {product.rating ?? 'N/A'} | Reviews: {formatCount(product.review_count)}
                          </p>

                          <div className="rounded-md bg-purple-50 border border-purple-200 p-3 mb-4">
                            <p className="text-xs uppercase tracking-wide text-purple-900 font-semibold mb-1">
                              Why this fits
                            </p>
                            <p className="text-sm text-purple-900">
                              {product.personalized_reason || 'Personalized reasoning was not provided.'}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenProduct(product)}
                            className="mt-auto primary-cta px-4 py-2 text-sm"
                          >
                            View on Amazon
                          </button>
                        </article>
                      ))}
                    </div>
                  )}

                  {finalProducts.length > PRODUCTS_PER_PAGE && (
                    <div className="mt-6 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
                        disabled={currentPage === 1}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                      >
                        Previous
                      </button>

                      <p className="text-sm text-gray-900">
                        Page {currentPage} of {totalPages}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((previous) => Math.min(totalPages, previous + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleGoToHistory}
                    className="secondary-cta px-4 py-2 text-sm"
                  >
                    Open Session History
                  </button>
                  {!sessionId && stepStatus.saving !== 'done' && (
                    <button
                      type="button"
                      onClick={handleRetrySave}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
                    >
                      Retry Save Session
                    </button>
                  )}
                </div>

                {!isRunningPipeline && sessionId && (
                  <p className="text-sm text-green-800">
                    Session saved successfully. You can revisit this from History anytime.
                  </p>
                )}

                {pipelineError?.step === 'saving' && (
                  <p className="text-sm text-amber-800">
                    Products are ready, but saving failed. You can still browse now and retry save anytime.
                  </p>
                )}
              </div>
            )}

            {isRunningPipeline && !result && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-gray-900 mt-6">
                Building your recommendations...
              </div>
            )}

            {isRunningPipeline && result && (
              <div className="text-sm text-gray-700 mt-4">
                Pipeline running. This may take a minute based on scraping and personalization latency.
              </div>
            )}

            {!isRunningPipeline && !result && !pipelineError && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-gray-900 mt-6">
                No results were generated yet. Retry the pipeline.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

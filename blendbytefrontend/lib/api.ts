/**
 * API Client for BlendByte Backend
 * Handles all communication with FastAPI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  token?: string
  body?: unknown
}

async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', token, body } = options
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  if (!response.ok) {
    let details = ''
    try {
      const errorBody = await response.json()
      details = errorBody?.detail ? ` - ${errorBody.detail}` : ''
    } catch {
      // ignore non-JSON error bodies
    }

    if (response.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/'
    }

    throw new Error(`API request failed (${response.status})${details}`)
  }

  return (await response.json()) as T
}

/**
 * API functions
 */

export interface User {
  id: string
  clerk_user_id: string
  email: string
  name: string
  last_login: string
  total_searches: number
  created_at: string
}

export interface VerifyTokenResponse {
  success: boolean
  message: string
  user: User | null
}

export type IntakeMessage = {
  role: 'user' | 'assistant'
  content: string
}

export interface Agent1ChatResponse {
  is_complete: boolean
  next_question: string | null
  recipient_profile: Record<string, unknown> | null
  messages: IntakeMessage[]
}

export interface Agent2BuildQueriesResponse {
  queries: string[]
  budget_stated: number
  budget_searched: number
  budget_strategy: 'strict' | 'expanded_30_percent'
  category_specificity: 'specific' | 'broad' | 'unknown'
}

export interface ScrapedProduct {
  asin: string
  name: string
  price: number | null
  rating: number | null
  review_count: number | null
  image_url: string | null
  affiliate_url: string
  source_query: string
}

export interface Agent3ScrapeResponse {
  products: ScrapedProduct[]
  total_products: number
  warning_message: string | null
}

export interface RankedProduct extends ScrapedProduct {
  final_score: number
  rating_score: number
  review_score: number
  price_fit_score: number
}

export interface Agent4RankResponse {
  ranked_products: RankedProduct[]
  total_ranked: number
}

export interface PersonalizedProduct extends RankedProduct {
  personalized_reason: string
}

export interface Agent5PersonalizeResponse {
  products: PersonalizedProduct[]
  total_personalized: number
}

export interface SessionRecord {
  id: string
  recipient_profile: Record<string, unknown> | null
  search_queries: string[]
  products_returned: PersonalizedProduct[]
  budget_stated: number | null
  budget_searched: number | null
  created_at: string
}

export interface SaveSessionRequest {
  recipient_profile: Record<string, unknown>
  search_queries: string[]
  products_returned: PersonalizedProduct[]
  budget_stated: number
  budget_searched: number
}

/**
 * Verify Clerk token and sync user with backend
 */
export async function verifyToken(token: string): Promise<VerifyTokenResponse> {
  return apiRequest<VerifyTokenResponse>('/api/v1/auth/verify', {
    method: 'POST',
    token,
    body: {},
  })
}

/**
 * Get current user information
 */
export async function getCurrentUser(token: string): Promise<User> {
  return apiRequest<User>('/api/v1/auth/me', {
    method: 'GET',
    token,
  })
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ status: string }> {
  return apiRequest<{ status: string }>('/health')
}

/**
 * Agent 1 conversational intake
 */
export async function runAgent1Chat(
  token: string,
  messages: IntakeMessage[]
): Promise<Agent1ChatResponse> {
  return apiRequest<Agent1ChatResponse>('/api/v1/agent1/chat', {
    method: 'POST',
    token,
    body: { messages },
  })
}

/**
 * Agent 2 prompt builder
 */
export async function runAgent2BuildQueries(
  token: string,
  recipientProfile: Record<string, unknown>,
  options?: { forceExpandBudget?: boolean }
): Promise<Agent2BuildQueriesResponse> {
  return apiRequest<Agent2BuildQueriesResponse>('/api/v1/agent2/build-queries', {
    method: 'POST',
    token,
    body: {
      recipient_profile: recipientProfile,
      force_expand_budget: options?.forceExpandBudget ?? false,
    },
  })
}

/**
 * Agent 3 scraper
 */
export async function runAgent3Scrape(
  token: string,
  queries: string[],
  budgetSearched: number
): Promise<Agent3ScrapeResponse> {
  return apiRequest<Agent3ScrapeResponse>('/api/v1/agent3/scrape', {
    method: 'POST',
    token,
    body: {
      queries,
      budget_searched: budgetSearched,
    },
  })
}

/**
 * Agent 4 ranker
 */
export async function runAgent4Rank(
  token: string,
  products: ScrapedProduct[],
  budgetSearched: number
): Promise<Agent4RankResponse> {
  return apiRequest<Agent4RankResponse>('/api/v1/agent4/rank', {
    method: 'POST',
    token,
    body: {
      products,
      budget_searched: budgetSearched,
    },
  })
}

/**
 * Agent 5 personalizer
 */
export async function runAgent5Personalize(
  token: string,
  rankedProducts: RankedProduct[],
  recipientProfile: Record<string, unknown>
): Promise<Agent5PersonalizeResponse> {
  return apiRequest<Agent5PersonalizeResponse>('/api/v1/agent5/personalize', {
    method: 'POST',
    token,
    body: {
      ranked_products: rankedProducts,
      recipient_profile: recipientProfile,
    },
  })
}

/**
 * Click log endpoint (fire-and-forget on frontend)
 */
export async function logAffiliateClick(
  token: string,
  payload: { product_asin: string; session_id?: string | null }
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>('/api/v1/clicks/log', {
    method: 'POST',
    token,
    body: payload,
  })
}

/**
 * Session history endpoints
 */
export async function saveSession(
  token: string,
  payload: SaveSessionRequest
): Promise<SessionRecord> {
  return apiRequest<SessionRecord>('/api/v1/sessions', {
    method: 'POST',
    token,
    body: payload,
  })
}

export async function getSessions(token: string): Promise<SessionRecord[]> {
  return apiRequest<SessionRecord[]>('/api/v1/sessions', {
    method: 'GET',
    token,
  })
}

export async function getSessionById(token: string, id: string): Promise<SessionRecord> {
  return apiRequest<SessionRecord>(`/api/v1/sessions/${id}`, {
    method: 'GET',
    token,
  })
}

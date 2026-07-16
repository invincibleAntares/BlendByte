"use client"

import { useAuth, SignInButton } from '@clerk/nextjs'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import UserMenu from '@/components/UserMenu'
import { verifyToken } from '@/lib/api'

const FEATURES = [
  { title: 'Guided intake', description: 'A short, smart conversation that learns who you are gifting.' },
  { title: 'Budget aware', description: 'Recommendations respect your range, not random expensive picks.' },
  { title: 'Quality ranked', description: 'Scored by rating, reviews, and price fit before you see them.' },
  { title: 'Personalized', description: 'Every pick comes with a clear, one-line reason it fits.' },
  { title: 'Saved sessions', description: 'Revisit past searches without running everything again.' },
  { title: 'Fast results', description: 'Go from idea to a shortlist in about a minute.' },
]

const STEPS = [
  { no: '01', title: 'Tell us about them', description: 'Share the person, occasion, and budget.' },
  { no: '02', title: 'We find the matches', description: 'We search, rank, and shortlist real options.' },
  { no: '03', title: 'Pick with confidence', description: 'Choose from clear, personalized picks.' },
]

const TESTIMONIALS = [
  { quote: 'Found a gift for my sister in minutes.', name: 'Ritika S.', role: 'Designer' },
  { quote: 'The reasons made deciding so easy.', name: 'Arjun K.', role: 'Engineer' },
  { quote: 'Loved that it respected my budget.', name: 'Neha M.', role: 'Marketer' },
  { quote: 'Session history is genuinely useful.', name: 'Vivek P.', role: 'Founder' },
  { quote: 'Clean, fast, and actually thoughtful.', name: 'Sara J.', role: 'Consultant' },
]

const PREVIEW_ITEMS = [
  {
    label: 'Wireless earbuds',
    price: 'INR 2,499',
    rating: '4.6',
    image:
      'https://images.pexels.com/photos/3825517/pexels-photo-3825517.jpeg?auto=compress&cs=tinysrgb&w=600&h=450&fit=crop',
    alt: 'Wireless earbuds on a clean background',
  },
  {
    label: 'Scented candle set',
    price: 'INR 899',
    rating: '4.8',
    image:
      'https://images.unsplash.com/photo-1570823635306-250abb06d4b3?w=600&auto=format&fit=crop&q=80',
    alt: 'Scented candles glowing as a gift set',
  },
  {
    label: 'Leather journal',
    price: 'INR 1,299',
    rating: '4.5',
    image:
      'https://images.unsplash.com/photo-1639371040157-55b642d03f4f?w=600&auto=format&fit=crop&q=80',
    alt: 'Leather-bound journal on a wooden table',
  },
]

function StarRatingIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}

function FeatureSparkleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M12 2l1.8 5.5H19l-4.6 3.3 1.8 5.5L12 15l-4.2 3.3 1.8-5.5L5 7.5h5.2L12 2z" />
    </svg>
  )
}

const GIFT_SEARCH_TOPICS = [
  {
    icon: 'M',
    title: 'Gifts for mother',
    description: 'Thoughtful picks by budget and occasion',
  },
  {
    icon: 'D',
    title: 'Gifts for father',
    description: 'Practical and premium ideas that feel personal',
  },
  {
    icon: 'G',
    title: 'Gifts for girlfriend',
    description: 'Romantic, unique, and memorable options',
  },
  {
    icon: 'B',
    title: 'Gifts for boyfriend',
    description: 'Useful gifts he will actually use',
  },
  {
    icon: 'H',
    title: 'Anniversary gifts',
    description: 'Meaningful choices for special milestones',
  },
  {
    icon: 'W',
    title: 'Birthday gifts for her',
    description: 'Personalized shortlists in minutes',
  },
  {
    icon: 'Hi',
    title: 'Birthday gifts for him',
    description: 'Ranked by rating, reviews, and price fit',
  },
  {
    icon: 'L',
    title: 'Last-minute gifts',
    description: 'Fast ideas when you are short on time',
  },
]

export default function Home() {
  const { isSignedIn, getToken } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const syncUserWithBackend = async () => {
      if (isSignedIn) {
        try {
          const token = await getToken()
          if (token) {
            await verifyToken(token)
          }
        } catch (error) {
          console.error('Failed to sync user with backend:', error)
        }
      }
    }

    syncUserWithBackend()
  }, [isSignedIn, getToken])

  const goChat = () => router.push('/chat')
  const goHistory = () => router.push('/history')

  return (
    <div className="app-shell landing-with-fixed-nav">
      <header className="landing-nav w-full">
        <div className="landing-nav-inner mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-8">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="flex items-center gap-2.5 rounded-lg py-1 pr-2 transition-opacity hover:opacity-90"
            aria-label="BlendByte home"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-sm font-bold text-white shadow-md">
              B
            </div>
            <span className="text-lg font-extrabold text-gray-900">BlendByte</span>
          </button>

          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <UserMenu />
            ) : (
              <SignInButton mode="modal" forceRedirectUrl="/chat">
                <button className="primary-cta px-5 py-2 text-sm">Get Started</button>
              </SignInButton>
            )}
          </div>
        </div>
      </header>

      <section className="landing-section relative overflow-hidden">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-purple-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-5 pt-10 pb-8 text-center lg:pt-16">
          <p className="inline-flex items-center rounded-full border border-purple-200/80 bg-purple-50/80 px-4 py-1 text-xs font-semibold tracking-wide text-purple-800">
            AI gift recommendations
          </p>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] text-gray-900 md:text-6xl">
            Gift ideas for mom, dad,
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              girlfriend and everyone else
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-gray-600 md:text-lg">
            BlendByte finds personalized gift recommendations by recipient, occasion, and budget in minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {isSignedIn ? (
              <>
                <button onClick={goChat} className="primary-cta px-7 py-3.5 text-base">
                  Start New Search
                </button>
                <button onClick={goHistory} className="secondary-cta px-7 py-3.5 text-base">
                  Past Gifts
                </button>
              </>
            ) : (
              <SignInButton mode="modal" forceRedirectUrl="/chat">
                <button className="primary-cta px-7 py-3.5 text-base">Get Started</button>
              </SignInButton>
            )}
          </div>
        </div>

        <div className="relative mx-auto max-w-4xl px-5 pb-4 lg:px-8">
          <div className="preview-card p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Your shortlist</p>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                3 picks ready
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PREVIEW_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="preview-product-card group"
                >
                  <div className="preview-product-image-wrap">
                    <Image
                      src={item.image}
                      alt={item.alt}
                      width={320}
                      height={220}
                      className="preview-product-image"
                      sizes="(max-width: 640px) 100vw, 220px"
                    />
                  </div>
                  <p className="mt-3 truncate text-sm font-semibold text-gray-900">{item.label}</p>
                  <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                    <span>{item.price}</span>
                    <span className="flex items-center gap-1 font-medium text-amber-700">
                      <StarRatingIcon />
                      {item.rating}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hero-fade" aria-hidden="true" />
      </section>

      <section className="landing-section-alt landing-section mx-auto max-w-6xl px-5 py-14 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Start in minutes</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-gray-600">
            Three simple steps to a confident gift decision.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          {STEPS.map((step) => (
            <article
              key={step.no}
              className="group rounded-2xl border border-gray-200/80 bg-white/80 p-6 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-purple-200 hover:shadow-lg"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-sm font-bold text-white">
                {step.no}
              </div>
              <p className="text-lg font-semibold text-gray-900">{step.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section mx-auto max-w-6xl px-5 py-14 lg:px-8" aria-labelledby="gift-search-heading">
        <div className="gift-search-panel">
          <div className="text-center">
            <p className="gift-search-eyebrow">Find gifts by person</p>
            <h2 id="gift-search-heading" className="text-3xl font-bold text-gray-900">
              Popular gift searches
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
              Whether you are shopping for mom, dad, your partner, or a last-minute birthday, BlendByte
              turns gift intent into a ranked shortlist.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {GIFT_SEARCH_TOPICS.map((topic) => {
              const cardBody = (
                <>
                  <span className="gift-search-icon" aria-hidden="true">
                    {topic.icon}
                  </span>
                  <span className="mt-4 block text-base font-semibold text-gray-900 group-hover:text-purple-700">
                    {topic.title}
                  </span>
                  <span className="mt-1.5 block text-xs leading-relaxed text-gray-600">
                    {topic.description}
                  </span>
                </>
              )

              if (isSignedIn) {
                return (
                  <button
                    key={topic.title}
                    type="button"
                    onClick={goChat}
                    className="gift-search-card group text-left"
                  >
                    {cardBody}
                  </button>
                )
              }

              return (
                <SignInButton key={topic.title} mode="modal" forceRedirectUrl="/chat">
                  <button type="button" className="gift-search-card group w-full text-left">
                    {cardBody}
                  </button>
                </SignInButton>
              )
            })}
          </div>

          <p className="mt-8 text-center text-xs text-gray-500">
            Tap any topic to start your personalized gift search.
          </p>
        </div>
      </section>

      <section className="landing-section mx-auto max-w-6xl px-5 py-14 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Why choose BlendByte</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-gray-600">
            Thoughtful recommendations, tailored to the person you care about.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="group rounded-2xl border border-gray-200/80 bg-white/70 p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-purple-200 hover:shadow-md"
            >
              <div className="feature-icon mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-colors group-hover:bg-purple-600 group-hover:text-white">
                <FeatureSparkleIcon />
              </div>
              <p className="text-base font-semibold text-gray-900">{feature.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section-alt landing-section mx-auto max-w-6xl px-5 py-14 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">What our users say</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-gray-600">
            Real feedback from people who gifted with BlendByte.
          </p>
        </div>

        <div className="testimonial-marquee mt-10">
          <div className="testimonial-track">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((item, idx) => (
              <article
                key={`${item.name}-${idx}`}
                className="testimonial-card rounded-2xl border border-gray-200/80 bg-white/90 p-5 backdrop-blur-sm"
              >
                <p className="text-sm leading-relaxed text-gray-800">&ldquo;{item.quote}&rdquo;</p>
                <div className="mt-4">
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.role}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section mx-auto max-w-6xl px-5 pb-20 pt-4 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center text-white md:p-12">
          <h3 className="text-2xl font-bold md:text-3xl">Ready to find the perfect gift?</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/85">
            Start a guided search and get personalized picks now.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {isSignedIn ? (
              <>
                <button
                  onClick={goChat}
                  className="rounded-xl bg-white px-7 py-3.5 text-base font-bold text-purple-700 transition-transform hover:-translate-y-0.5"
                >
                  Start New Search
                </button>
                <button
                  onClick={goHistory}
                  className="rounded-xl border border-white/40 px-7 py-3.5 text-base font-bold text-white transition-colors hover:bg-white/10"
                >
                  Past Gifts
                </button>
              </>
            ) : (
              <SignInButton mode="modal" forceRedirectUrl="/chat">
                <button className="rounded-xl bg-white px-7 py-3.5 text-base font-bold text-purple-700 transition-transform hover:-translate-y-0.5">
                  Get Started
                </button>
              </SignInButton>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-sm text-gray-500 md:flex-row lg:px-8">
          <span>(c) {new Date().getFullYear()} BlendByte</span>
          <span>Thoughtful gifting, powered by AI.</span>
        </div>
      </footer>
    </div>
  )
}

import { Suspense } from 'react'
import HistoryContent from './HistoryContent'

function HistoryLoading() {
  return (
    <div className="app-shell">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto rounded-lg border border-gray-200 bg-gray-50 p-5 text-gray-900">
          Loading your session history...
        </div>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<HistoryLoading />}>
      <HistoryContent />
    </Suspense>
  )
}

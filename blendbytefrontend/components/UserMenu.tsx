"use client"

import { SignOutButton, useUser } from '@clerk/nextjs'
import { useEffect, useMemo, useRef, useState } from 'react'

function getInitials(fullName: string, email: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }
  if (parts.length === 1 && parts[0].length > 0) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (email) {
    return email.slice(0, 2).toUpperCase()
  }
  return 'U'
}

export default function UserMenu() {
  const { user, isLoaded } = useUser()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses[0]?.emailAddress || ''
  const displayName =
    user?.fullName?.trim() ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() ||
    'Account'

  const initials = useMemo(
    () => getInitials(displayName === 'Account' ? '' : displayName, email),
    [displayName, email]
  )

  const avatarUrl = user?.imageUrl

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  if (!isLoaded || !user) {
    return (
      <div
        className="h-10 w-10 rounded-full border border-gray-200 bg-gray-100 animate-pulse"
        aria-hidden="true"
      />
    )
  }

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Open account menu"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          <span className="user-menu-initials">{initials}</span>
        )}
      </button>

      {isOpen && (
        <div className="user-menu-dropdown" role="menu">
          <div className="user-menu-dropdown-header">
            <p className="user-menu-name">{displayName}</p>
            <p className="user-menu-email" title={email}>
              {email}
            </p>
          </div>
          <SignOutButton>
            <button
              type="button"
              className="user-menu-signout"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              Sign out
            </button>
          </SignOutButton>
        </div>
      )}
    </div>
  )
}

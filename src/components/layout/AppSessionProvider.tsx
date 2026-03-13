'use client'

import { createContext, useContext } from 'react'

type AppSessionValue = {
  userId: string
  familyId: string | null
}

const AppSessionContext = createContext<AppSessionValue | null>(null)

export function AppSessionProvider({
  value,
  children,
}: {
  value: AppSessionValue
  children: React.ReactNode
}) {
  return (
    <AppSessionContext.Provider value={value}>
      {children}
    </AppSessionContext.Provider>
  )
}

export function useAppSession() {
  const context = useContext(AppSessionContext)

  if (!context) {
    throw new Error('useAppSession must be used within AppSessionProvider')
  }

  return context
}

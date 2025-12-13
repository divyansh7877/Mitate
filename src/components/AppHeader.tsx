import React from 'react'
import { useApp } from '@/lib/app-context'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'

export const AppHeader = () => {
  const { setStep, setQuery, setResult, setRequestId } = useApp()

  const goHome = () => {
    setQuery('')
    setResult(null)
    setRequestId('')
    setStep('landing')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Button
          variant="ghost"
          className="px-2 text-lg font-semibold tracking-tight"
          onClick={goHome}
        >
          Mitate (見立て)
        </Button>
        <ThemeToggle />
      </div>
    </header>
  )
}



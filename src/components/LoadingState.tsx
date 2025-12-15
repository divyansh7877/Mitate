import React, { useEffect, useState } from 'react'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import type { InfographicResult } from '@/lib/app-context'
import { useApp } from '@/lib/app-context'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const steps = [
  { id: 1, label: 'Finding relevant papers...' },
  { id: 2, label: 'Reading and summarizing...' },
  { id: 3, label: 'Generating your infographic...' },
]

export const LoadingState = () => {
  const { setStep, setResult, query, requestId } = useApp()
  const [currentStep, setCurrentStep] = useState(1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!requestId) {
      setError('No request ID found')
      return
    }

    let pollInterval: NodeJS.Timeout

    async function pollStatus() {
      try {
        const status = await api.getStatus(requestId)

        // Update progress indicator based on status
        if (status.status === 'finding_paper') setCurrentStep(1)
        if (status.status === 'summarizing') setCurrentStep(2)
        if (status.status === 'generating_image') setCurrentStep(3)

        if (status.status === 'complete' && status.result) {
          clearInterval(pollInterval)

          // Transform API result to app context format
          const result: InfographicResult = {
            paperTitle: status.result.paper_title,
            paperUrl: status.result.paper_url,
            imageUrl: status.result.image_url,
            summary: status.result.summary,
            // Include concept_images if present (simple_visuals mode)
            conceptImages: status.result.concept_images,
          }

          setResult(result)
          setStep('result')
        } else if (status.status === 'failed') {
          clearInterval(pollInterval)
          setError(status.error || 'Generation failed')
        }
      } catch (err) {
        console.error('Polling error:', err)
        setError(err instanceof Error ? err.message : 'Failed to check status')
        clearInterval(pollInterval)
      }
    }

    // Poll every 2 seconds
    pollInterval = setInterval(pollStatus, 2000)
    pollStatus() // Initial call

    return () => clearInterval(pollInterval)
  }, [requestId, setStep, setResult])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-foreground">{error}</p>
            <Button onClick={() => setStep('landing')} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Generating Explainer</CardTitle>
          <p className="text-muted-foreground text-sm mt-2">"{query}"</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {currentStep > step.id ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : currentStep === step.id ? (
                  <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                ) : (
                  <Circle className="h-6 w-6 text-gray-300" />
                )}
              </div>
              <div
                className={`text-lg ${currentStep === step.id ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
              >
                {step.label}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

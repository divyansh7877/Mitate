import React from 'react'
import { useApp } from '@/lib/app-context'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Download, RotateCcw, FileText, ArrowLeft } from 'lucide-react'

export const ResultPage = () => {
  const { result, setStep, setQuery } = useApp()

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>No result available. Please try again.</p>
        <Button onClick={() => setStep('landing')}>Go Home</Button>
      </div>
    )
  }

  const handleDownload = () => {
    // Basic download implementation for the image
    const link = document.createElement('a')
    link.href = result.imageUrl
    link.download = `arxiv-explainer-${result.paperTitle.replace(/\s+/g, '-').toLowerCase()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleTryAnother = () => {
    setQuery('')
    setStep('landing')
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-6">
        <Button variant="ghost" onClick={handleTryAnother} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
        </Button>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Placeholder for the Generated Infographic */}
            <div className="w-full aspect-square bg-muted flex items-center justify-center relative group">
              <img
                src={result.imageUrl}
                alt={`Infographic for ${result.paperTitle}`}
                className="w-full h-full object-contain"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">
              {result.paperTitle}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-2">
              <FileText className="h-4 w-4" />
              <a
                href={result.paperUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline text-primary"
              >
                View on ArXiv
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* One-liner */}
            <p className="text-lg text-muted-foreground italic">
              {result.summary.one_liner}
            </p>

            {/* Key Concepts */}
            <div>
              <h3 className="font-semibold mb-3">Key Concepts</h3>
              <div className="space-y-4">
                {result.summary.key_concepts.map((concept, index) => (
                  <div key={index} className="border-l-2 border-primary pl-4">
                    <h4 className="font-medium text-foreground">{concept.name}</h4>
                    <p className="text-muted-foreground text-sm mt-1">
                      {concept.explanation}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1 italic">
                      💡 {concept.visual_metaphor}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Finding */}
            <div>
              <h3 className="font-semibold mb-2">Key Finding</h3>
              <p className="text-foreground leading-relaxed">
                {result.summary.key_finding}
              </p>
            </div>

            {/* Real World Impact */}
            <div>
              <h3 className="font-semibold mb-2">Real World Impact</h3>
              <p className="text-foreground leading-relaxed">
                {result.summary.real_world_impact}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button onClick={handleDownload} className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" /> Download PNG
            </Button>
            <Button
              variant="outline"
              onClick={handleTryAnother}
              className="w-full sm:w-auto"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Try Another Topic
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

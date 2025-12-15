import React, { useState } from 'react'
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
import {
  Download,
  RotateCcw,
  FileText,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export const ResultPage = () => {
  const { result, setStep, setQuery } = useApp()
  const [currentSlide, setCurrentSlide] = useState(0)

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>No result available. Please try again.</p>
        <Button onClick={() => setStep('landing')}>Go Home</Button>
      </div>
    )
  }

  // Check if we're in simple_visuals mode (has concept_images)
  console.log('[ResultPage] Full result:', result)
  console.log('[ResultPage] result.conceptImages:', result.conceptImages)

  const hasConceptImages =
    result.conceptImages && result.conceptImages.length > 0
  const conceptImages = result.conceptImages || []

  console.log('[ResultPage] hasConceptImages:', hasConceptImages)
  console.log('[ResultPage] conceptImages:', conceptImages)

  const handleDownload = () => {
    // Download current image (either single infographic or current carousel image)
    const imageUrl = hasConceptImages
      ? conceptImages[currentSlide]?.image_url
      : result.imageUrl
    const fileName = hasConceptImages
      ? `${result.paperTitle.replace(/\s+/g, '-').toLowerCase()}-${conceptImages[currentSlide]?.concept_name.replace(/\s+/g, '-').toLowerCase()}.png`
      : `arxiv-explainer-${result.paperTitle.replace(/\s+/g, '-').toLowerCase()}.png`

    const link = document.createElement('a')
    link.href = imageUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleTryAnother = () => {
    setQuery('')
    setStep('landing')
  }

  const goToPrevSlide = () => {
    setCurrentSlide((prev) =>
      prev === 0 ? conceptImages.length - 1 : prev - 1,
    )
  }

  const goToNextSlide = () => {
    setCurrentSlide((prev) =>
      prev === conceptImages.length - 1 ? 0 : prev + 1,
    )
  }

  // Get current concept for carousel mode
  const currentConcept = hasConceptImages
    ? result.summary.key_concepts.find(
        (c) => c.name === conceptImages[currentSlide]?.concept_name,
      ) || result.summary.key_concepts[currentSlide]
    : null

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-6">
        <Button variant="ghost" onClick={handleTryAnother} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
        </Button>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {hasConceptImages ? (
              /* Carousel Mode - Simple Visuals */
              <div className="relative">
                {/* Image Container */}
                <div className="w-full aspect-square bg-muted flex items-center justify-center relative">
                  <img
                    src={conceptImages[currentSlide]?.image_url}
                    alt={`Visual for ${conceptImages[currentSlide]?.concept_name}`}
                    className="w-full h-full object-contain"
                  />

                  {/* Navigation Arrows */}
                  <button
                    onClick={goToPrevSlide}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                    aria-label="Previous concept"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={goToNextSlide}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                    aria-label="Next concept"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </div>

                {/* Dot Indicators */}
                <div className="flex justify-center gap-2 py-4 bg-muted/50">
                  {conceptImages.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === currentSlide
                          ? 'bg-primary'
                          : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                      }`}
                      aria-label={`Go to concept ${index + 1}`}
                    />
                  ))}
                </div>

                {/* Current Concept Info */}
                {currentConcept && (
                  <div className="p-6 border-t">
                    <div className="text-sm text-muted-foreground mb-1">
                      Concept {currentSlide + 1} of {conceptImages.length}
                    </div>
                    <h3 className="font-semibold text-xl mb-2">
                      {currentConcept.name}
                    </h3>
                    <p className="text-muted-foreground mb-2">
                      {currentConcept.explanation}
                    </p>
                    <p className="text-sm text-muted-foreground/70 italic">
                      💡 {currentConcept.visual_metaphor}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Original Mode - Single Infographic */
              <div className="w-full aspect-square bg-muted flex items-center justify-center relative group">
                <img
                  src={result.imageUrl}
                  alt={`Infographic for ${result.paperTitle}`}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
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
                    <h4 className="font-medium text-foreground">
                      {concept.name}
                    </h4>
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

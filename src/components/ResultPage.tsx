import React from 'react'
import ReactMarkdown from 'react-markdown'
import { useApp } from '@/lib/app-context'
import type { Summary } from '@/lib/types'
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

  console.log('[ResultPage] Rendering with result:', result)

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
    link.href = result.image_url
    link.download = `arxiv-explainer-${result.paper_title.replace(/\s+/g, '-').toLowerCase()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleTryAnother = () => {
    setQuery('')
    setStep('landing')
  }

  const formatSummaryToMarkdown = (summary: Summary): string => {
    let md = `**One Liner:** ${summary.one_liner}\n\n`

    md += `### Key Concepts\n`
    summary.key_concepts.forEach((concept) => {
      md += `* **${concept.name}**: ${concept.explanation}\n`
      md += `  > *Metaphor: ${concept.visual_metaphor}*\n`
    })

    md += `\n### Key Finding\n${summary.key_finding}\n`

    if (summary.real_world_impact) {
      md += `\n### Real World Impact\n${summary.real_world_impact}\n`
    }

    return md
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
                src={result.image_url}
                alt={`Infographic for ${result.paper_title}`}
                className="w-full h-full object-contain"
                onError={(e) => console.error('[ResultPage] Failed to load image:', result.image_url, e)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">
              {result.paper_title}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-2">
              <FileText className="h-4 w-4" />
              <a
                href={result.paper_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline text-primary"
              >
                View on ArXiv
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold mb-2">Summary</h3>
            <div className="text-foreground leading-relaxed prose dark:prose-invert max-w-none">
              <ReactMarkdown>{formatSummaryToMarkdown(result.summary)}</ReactMarkdown>
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

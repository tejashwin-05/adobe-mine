"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, FileText, ExternalLink, AlertCircle, Star } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface RelatedSnippet {
  document_name: string
  section_title: string
  snippet: string
  relevance_score: number
  page_number?: number
}

interface RecommendationsPanelProps {
  selectedText: string
  clusterId: string
  onNavigateToDocument: (documentName: string, pageNumber?: number) => void
}

export function RecommendationsPanel({ selectedText, clusterId, onNavigateToDocument }: RecommendationsPanelProps) {
  const [recommendations, setRecommendations] = useState<RelatedSnippet[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch recommendations when selected text changes
  useEffect(() => {
    if (!selectedText || !clusterId) {
      setRecommendations([])
      return
    }

    const fetchRecommendations = async () => {
      setIsLoading(true)
      setError(null)

      try {
        console.log("[v0] Fetching recommendations for:", selectedText)

        const response = await fetch("/api/v1/recommendations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query_text: selectedText,
            cluster_id: clusterId,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch recommendations: ${response.statusText}`)
        }

        const data = await response.json()
        console.log("[v0] Recommendations received:", data)

        // Ensure we have an array of snippets
        const snippets = Array.isArray(data) ? data : data.snippets || []
        setRecommendations(snippets.slice(0, 5)) // Limit to 5 as per spec

        if (snippets.length > 0) {
          toast({
            title: "Related content found",
            description: `Found ${snippets.length} related snippet${snippets.length !== 1 ? "s" : ""} across your documents.`,
          })
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch recommendations"
        console.error("[v0] Recommendations error:", err)
        setError(errorMessage)

        toast({
          title: "Failed to find related content",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    // Debounce the API call to avoid too many requests
    const timeoutId = setTimeout(fetchRecommendations, 500)
    return () => clearTimeout(timeoutId)
  }, [selectedText, clusterId, toast])

  const handleSnippetClick = (snippet: RelatedSnippet) => {
    console.log("[v0] Navigating to snippet:", snippet)
    onNavigateToDocument(snippet.document_name, snippet.page_number)

    toast({
      title: "Navigating to document",
      description: `Opening "${snippet.document_name}" ${snippet.page_number ? `at page ${snippet.page_number}` : ""}`,
    })
  }

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    if (score >= 0.6) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
  }

  const formatRelevanceScore = (score: number) => {
    return `${Math.round(score * 100)}%`
  }

  if (!selectedText) {
    return (
      <div className="p-6">
        <h3 className="font-serif text-lg font-semibold mb-4">Connecting the Dots</h3>
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground font-sans">
              Select text in the PDF to discover related content across your document cluster.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <h3 className="font-serif text-lg font-semibold">Connecting the Dots</h3>

      {/* Selected Text Display */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-sans flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            Selected Text
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground font-sans bg-muted p-3 rounded-md border-l-4 border-primary">
            "{selectedText}"
          </p>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
            <p className="text-sm text-muted-foreground font-sans">
              Analyzing connections across your document cluster...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Connection Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Recommendations */}
      {!isLoading && !error && recommendations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-base font-semibold">Related Snippets</h4>
            <Badge variant="secondary" className="font-sans">
              {recommendations.length} found
            </Badge>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recommendations.map((snippet, index) => (
              <Card
                key={index}
                className="cursor-pointer hover:bg-accent/50 transition-colors border-l-4 border-l-primary/20 hover:border-l-primary"
                onClick={() => handleSnippetClick(snippet)}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {/* Document and Section Info */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-3 w-3 text-primary flex-shrink-0" />
                          <span className="text-xs font-medium font-sans truncate" title={snippet.document_name}>
                            {snippet.document_name}
                          </span>
                        </div>
                        {snippet.section_title && (
                          <p className="text-xs text-muted-foreground font-sans truncate" title={snippet.section_title}>
                            {snippet.section_title}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          variant="secondary"
                          className={`text-xs font-sans ${getRelevanceColor(snippet.relevance_score)}`}
                        >
                          {formatRelevanceScore(snippet.relevance_score)}
                        </Badge>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Snippet Text */}
                    <p className="text-sm text-foreground font-sans leading-relaxed">{snippet.snippet}</p>

                    {/* Page Number */}
                    {snippet.page_number && (
                      <p className="text-xs text-muted-foreground font-sans">Page {snippet.page_number}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!isLoading && !error && recommendations.length === 0 && selectedText && (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground font-sans mb-2">
              No related content found for the selected text.
            </p>
            <p className="text-xs text-muted-foreground font-sans">
              Try selecting a different passage or check your document cluster.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, FileText, ExternalLink, AlertCircle, Star, Lightbulb, Podcast, Volume2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface RelatedSnippet {
  document_name: string
  section_title: string
  snippet: string
  relevance_score: number
  page_number?: number
}

interface InsightData {
  key_takeaways: string[]
  contradictions_or_counterpoints: string[]
  related_examples: string[]
}

interface InsightsPanelProps {
  selectedText: string
  clusterId: string
  onNavigateToDocument: (documentName: string, pageNumber?: number) => void
}

export function InsightsPanel({ selectedText, clusterId, onNavigateToDocument }: InsightsPanelProps) {
  const [recommendations, setRecommendations] = useState<RelatedSnippet[]>([])
  const [insights, setInsights] = useState<InsightData | null>(null)
  const [podcastUrl, setPodcastUrl] = useState<string | null>(null)
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("recommendations")
  const { toast } = useToast()

  // Fetch recommendations when selected text changes
  useEffect(() => {
    if (!selectedText || !clusterId) {
      setRecommendations([])
      setInsights(null)
      setPodcastUrl(null)
      return
    }

    fetchRecommendations()
    fetchInsights()
  }, [selectedText, clusterId])

  const fetchRecommendations = async () => {
    setIsLoadingRecommendations(true)
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

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        console.log("[v0] API not available for recommendations, using demo mode")
        // Create mock recommendations for demo mode
        const mockRecommendations = [
          {
            document_name: "ML_Fundamentals.pdf",
            section_title: "Introduction to Machine Learning",
            snippet:
              "Machine learning is a subset of artificial intelligence that focuses on algorithms that can learn and make decisions from data without being explicitly programmed for every scenario.",
            relevance_score: 0.92,
            page_number: 15,
          },
          {
            document_name: "Data_Analysis_Guide.pdf",
            section_title: "Pattern Recognition Techniques",
            snippet:
              "Advanced pattern recognition techniques enable systems to identify complex relationships in large datasets, leading to more accurate predictions and insights.",
            relevance_score: 0.87,
            page_number: 23,
          },
          {
            document_name: "AI_Applications.pdf",
            section_title: "Real-world Applications",
            snippet:
              "From recommendation systems to autonomous vehicles, machine learning algorithms are transforming industries by processing vast amounts of data to make intelligent decisions.",
            relevance_score: 0.81,
            page_number: 8,
          },
        ]
        setRecommendations(mockRecommendations)
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch recommendations: ${response.statusText}`)
      }

      const data = await response.json()
      const snippets = Array.isArray(data) ? data : data.snippets || []
      setRecommendations(snippets.slice(0, 5))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch recommendations"
      console.error("[v0] Recommendations error:", err)
      setError(errorMessage)
    } finally {
      setIsLoadingRecommendations(false)
    }
  }

  const fetchInsights = async () => {
    setIsLoadingInsights(true)

    try {
      console.log("[v0] Fetching insights for:", selectedText)

      const response = await fetch("/api/v1/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: selectedText,
        }),
      })

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        console.log("[v0] API not available for insights, using demo mode")
        // Create mock insights for demo mode
        const mockInsights = {
          key_takeaways: [
            "Machine learning enables computers to learn from data without explicit programming",
            "Pattern recognition is fundamental to extracting meaningful insights from large datasets",
            "ML algorithms can revolutionize data analysis across various industries",
          ],
          contradictions_or_counterpoints: [
            "While ML can automate analysis, human expertise is still crucial for interpreting results",
            "Large datasets don't always guarantee better outcomes - quality matters more than quantity",
          ],
          related_examples: [
            "Netflix uses ML algorithms to recommend movies based on viewing patterns",
            "Financial institutions employ ML for fraud detection and risk assessment",
            "Healthcare systems use pattern recognition for medical image analysis",
          ],
        }
        setInsights(mockInsights)
        toast({
          title: "Insights generated (Demo)",
          description: "AI analysis of your selected text is ready.",
        })
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch insights: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("[v0] Insights received:", data)
      setInsights(data)

      toast({
        title: "Insights generated",
        description: "AI analysis of your selected text is ready.",
      })
    } catch (err) {
      console.error("[v0] Insights error:", err)
      // Don't show error for insights, just log it
    } finally {
      setIsLoadingInsights(false)
    }
  }

  const generatePodcast = async () => {
    if (!selectedText || recommendations.length === 0) {
      toast({
        title: "Cannot generate podcast",
        description: "Need selected text and related snippets to create podcast content.",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingPodcast(true)

    try {
      console.log("[v0] Generating podcast for selected text and snippets")

      // Create discussion content from selected text and top snippets
      const topSnippets = recommendations
        .slice(0, 3)
        .map((s) => s.snippet)
        .join(" ")
      const discussion = `${selectedText} ${topSnippets}`

      const response = await fetch("/api/v1/podcast/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intro: `Welcome to Document Insights. Today we're exploring: "${selectedText.slice(0, 100)}..."`,
          discussion: discussion,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to generate podcast: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("[v0] Podcast generated:", data)
      setPodcastUrl(data.audio_url)

      toast({
        title: "Podcast generated",
        description: "Your AI-generated podcast is ready to play.",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate podcast"
      console.error("[v0] Podcast error:", err)

      toast({
        title: "Podcast generation failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPodcast(false)
    }
  }

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
              Select text in the PDF to discover related content, generate insights, and create podcasts.
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

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Connection Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs for different features */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recommendations" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Snippets
          </TabsTrigger>
          <TabsTrigger value="insights" className="text-xs">
            <Lightbulb className="h-3 w-3 mr-1" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="podcast" className="text-xs">
            <Podcast className="h-3 w-3 mr-1" />
            Podcast
          </TabsTrigger>
        </TabsList>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-3">
          {isLoadingRecommendations && (
            <Card>
              <CardContent className="p-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                <p className="text-sm text-muted-foreground font-sans">Finding related content...</p>
              </CardContent>
            </Card>
          )}

          {!isLoadingRecommendations && recommendations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-serif text-base font-semibold">Related Snippets</h4>
                <Badge variant="secondary" className="font-sans">
                  {recommendations.length} found
                </Badge>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {recommendations.map((snippet, index) => (
                  <Card
                    key={index}
                    className="cursor-pointer hover:bg-accent/50 transition-colors border-l-4 border-l-primary/20 hover:border-l-primary"
                    onClick={() => handleSnippetClick(snippet)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="h-3 w-3 text-primary flex-shrink-0" />
                              <span className="text-xs font-medium font-sans truncate" title={snippet.document_name}>
                                {snippet.document_name}
                              </span>
                            </div>
                            {snippet.section_title && (
                              <p
                                className="text-xs text-muted-foreground font-sans truncate"
                                title={snippet.section_title}
                              >
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

                        <p className="text-sm text-foreground font-sans leading-relaxed">{snippet.snippet}</p>

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

          {!isLoadingRecommendations && recommendations.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground font-sans">
                  No related content found for the selected text.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-3">
          {isLoadingInsights && (
            <Card>
              <CardContent className="p-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                <p className="text-sm text-muted-foreground font-sans">Generating AI insights...</p>
              </CardContent>
            </Card>
          )}

          {!isLoadingInsights && insights && (
            <div className="space-y-3">
              {/* Key Takeaways */}
              {insights.key_takeaways && insights.key_takeaways.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-sans flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-secondary" />
                      Key Takeaways
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {insights.key_takeaways.map((takeaway, index) => (
                        <li key={index} className="text-sm font-sans flex items-start gap-2">
                          <span className="text-secondary mt-1">•</span>
                          <span>{takeaway}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Contradictions */}
              {insights.contradictions_or_counterpoints && insights.contradictions_or_counterpoints.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-sans flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                      Contradictions & Counterpoints
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {insights.contradictions_or_counterpoints.map((point, index) => (
                        <li key={index} className="text-sm font-sans flex items-start gap-2">
                          <span className="text-destructive mt-1">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Related Examples */}
              {insights.related_examples && insights.related_examples.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-sans flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Related Examples
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {insights.related_examples.map((example, index) => (
                        <li key={index} className="text-sm font-sans flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{example}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {!isLoadingInsights && !insights && (
            <Card>
              <CardContent className="p-6 text-center">
                <Lightbulb className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground font-sans">No insights available for the selected text.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Podcast Tab */}
        <TabsContent value="podcast" className="space-y-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-base font-semibold">Podcast Mode</h4>
              <Button
                onClick={generatePodcast}
                disabled={isGeneratingPodcast || !selectedText || recommendations.length === 0}
                size="sm"
              >
                {isGeneratingPodcast ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Podcast className="h-3 w-3 mr-1" />
                    Generate
                  </>
                )}
              </Button>
            </div>

            {isGeneratingPodcast && (
              <Card>
                <CardContent className="p-6 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                  <p className="text-sm text-muted-foreground font-sans">Creating your AI-generated podcast...</p>
                </CardContent>
              </Card>
            )}

            {podcastUrl && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-sans flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-primary" />
                    Generated Podcast
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground font-sans">
                      AI-generated discussion based on your selected text and related snippets.
                    </p>
                    <audio
                      controls
                      className="w-full"
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    >
                      <source src={podcastUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isGeneratingPodcast && !podcastUrl && (
              <Card>
                <CardContent className="p-6 text-center">
                  <Podcast className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground font-sans mb-2">
                    Generate an AI podcast from your selected text and related snippets.
                  </p>
                  <p className="text-xs text-muted-foreground font-sans">
                    {recommendations.length === 0
                      ? "Find related snippets first to enable podcast generation."
                      : 'Click "Generate" to create your personalized podcast.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Moon, Sun, FileText, Brain, Podcast, Network, Menu, X, ChevronLeft, ChevronRight } from "lucide-react"
import { useTheme } from "next-themes"
import { DocumentUpload } from "@/components/document-upload"
import { PDFViewer } from "@/components/pdf-viewer"
import { InsightsPanel } from "@/components/insights-panel"
import { KnowledgeGraph } from "@/components/knowledge-graph"

export default function DocumentInsightEngine() {
  const { theme, setTheme } = useTheme()
  const [clusterId, setClusterId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<string[]>([])
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null)
  const [showInsights, setShowInsights] = useState(false)
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false)
  const [selectedText, setSelectedText] = useState<string>("")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true)
      }
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleUploadComplete = (newClusterId: string, documentNames: string[]) => {
    setClusterId(newClusterId)
    setDocuments(documentNames)
    if (documentNames.length > 0) {
      setSelectedDocument(documentNames[0])
    }
  }

  const handleTextSelection = (text: string, documentName: string) => {
    setSelectedText(text)
    setShowInsights(true)
    console.log("[v0] Text selected from", documentName, ":", text)
  }

  const handleNavigateToDocument = (documentName: string, pageNumber?: number) => {
    setSelectedDocument(documentName)

    if (pageNumber && typeof window !== "undefined") {
      setTimeout(() => {
        if ((window as any).pdfNavigate) {
          ;(window as any).pdfNavigate(pageNumber)
        }
      }, 1000)
    }
  }

  const getDocumentUrl = (documentName: string) => {
    return `/placeholder.pdf?name=${encodeURIComponent(documentName)}`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="md:hidden"
                aria-label="Toggle sidebar"
              >
                {sidebarCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
              </Button>
            )}

            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary animate-scale-in">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="font-serif text-lg md:text-xl font-bold text-foreground">
              <span className="hidden sm:inline">Document Insight Engine</span>
              <span className="sm:hidden">Insight Engine</span>
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <Badge variant="secondary" className="font-sans text-xs hidden sm:inline-flex">
              Adobe India Hackathon
            </Badge>
            {clusterId && (
              <Badge variant="outline" className="font-sans text-xs animate-fade-in">
                <span className="hidden sm:inline">Cluster: </span>
                {clusterId.slice(0, 8)}...
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="transition-transform hover:scale-105"
              aria-label="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)] relative">
        {/* Sidebar */}
        <aside
          className={`
          ${sidebarCollapsed ? "w-0 md:w-16" : "w-80"} 
          ${isMobile && !sidebarCollapsed ? "absolute inset-y-0 left-0 z-30 w-80" : ""}
          border-r border-sidebar-border bg-sidebar/95 backdrop-blur-sm transition-all duration-300 ease-in-out
          ${isMobile && !sidebarCollapsed ? "animate-slide-in-left" : ""}
        `}
        >
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full border bg-background shadow-md hover:scale-105 transition-transform"
              aria-label="Toggle sidebar"
            >
              {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </Button>
          )}

          <div className={`flex h-full flex-col overflow-hidden ${sidebarCollapsed ? "items-center" : ""}`}>
            {!sidebarCollapsed && (
              <>
                {/* Upload Section */}
                <div className="p-6 animate-fade-in">
                  <DocumentUpload onUploadComplete={handleUploadComplete} />
                </div>

                <Separator />

                {/* Document List */}
                <div className="flex-1 p-6 overflow-hidden">
                  <h3 className="font-serif text-lg font-semibold mb-4">Document Library</h3>
                  {documents.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-3 animate-pulse-subtle" />
                      <p className="text-sm text-muted-foreground font-sans">No documents uploaded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2 overflow-y-auto custom-scrollbar max-h-[calc(100vh-20rem)]">
                      {documents.map((doc, index) => (
                        <Card
                          key={index}
                          className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                            selectedDocument === doc
                              ? "bg-primary/10 border-primary shadow-sm"
                              : "hover:bg-accent/50 hover:shadow-sm"
                          }`}
                          onClick={() => setSelectedDocument(doc)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="text-sm font-sans truncate" title={doc}>
                                {doc}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Quick Actions */}
                <div className="p-6 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent transition-all hover:scale-[1.02] focus-visible:scale-[1.02]"
                    disabled={!clusterId}
                    onClick={() => setShowInsights(true)}
                  >
                    <Brain className="mr-2 h-4 w-4" />
                    Generate Insights
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent transition-all hover:scale-[1.02] focus-visible:scale-[1.02]"
                    disabled={!clusterId}
                  >
                    <Podcast className="mr-2 h-4 w-4" />
                    Podcast Mode
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent transition-all hover:scale-[1.02] focus-visible:scale-[1.02]"
                    disabled={!clusterId}
                    onClick={() => setShowKnowledgeGraph(true)}
                  >
                    <Network className="mr-2 h-4 w-4" />
                    Concept Explorer
                  </Button>
                </div>
              </>
            )}

            {sidebarCollapsed && !isMobile && (
              <div className="flex flex-col items-center py-6 space-y-4">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!clusterId}
                  onClick={() => setShowInsights(true)}
                  className="transition-all hover:scale-105"
                  title="Generate Insights"
                >
                  <Brain className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!clusterId}
                  className="transition-all hover:scale-105"
                  title="Podcast Mode"
                >
                  <Podcast className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!clusterId}
                  onClick={() => setShowKnowledgeGraph(true)}
                  className="transition-all hover:scale-105"
                  title="Concept Explorer"
                >
                  <Network className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </aside>

        {isMobile && !sidebarCollapsed && (
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm z-20"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex min-w-0">
          {/* PDF Viewer */}
          <div className="flex-1 bg-background min-w-0">
            {!clusterId ? (
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center max-w-md animate-fade-in">
                  <div className="mx-auto h-20 w-20 md:h-24 md:w-24 rounded-full bg-muted flex items-center justify-center mb-6 animate-pulse-subtle">
                    <FileText className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
                  </div>
                  <h2 className="font-serif text-xl md:text-2xl font-bold mb-2">Ready to Analyze</h2>
                  <p className="text-muted-foreground font-sans text-sm md:text-base">
                    Upload your PDF documents to begin exploring connections and generating AI-powered insights across
                    your document cluster.
                  </p>
                </div>
              </div>
            ) : selectedDocument ? (
              <div className="animate-fade-in h-full">
                <PDFViewer
                  documentUrl={getDocumentUrl(selectedDocument)}
                  documentName={selectedDocument}
                  clusterId={clusterId}
                  onTextSelection={handleTextSelection}
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center max-w-md animate-fade-in">
                  <div className="mx-auto h-20 w-20 md:h-24 md:w-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <FileText className="h-10 w-10 md:h-12 md:w-12 text-primary" />
                  </div>
                  <h2 className="font-serif text-xl md:text-2xl font-bold mb-2">Select a Document</h2>
                  <p className="text-muted-foreground font-sans text-sm md:text-base">
                    Choose a document from the sidebar to begin viewing and analysis.
                  </p>
                </div>
              </div>
            )}
          </div>

          {showInsights && clusterId && (
            <div
              className={`
              ${isMobile ? "absolute inset-y-0 right-0 w-full max-w-sm z-30" : "w-96"} 
              border-l border-border bg-card/95 backdrop-blur-sm overflow-y-auto custom-scrollbar
              ${isMobile ? "animate-slide-in-right" : "animate-fade-in"}
            `}
            >
              {isMobile && (
                <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border p-4 flex justify-between items-center z-10">
                  <h3 className="font-serif font-semibold">Insights</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowInsights(false)}
                    aria-label="Close insights"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <InsightsPanel
                selectedText={selectedText}
                clusterId={clusterId}
                onNavigateToDocument={handleNavigateToDocument}
              />
            </div>
          )}
        </main>
      </div>

      <KnowledgeGraph
        clusterId={clusterId || ""}
        isVisible={showKnowledgeGraph}
        onClose={() => setShowKnowledgeGraph(false)}
      />
    </div>
  )
}

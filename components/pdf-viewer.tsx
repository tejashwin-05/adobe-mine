"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, FileText, ExternalLink } from "lucide-react"

interface PDFViewerProps {
  documentUrl: string
  documentName: string
  clusterId: string
  onTextSelection: (selectedText: string, documentName: string) => void
}

declare global {
  interface Window {
    AdobeDC: any
    pdfNavigate?: (pageNumber: number) => void
  }
}

export function PDFViewer({ documentUrl, documentName, clusterId, onTextSelection }: PDFViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const adobeViewRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAdobeSDKReady, setIsAdobeSDKReady] = useState(false)
  const [useFallback, setUseFallback] = useState(false)

  const clientId = process.env.NEXT_PUBLIC_ADOBE_CLIENT_ID

  const shouldUseFallback = !clientId || documentUrl.startsWith("blob:")

  useEffect(() => {
    if (shouldUseFallback) {
      console.log("[v0] Using fallback mode - no Adobe Client ID or blob URL detected")
      setUseFallback(true)
      setIsLoading(false)
      return
    }

    let attempts = 0
    const maxAttempts = 30 // Reduced timeout to 3 seconds
    let timeoutId: NodeJS.Timeout

    const checkAdobeSDK = () => {
      if (window.AdobeDC) {
        console.log("[v0] Adobe SDK loaded successfully")
        setIsAdobeSDKReady(true)
        return
      }

      attempts++
      if (attempts >= maxAttempts) {
        console.warn("[v0] Adobe SDK loading timeout, switching to fallback mode")
        setUseFallback(true)
        setIsLoading(false)
        return
      }
      timeoutId = setTimeout(checkAdobeSDK, 100)
    }

    checkAdobeSDK()

    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [shouldUseFallback])

  const FallbackPDFViewer = () => (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-serif font-semibold text-sm">{documentName}</h3>
            <p className="text-xs text-muted-foreground font-sans">Demo Mode - PDF viewer functionality simulated</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center max-w-md p-6">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-serif font-semibold text-lg mb-2">PDF Preview</h3>
          <p className="text-sm text-muted-foreground mb-4 font-sans">{documentName}</p>
          <div className="bg-card border rounded-lg p-4 mb-4">
            <p className="text-xs text-muted-foreground mb-2 font-sans">
              Demo Content - Click to simulate text selection:
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full mb-2 bg-transparent"
              onClick={() =>
                onTextSelection(
                  "Machine learning algorithms have revolutionized data analysis by enabling computers to learn patterns from large datasets without explicit programming.",
                  documentName,
                )
              }
            >
              Select Sample Text 1
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full bg-transparent"
              onClick={() =>
                onTextSelection(
                  "The integration of artificial intelligence in business processes has led to significant improvements in efficiency and decision-making capabilities.",
                  documentName,
                )
              }
            >
              Select Sample Text 2
            </Button>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              For full PDF functionality, configure Adobe PDF Embed API credentials.
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto ml-1 text-xs"
                onClick={() => window.open("https://developer.adobe.com/document-services/apis/pdf-embed/", "_blank")}
              >
                Get API Key
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )

  useEffect(() => {
    if (shouldUseFallback || useFallback) {
      setIsLoading(false)
      return
    }

    if (!clientId) {
      console.warn("[v0] Adobe Client ID not configured")
      setError("Adobe Client ID not configured. Please set NEXT_PUBLIC_ADOBE_CLIENT_ID environment variable.")
      setIsLoading(false)
      return
    }

    const initializePDFViewer = async () => {
      try {
        setIsLoading(true)
        setError(null)

        if (viewerRef.current) {
          viewerRef.current.innerHTML = ""
        }

        if (!window.AdobeDC) {
          throw new Error("Adobe SDK not available")
        }

        const adobeDCView = new window.AdobeDC.View({
          clientId,
          divId: "adobe-dc-view",
        })

        adobeViewRef.current = adobeDCView

        const viewerConfig = {
          embedMode: "SIZED_CONTAINER",
          showAnnotationTools: false,
          showLeftHandPanel: true,
          showDownloadPDF: false,
          showPrintPDF: false,
          showZoomControl: true,
          enableFormFilling: false,
          enableAnnotationAPIs: false,
          includePDFAnnotations: false,
        }

        const loadingTimeout = setTimeout(() => {
          console.error("[v0] PDF loading timeout")
          setUseFallback(true)
          setIsLoading(false)
        }, 10000)

        await adobeDCView.previewFile(
          {
            content: { location: { url: documentUrl } },
            metaData: { fileName: documentName },
          },
          viewerConfig,
        )

        clearTimeout(loadingTimeout)

        adobeDCView.registerCallback(
          window.AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,
          (event: any) => {
            if (event.type === "SELECTION_END" && event.data?.selection?.text) {
              const selectedText = event.data.selection.text.trim()
              if (selectedText) {
                console.log("[v0] Text selected:", selectedText)
                onTextSelection(selectedText, documentName)
              }
            }
          },
          { enablePDFAnalytics: false },
        )

        console.log("[v0] PDF viewer initialized successfully")
        setIsLoading(false)
      } catch (err) {
        console.error("[v0] PDF viewer initialization error:", err)
        setUseFallback(true)
        setIsLoading(false)
      }
    }

    if (isAdobeSDKReady && viewerRef.current && documentUrl) {
      initializePDFViewer()
    }

    return () => {
      adobeViewRef.current = null
    }
  }, [isAdobeSDKReady, documentUrl, documentName, clientId, onTextSelection, shouldUseFallback, useFallback])

  const goToLocation = (pageNumber: number) => {
    if (adobeViewRef.current) {
      adobeViewRef.current.getAPIs().then((apis: any) => {
        apis.gotoLocation(pageNumber)
      })
    }
  }

  useEffect(() => {
    window.pdfNavigate = goToLocation
  }, [])

  if (shouldUseFallback || useFallback) {
    return <FallbackPDFViewer />
  }

  if (!isAdobeSDKReady) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground font-sans">Loading Adobe PDF SDK...</p>
        </div>
      </div>
    )
  }

  if (error) {
    const isClientIdError = error.includes("Adobe Client ID not configured")
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>PDF Viewer Error:</strong> {error}
            {isClientIdError ? (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="text-xs font-medium mb-2">Setup Instructions:</p>
                <ol className="text-xs space-y-1 list-decimal list-inside">
                  <li>Get Adobe PDF Embed API credentials from Adobe Developer Console</li>
                  <li>Add NEXT_PUBLIC_ADOBE_CLIENT_ID to your environment variables</li>
                  <li>Restart the application</li>
                </ol>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full bg-transparent"
                  onClick={() => window.open("https://developer.adobe.com/document-services/apis/pdf-embed/", "_blank")}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Get Adobe API Key
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full bg-transparent"
                  onClick={() => setUseFallback(true)}
                >
                  Use Demo Mode Instead
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full bg-transparent"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-serif font-semibold text-sm">{documentName}</h3>
            <p className="text-xs text-muted-foreground font-sans">
              Select text to find related content across your document cluster
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-sm text-muted-foreground font-sans">Loading PDF...</p>
            </div>
          </div>
        )}
        <div id="adobe-dc-view" ref={viewerRef} className="w-full h-full" style={{ minHeight: "400px" }} />
      </div>
    </div>
  )
}

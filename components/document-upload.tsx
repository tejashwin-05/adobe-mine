"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UploadedDocument {
  name: string
  size: number
  status: "uploading" | "success" | "error"
}

interface DocumentUploadProps {
  onUploadComplete: (clusterId: string, documents: string[]) => void
}

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [files, setFiles] = useState<UploadedDocument[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      handleFiles(selectedFiles)
    }
  }, [])

  const handleFiles = (selectedFiles: File[]) => {
    // Filter for PDF files only
    const pdfFiles = selectedFiles.filter((file) => file.type === "application/pdf")

    if (pdfFiles.length !== selectedFiles.length) {
      toast({
        title: "Invalid files detected",
        description: "Only PDF files are supported. Non-PDF files have been filtered out.",
        variant: "destructive",
      })
    }

    if (pdfFiles.length === 0) {
      toast({
        title: "No valid files",
        description: "Please select PDF files to upload.",
        variant: "destructive",
      })
      return
    }

    const newFiles: UploadedDocument[] = pdfFiles.map((file) => ({
      name: file.name,
      size: file.size,
      status: "uploading" as const,
    }))

    setFiles(newFiles)
    setError(null)
    uploadFiles(pdfFiles)
  }

  const uploadFiles = async (filesToUpload: File[]) => {
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      filesToUpload.forEach((file) => {
        formData.append("files", file)
      })

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      let response: Response
      let result: any

      try {
        response = await fetch("/api/v1/documents/upload_cluster", {
          method: "POST",
          body: formData,
        })

        clearInterval(progressInterval)
        setUploadProgress(100)

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`)
        }

        // Check if response is actually JSON
        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          // If server returns HTML (like error pages), fall back to demo mode
          const text = await response.text()
          if (text.includes("<!DOCTYPE") || text.includes("<html")) {
            throw new Error("API_NOT_AVAILABLE")
          }
          throw new Error("Server returned non-JSON response")
        }

        result = await response.json()
      } catch (fetchError) {
        clearInterval(progressInterval)
        setUploadProgress(100)

        if (
          fetchError instanceof Error &&
          (fetchError.message.includes("API_NOT_AVAILABLE") ||
            fetchError.message.includes("Failed to fetch") ||
            fetchError.message.includes("NetworkError"))
        ) {
          console.log("[v0] API not available, activating demo mode")

          // Create mock successful response
          result = {
            cluster_id: `demo_cluster_${Date.now()}`,
            processed_files_count: filesToUpload.length,
            message: "Demo mode: Files processed successfully",
          }

          toast({
            title: "Demo Mode Active",
            description: "Backend API not available. Using demo mode for testing.",
            variant: "default",
          })
        } else {
          throw fetchError
        }
      }

      // Update file statuses to success
      setFiles((prev) => prev.map((file) => ({ ...file, status: "success" as const })))

      toast({
        title: "Upload successful",
        description: `${result.processed_files_count} documents uploaded successfully.`,
      })

      // Notify parent component
      onUploadComplete(
        result.cluster_id,
        filesToUpload.map((f) => f.name),
      )
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed"
      setError(errorMessage)

      // Update file statuses to error
      setFiles((prev) => prev.map((file) => ({ ...file, status: "error" as const })))

      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const clearAll = () => {
    setFiles([])
    setError(null)
    setUploadProgress(0)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-lg">Upload Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
            ${isUploading ? "pointer-events-none opacity-50" : "cursor-pointer"}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <input id="file-input" type="file" multiple accept=".pdf" onChange={handleFileSelect} className="hidden" />

          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium mb-1">Drop PDF files here or click to browse</p>
          <p className="text-xs text-muted-foreground">Upload multiple PDFs to analyze connections</p>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading documents...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Selected Files</span>
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            </div>

            <div className="space-y-2 max-h-32 overflow-y-auto">
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>

                  {file.status === "uploading" && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  )}

                  {file.status === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}

                  {file.status === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}

                  {!isUploading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(index)
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Instructions */}
        {files.length === 0 && !isUploading && (
          <p className="text-xs text-muted-foreground font-sans">
            Select multiple PDF documents to create a cluster for analysis. The system will identify connections and
            generate insights across your document library.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

"use client"

import { useState, useEffect, useMemo } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, RefreshCw, ZoomIn, ZoomOut, RotateCw } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"

// Set worker source for react-pdf
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
}

interface PDFViewerProps {
  url: string
}

export function PDFViewer({ url }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0) // For forcing remount
  const [windowWidth, setWindowWidth] = useState(0)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)

  // Set window width after mount
  useEffect(() => {
    setWindowWidth(window.innerWidth)

    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Reset when URL changes
  useEffect(() => {
    setLoading(true)
    setError(null)
    setNumPages(null)
    setPageNumber(1)
    setScale(1)
    setRotation(0)
    // Force remount the Document component when URL changes
    setKey((prev) => prev + 1)
  }, [url])

  // Memoize the options object to prevent unnecessary re-renders
  const documentOptions = useMemo(
    () => ({
      cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
      withCredentials: false,
    }),
    [],
  )

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setPageNumber(1)
    setLoading(false)
    setError(null)
  }

  function onDocumentLoadError(err: Error) {
    console.error("Error loading PDF:", err)
    setError(`Failed to load PDF: ${err.message}`)
    setLoading(false)
  }

  function changePage(offset: number) {
    if (!numPages) return
    const newPage = pageNumber + offset
    if (newPage >= 1 && newPage <= numPages) {
      setPageNumber(newPage)
    }
  }

  function zoomIn() {
    setScale((prevScale) => Math.min(prevScale + 0.2, 3))
  }

  function zoomOut() {
    setScale((prevScale) => Math.max(prevScale - 0.2, 0.5))
  }

  function rotate() {
    setRotation((prevRotation) => (prevRotation + 90) % 360)
  }

  function retryLoading() {
    setLoading(true)
    setError(null)
    setKey((prev) => prev + 1) // Force remount
  }

  if (error) {
    return (
      <Card className="w-full h-full">
        <CardContent className="p-6 flex flex-col items-center justify-center h-full">
          <div className="bg-destructive/10 text-destructive p-6 rounded-lg max-w-md text-center">
            <p className="mb-4">{error}</p>
            <p className="text-muted-foreground mb-4 text-sm">URL: {url}</p>
            <Button onClick={retryLoading} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full h-full flex flex-col border-0 rounded-none">
      <CardContent className="p-0 overflow-hidden flex-1 flex flex-col">
        <div className="flex items-center justify-between p-2 border-b bg-muted/30 flex-none">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1 || loading}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>

            <div className="text-sm">
              {loading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <span>
                  {pageNumber} / {numPages}
                </span>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => changePage(1)}
              disabled={!numPages || pageNumber >= numPages || loading}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={zoomOut}
              disabled={loading || scale <= 0.5}
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="h-4 w-4" />
              <span className="sr-only">Zoom out</span>
            </Button>

            <span className="text-xs w-12 text-center">{Math.round(scale * 100)}%</span>

            <Button variant="ghost" size="sm" onClick={zoomIn} disabled={loading || scale >= 3} className="h-8 w-8 p-0">
              <ZoomIn className="h-4 w-4" />
              <span className="sr-only">Zoom in</span>
            </Button>

            <Button variant="ghost" size="sm" onClick={rotate} disabled={loading} className="h-8 w-8 p-0">
              <RotateCw className="h-4 w-4" />
              <span className="sr-only">Rotate</span>
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 h-full">
          <div className="flex flex-col items-center p-4">
            <Document
              key={key}
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center p-8">
                  <div className="flex flex-col items-center">
                    <Skeleton className="h-40 w-32 mb-4" />
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              }
              className="max-w-full"
              options={documentOptions}
            >
              {!loading && numPages ? (
                <Page
                  pageNumber={pageNumber}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="max-w-full"
                  width={windowWidth > 768 ? Math.min(600 * scale, windowWidth - 48) : (windowWidth - 48) * scale}
                  rotate={rotation}
                />
              ) : null}
            </Document>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}


import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

// Try to set worker source for react-pdf
try {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
} catch (error) {
  console.error('Error setting PDF.js worker source:', error);
}

interface PDFViewerProps {
  url: string;
}

export function PDFViewer({ url }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0); // For forcing remount
  const [useWorker, setUseWorker] = useState(true);
  
  // Try alternative worker sources if needed
  useEffect(() => {
    const workerSources = [
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`,
      `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`,
      `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
    ];
    
    let currentSourceIndex = 0;
    
    const tryWorkerSource = () => {
      if (currentSourceIndex < workerSources.length) {
        try {
          pdfjs.GlobalWorkerOptions.workerSrc = workerSources[currentSourceIndex];
          console.log(`Trying PDF.js worker source: ${workerSources[currentSourceIndex]}`);
          currentSourceIndex++;
        } catch (error) {
          console.error('Error setting PDF.js worker source:', error);
          currentSourceIndex++;
          tryWorkerSource();
        }
      } else {
        // If all worker sources fail, disable the worker
        console.warn('All worker sources failed, disabling worker');
        setUseWorker(false);
      }
    };
    
    tryWorkerSource();
  }, []);

  // Reset when URL changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    setNumPages(null);
    setPageNumber(1);
    // Force remount the Document component when URL changes
    setKey(prev => prev + 1);
  }, [url]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
    setLoading(false);
    setError(null);
  }

  function onDocumentLoadError(err: Error) {
    console.error('Error loading PDF:', err);
    setError(`Failed to load PDF: ${err.message}`);
    setLoading(false);
  }

  function changePage(offset: number) {
    if (!numPages) return;
    const newPage = pageNumber + offset;
    if (newPage >= 1 && newPage <= numPages) {
      setPageNumber(newPage);
    }
  }

  function retryLoading() {
    setLoading(true);
    setError(null);
    setKey(prev => prev + 1); // Force remount
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 flex flex-col items-center">
          <p className="text-center text-destructive mb-4">{error}</p>
          <p className="text-center text-muted-foreground mb-4 text-sm">
            URL: {url}
          </p>
          <Button onClick={retryLoading} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-0 overflow-hidden">
        <div className="flex flex-col items-center">
          <Document
            key={key}
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={<div className="p-8 text-center">Loading PDF...</div>}
            className="w-full"
            options={{
              cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
              cMapPacked: true,
              standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/',
              withCredentials: false,
            }}
          >
            {!loading && numPages ? (
              <Page
                pageNumber={pageNumber}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="mx-auto"
                width={window.innerWidth > 768 ? 600 : window.innerWidth - 48}
              />
            ) : null}
          </Document>
          
          {numPages && !loading && (
            <div className="flex items-center justify-between w-full px-4 py-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => changePage(-1)}
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <div className="text-sm text-muted-foreground">
                Page {pageNumber} of {numPages}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => changePage(1)}
                disabled={pageNumber >= numPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
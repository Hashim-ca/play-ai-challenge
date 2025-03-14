import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  File, X, ChevronDown, ChevronUp, Download, Copy as CopyIcon, AlertCircle
} from 'lucide-react';

// Define interfaces for the data structures to fix linter errors
interface ParsedContentPage {
  text?: string;
  // Add other page properties if needed
}

interface ParsedContentResult {
  pages?: ParsedContentPage[];
  // Add other result properties if needed
}

interface ParsedContentData {
  result?: ParsedContentResult;
  processing_time?: number;
  options?: {
    extraction_mode?: string;
  };
  // Add other data properties if needed
}

interface DocumentMetadata {
  pageCount: number;
  documentType: string;
  processingTimeMs?: number;
}

interface ParsedContentViewerProps {
  chatId: string;
  onClose: () => void;
  isVisible?: boolean; // Add prop to control visibility
}

/**
 * Component for viewing parsed content from a document
 * 
 * A simplified viewer that only shows raw JSON content.
 */
export function ParsedContentViewer({ 
  chatId, 
  onClose,
  isVisible = true // Changed from false to true to make it visible by default
}: ParsedContentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parsedContent, setParsedContent] = useState<ParsedContentData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [metadata, setMetadata] = useState<DocumentMetadata | null>(null);

  // Don't fetch if not visible
  useEffect(() => {
    if (!isVisible) return;
    
    const fetchParsedContent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/chat/${chatId}/parsed-content`);
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.parsedContent) {
          setParsedContent(data.parsedContent);
          // Extract metadata if available
          setMetadata(data.metadata || {
            pageCount: data.parsedContent.result?.pages?.length || 0,
            documentType: 'PDF',
            processingTimeMs: data.parsedContent.processing_time
          });
        } else {
          setError(data.error || 'Failed to load parsed content');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchParsedContent();
  }, [chatId, isVisible]);

  // If not visible, return null
  if (!isVisible) return null;

  const downloadAsJson = () => {
    if (!parsedContent) return;
    
    const dataStr = JSON.stringify(parsedContent, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `parsed-content-${chatId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Content copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy content: ', err);
    });
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="p-8 flex flex-col items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
          <p className="text-center text-muted-foreground">Loading parsed content...</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="p-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
          <p className="text-destructive font-medium mb-2">{error}</p>
          <p className="text-sm text-muted-foreground mb-4">
            The document may still be processing or an error occurred.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setLoading(true);
              setError(null);
              const fetchParsedContent = async () => {
                try {
                  const response = await fetch(`/api/chat/${chatId}/parsed-content`);
                  const data = await response.json();
                  if (data.success && data.parsedContent) {
                    setParsedContent(data.parsedContent);
                    setMetadata(data.metadata);
                  } else {
                    setError(data.error || 'Failed to load parsed content');
                  }
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'An error occurred');
                } finally {
                  setLoading(false);
                }
              };
              fetchParsedContent();
            }}
          >
            Try Again
          </Button>
        </div>
      );
    }
    
    if (!parsedContent) {
      return (
        <div className="p-8 text-center">
          <p className="text-muted-foreground mb-2">No parsed content available</p>
          <p className="text-sm text-muted-foreground">This document may still be processing.</p>
        </div>
      );
    }
    
    // Only show raw content
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(JSON.stringify(parsedContent, null, 2))}
          className="absolute top-2 right-2 z-10"
        >
          <CopyIcon className="h-4 w-4 mr-1" />
          Copy
        </Button>
        <ScrollArea className={`${expanded ? 'h-[70vh]' : 'h-[400px]'} w-full`}>
          <pre className="p-4 text-xs font-mono whitespace-pre-wrap overflow-auto">
            {JSON.stringify(parsedContent, null, 2)}
          </pre>
        </ScrollArea>
      </div>
    );
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 border-b">
        <div>
          <CardTitle className="text-lg flex items-center">
            <File className="h-5 w-5 mr-2" />
            Document Raw Content
          </CardTitle>
          {metadata?.pageCount && (
            <CardDescription>
              {metadata.pageCount} page{metadata.pageCount !== 1 ? 's' : ''}
            </CardDescription>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline" 
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-8 w-8 p-0"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadAsJson}
            disabled={!parsedContent}
            className="h-8 w-8 p-0"
            title="Download JSON"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="outline" 
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {renderContent()}
      </CardContent>
    </Card>
  );
}
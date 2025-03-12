import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  File, X, ChevronDown, ChevronUp, Download, 
  FileText, ListTree, Info, AlertCircle, Copy as CopyIcon
} from 'lucide-react';

interface ParsedContentViewerProps {
  chatId: string;
  onClose: () => void;
}

/**
 * Component for viewing parsed content from a document
 * 
 * Displays the processed document content with different views including
 * text view, structure view, and raw JSON view.
 */
export function ParsedContentViewer({ chatId, onClose }: ParsedContentViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parsedContent, setParsedContent] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('text');
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
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
  }, [chatId]);

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

  // Helper function to render text content tab
  const getTextContent = () => {
    if (!parsedContent || !parsedContent.result || !parsedContent.result.pages) {
      return 'No text content available';
    }
    
    // Extract just the text content from pages
    const pages = parsedContent.result.pages || [];
    return pages.map((page: any, index: number) => {
      // Get text content for the page
      const pageContent = page.text || '';
      
      return (
        <div key={`page-${index}`} className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-medium">Page {index + 1}</h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => copyToClipboard(pageContent)}
              className="h-7 px-2"
            >
              <CopyIcon className="h-3.5 w-3.5 mr-1" />
              Copy
            </Button>
          </div>
          <div className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap">
            {pageContent || <span className="text-muted-foreground italic">No text content on this page</span>}
          </div>
        </div>
      );
    });
  };
  
  // Helper function to render structure tab
  const getStructureContent = () => {
    if (!parsedContent || !parsedContent.result) {
      return 'No structure available';
    }
    
    return (
      <div className="p-4">
        <div className="mb-6">
          <h3 className="text-base font-medium mb-2">Document Structure</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Hierarchical representation of the document content
          </p>
        </div>
        
        <div className="border rounded-md p-4 text-sm">
          <pre className="text-xs font-mono">
            {JSON.stringify(parsedContent.result.structure || {}, null, 2)}
          </pre>
        </div>
      </div>
    );
  };
  
  // Helper function to render info/metadata tab
  const getMetadataContent = () => {
    return (
      <div className="p-4">
        <h3 className="text-base font-medium mb-4">Document Information</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 md:col-span-1">
            <div className="border rounded-md p-4">
              <h4 className="text-sm font-medium mb-2">Document Properties</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Pages</dt>
                  <dd>{parsedContent?.result?.pages?.length || 'Unknown'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Document Type</dt>
                  <dd>{metadata?.documentType || 'PDF'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Processing Time</dt>
                  <dd>{metadata?.processingTimeMs ? `${(metadata.processingTimeMs / 1000).toFixed(1)}s` : 'Unknown'}</dd>
                </div>
              </dl>
            </div>
          </div>
          
          <div className="col-span-2 md:col-span-1">
            <div className="border rounded-md p-4">
              <h4 className="text-sm font-medium mb-2">Content Summary</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tables</dt>
                  <dd>{parsedContent?.result?.tables?.length || 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Images</dt>
                  <dd>{parsedContent?.result?.images?.length || 0}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Extraction Mode</dt>
                  <dd>{parsedContent?.options?.extraction_mode || 'Unknown'}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Helper function to render raw JSON tab
  const getRawContent = () => {
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
        <ScrollArea className="h-[400px] w-full">
          <pre className="p-4 text-xs font-mono whitespace-pre-wrap overflow-auto">
            {JSON.stringify(parsedContent, null, 2)}
          </pre>
        </ScrollArea>
      </div>
    );
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
    
    return (
      <Tabs defaultValue="text" value={activeTab} onValueChange={setActiveTab}>
        <div className="px-4 pt-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="text" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Text</span>
            </TabsTrigger>
            <TabsTrigger value="structure" className="flex items-center">
              <ListTree className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Structure</span>
            </TabsTrigger>
            <TabsTrigger value="info" className="flex items-center">
              <Info className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Info</span>
            </TabsTrigger>
            <TabsTrigger value="raw" className="flex items-center">
              <File className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Raw</span>
            </TabsTrigger>
          </TabsList>
        </div>
        
        <ScrollArea className={`mt-2 ${expanded ? 'h-[70vh]' : 'h-[400px]'}`}>
          <TabsContent value="text" className="p-4">
            {getTextContent()}
          </TabsContent>
          
          <TabsContent value="structure">
            {getStructureContent()}
          </TabsContent>
          
          <TabsContent value="info">
            {getMetadataContent()}
          </TabsContent>
          
          <TabsContent value="raw">
            {getRawContent()}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    );
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 border-b">
        <div>
          <CardTitle className="text-lg flex items-center">
            <File className="h-5 w-5 mr-2" />
            Document Analysis
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
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ParsedContent, ProcessingState } from '@/lib/types/chat';

interface UsePdfProcessingProps {
  chatId: string;
  pdfStorageUrl?: string;
  initialState?: ProcessingState;
  pollingInterval?: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface ProcessingStatus {
  processed: boolean;
  processingState: ProcessingState;
  status: string;
  parsedContent: ParsedContent | null;
  errorMessage: string | null;
  metadata: any;
}

/**
 * Custom hook for handling PDF processing
 * 
 * This hook manages the process of sending a PDF for parsing and
 * checking its status. It uses React Query for efficient data fetching.
 */
export function usePdfProcessing({
  chatId,
  pdfStorageUrl: initialUrl,
  initialState = 'idle',
  pollingInterval = 5000, // Poll every 5 seconds by default
  onSuccess,
  onError,
}: UsePdfProcessingProps) {
  const queryClient = useQueryClient();
  const [processingState, setProcessingState] = useState<ProcessingState>(initialState);
  const [pdfStorageUrl, setPdfStorageUrl] = useState<string | undefined>(initialUrl);
  
  // Query for checking processing status
  const statusQuery = useQuery({
    queryKey: ['pdfProcessingStatus', chatId],
    queryFn: async (): Promise<ProcessingStatus> => {
      const response = await fetch(`/api/process-pdf/status?chatId=${chatId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch PDF processing status');
      }
      
      return response.json();
    },
    // Only enable polling while processing
    refetchInterval: processingState === 'processing' ? pollingInterval : false,
    enabled: !!chatId && processingState !== 'idle',
    retry: 3,
  });
  
  // Mutation for starting processing
  const processMutation = useMutation({
    mutationFn: async (url?: string) => {
      // Use provided URL or state URL
      const urlToUse = url || pdfStorageUrl;
      
      if (!urlToUse) {
        throw new Error('PDF storage URL is required for processing');
      }
      
      // Update URL state if a new URL is provided
      if (url && url !== pdfStorageUrl) {
        setPdfStorageUrl(url);
      }
      
      setProcessingState('processing');
      
      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          pdfStorageUrl: urlToUse,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.details || 'PDF processing failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate status query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['pdfProcessingStatus', chatId] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      setProcessingState('failed');
      onError?.(error);
    },
  });
  
  // Update processing state based on status response
  useEffect(() => {
    if (statusQuery.data) {
      setProcessingState(statusQuery.data.processingState as ProcessingState || 'idle');
    }
  }, [statusQuery.data]);
  
  // Check if processing is complete
  const isComplete = processingState === 'completed';
  
  // Check if there was an error during processing
  const hasError = processingState === 'failed' || !!statusQuery.error;
  
  return {
    processingState,
    isPending: processingState === 'processing',
    isComplete,
    hasError,
    errorMessage: hasError 
      ? (statusQuery.data?.errorMessage || (statusQuery.error as Error)?.message || 'Unknown error')
      : null,
    parsedContent: statusQuery.data?.parsedContent,
    metadata: statusQuery.data?.metadata,
    startProcessing: processMutation.mutate,
    isProcessingEnabled: !!pdfStorageUrl && processingState === 'idle',
    refetch: statusQuery.refetch,
    // Allow external components to update the URL
    setPdfStorageUrl,
    // Current URL
    pdfStorageUrl
  };
}
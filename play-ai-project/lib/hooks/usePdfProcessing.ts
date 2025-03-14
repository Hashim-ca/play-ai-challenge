import { useState, useEffect, useRef, useCallback } from 'react';
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
  metadata: {
    pageCount?: number;
    documentType?: string;
    processingTimeMs?: number;
    currentStep?: string;
    progress?: number;
    startTime?: number;
    estimatedTimeRemainingMs?: number;
  };
}

/**
 * Enhanced hook for handling PDF processing
 * 
 * This hook manages the process of sending a PDF for parsing and
 * checking its status with support for cancellation, progress tracking,
 * and better error handling.
 */
export function usePdfProcessing({
  chatId,
  pdfStorageUrl: initialUrl,
  initialState = 'idle',
  pollingInterval = 3000, // Poll more frequently (3s) for better UX
  onSuccess,
  onError,
}: UsePdfProcessingProps) {
  const queryClient = useQueryClient();
  const [processingState, setProcessingState] = useState<ProcessingState>(initialState);
  const [pdfStorageUrl, setPdfStorageUrl] = useState<string | undefined>(initialUrl);
  const [processingMetadata, setProcessingMetadata] = useState<ProcessingStatus['metadata']>({});
  const [lastError, setLastError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const retryCountRef = useRef<number>(0);
  
  // Calculate estimated completion time
  const updateEstimatedTime = useCallback((metadata: ProcessingStatus['metadata']) => {
    if (!startTimeRef.current) return metadata;
    
    // Use progress to estimate remaining time if available
    if (metadata.progress !== undefined) {
      const elapsedMs = Date.now() - startTimeRef.current;
      if (metadata.progress > 0) {
        const totalEstimatedMs = (elapsedMs / metadata.progress) * 100;
        const remainingMs = totalEstimatedMs - elapsedMs;
        return {
          ...metadata,
          estimatedTimeRemainingMs: Math.max(1000, remainingMs) // at least 1 second
        };
      }
    }
    
    // Fallback estimation based on page count
    const pageCount = metadata.pageCount || 5;
    const baseEstimate = Math.max(10000, pageCount * 2000); // min 10 seconds
    const elapsedMs = Date.now() - startTimeRef.current;
    const remainingMs = Math.max(1000, baseEstimate - elapsedMs);
    
    return {
      ...metadata,
      estimatedTimeRemainingMs: remainingMs
    };
  }, []);
  
  // Clean up function
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Reset retry count
    retryCountRef.current = 0;
  }, []);
  
  // Create a wrapped statusFetcher function with retry logic
  const fetchStatusWithRetry = useCallback(async (): Promise<ProcessingStatus> => {
    try {
      const response = await fetch(`/api/process-pdf/status?chatId=${chatId}`);
      
      if (!response.ok) {
        // On server errors, retry with exponential backoff
        if (response.status >= 500 && retryCountRef.current < 3) {
          retryCountRef.current++;
          const backoffMs = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
          
          return new Promise((resolve) => {
            setTimeout(async () => {
              try {
                const retryResponse = await fetch(`/api/process-pdf/status?chatId=${chatId}`);
                if (retryResponse.ok) {
                  const data = await retryResponse.json();
                  retryCountRef.current = 0;
                  resolve(data);
                } else {
                  throw new Error(`Failed to fetch status after retry: ${retryResponse.status}`);
                }
              } catch (error) {
                throw error;
              }
            }, backoffMs);
          });
        }
        
        throw new Error(`Failed to fetch PDF processing status: ${response.status}`);
      }
      
      retryCountRef.current = 0;
      return response.json();
    } catch (error) {
      console.error('Error fetching PDF processing status:', error);
      throw error;
    }
  }, [chatId]);
  
  // Query for checking processing status
  const statusQuery = useQuery({
    queryKey: ['pdfProcessingStatus', chatId],
    queryFn: fetchStatusWithRetry,
    // Only enable polling while processing
    refetchInterval: processingState === 'processing' ? pollingInterval : false,
    enabled: !!chatId && processingState !== 'idle',
    retry: 3,
    refetchOnWindowFocus: processingState === 'processing',
    staleTime: 2000, // Consider data stale after 2s to balance performance
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
      
      // Set initial processing state
      setProcessingState('processing');
      startTimeRef.current = Date.now();
      
      // Set up abort controller for cancellation
      cleanup(); // Clean up any existing controllers
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;
      
      try {
        const response = await fetch('/api/process-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId,
            pdfStorageUrl: urlToUse,
          }),
          signal,
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || error.details || 'PDF processing failed');
        }
        
        return response.json();
      } catch (error) {
        // Check if this was a cancellation
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Processing cancelled by user');
        }
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate status query to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['pdfProcessingStatus', chatId] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      // Only set failed state if not cancelled
      if (error.message === 'Processing cancelled by user') {
        setProcessingState('idle');
      } else {
        setProcessingState('failed');
        setLastError(error.message);
      }
      onError?.(error);
    },
  });
  
  // Cancel processing
  const cancelProcessing = useCallback(() => {
    if (processingState === 'processing') {
      // First, abort any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Then, notify the server to cancel processing
      fetch(`/api/process-pdf/status?chatId=${chatId}&cancel=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          cancel: true,
        }),
      }).catch((error) => {
        console.error('Error cancelling processing:', error);
      });
      
      // Update local state
      setProcessingState('idle');
      
      // Invalidate status query
      queryClient.invalidateQueries({ queryKey: ['pdfProcessingStatus', chatId] });
    }
  }, [chatId, processingState, queryClient]);
  
  // Update processing state based on status response
  useEffect(() => {
    if (statusQuery.data) {
      // Update processing state
      setProcessingState(statusQuery.data.processingState as ProcessingState || 'idle');
      
      // Only update metadata if we have new data
      if (statusQuery.data.metadata) {
        // Enhance metadata with estimated time
        const enhancedMetadata = updateEstimatedTime(statusQuery.data.metadata);
        setProcessingMetadata(enhancedMetadata);
      }
      
      // Store any error message
      if (statusQuery.data.errorMessage) {
        setLastError(statusQuery.data.errorMessage);
      }
      
      // If processing is complete or failed, clean up
      if (['completed', 'failed'].includes(statusQuery.data.processingState)) {
        cleanup();
      }
    }
  }, [statusQuery.data, updateEstimatedTime, cleanup]);
  
  // Clean up on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
  
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
      ? (lastError || statusQuery.data?.errorMessage || (statusQuery.error as Error)?.message || 'Unknown error')
      : null,
    parsedContent: statusQuery.data?.parsedContent,
    metadata: processingMetadata,
    startProcessing: processMutation.mutate,
    cancelProcessing,
    isProcessingEnabled: !!pdfStorageUrl && processingState === 'idle',
    refetch: statusQuery.refetch,
    // Allow external components to update the URL
    setPdfStorageUrl,
    // Current URL
    pdfStorageUrl,
    // For retrying after failure
    retry: () => {
      if (pdfStorageUrl) {
        setProcessingState('idle');
        setLastError(null);
        processMutation.mutate(pdfStorageUrl);
      }
    },
    // Allow direct manipulation of processing state for immediate UI feedback
    setProcessingState: (state: ProcessingState) => {
      setProcessingState(state);
    }
  };
}
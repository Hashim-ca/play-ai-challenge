import { useState, useEffect } from 'react';

interface UsePdfProcessingStatusProps {
  chatId: string;
  isProcessing: boolean;
  onComplete: () => void;
  onError: (error: string) => void;
}

export function usePdfProcessingStatus({
  chatId,
  isProcessing,
  onComplete,
  onError,
}: UsePdfProcessingStatusProps) {
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    const checkProcessingStatus = async () => {
      try {
        const response = await fetch(`/api/process-pdf/status?chatId=${chatId}`);
        const data = await response.json();
        
        setPollCount(prev => prev + 1);
        
        if (data.processingState === 'completed') {
          // Clear polling when complete
          clearInterval(pollInterval);
          onComplete();
        } else if (data.processingState === 'failed') {
          // Clear polling on failure
          clearInterval(pollInterval);
          onError(data.errorMessage || 'Processing failed');
        } else if (pollCount > 150) { // Stop after 5 minutes (150 * 2 seconds)
          clearInterval(pollInterval);
          onError('Processing timed out. Please try again.');
        }
      } catch (err) {
        console.error('Error checking processing status:', err);
      }
    };

    // Start polling when processing
    if (isProcessing) {
      setPollCount(0);
      pollInterval = setInterval(checkProcessingStatus, 2000); // Poll every 2 seconds
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [chatId, isProcessing, onComplete, onError, pollCount]);
} 
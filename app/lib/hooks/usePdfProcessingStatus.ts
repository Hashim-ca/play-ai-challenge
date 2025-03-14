// Import the enhanced hook from the main project
import { usePdfProcessing } from '../../../play-ai-project/lib/hooks/usePdfProcessing';

interface UsePdfProcessingStatusProps {
  chatId: string;
  isProcessing: boolean;
  onComplete: () => void;
  onError: (error: string) => void;
}

/**
 * A simpler wrapper around usePdfProcessing
 * Using the more advanced implementation internally
 */
export function usePdfProcessingStatus({
  chatId,
  isProcessing,
  onComplete,
  onError,
}: UsePdfProcessingStatusProps) {
  // Use the enhanced hook with simpleMode for compatibility
  const processing = usePdfProcessing({
    chatId,
    initialState: isProcessing ? 'processing' : 'idle',
    simpleMode: true,
    pollingInterval: 2000, // Poll every 2 seconds to match the original implementation
    onSuccess: onComplete,
    onError: (error) => onError(error.message || 'Processing failed')
  });

  return processing;
}
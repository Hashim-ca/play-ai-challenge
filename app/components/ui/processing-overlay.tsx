// Re-export from the main project's implementation
export { ProcessingOverlay } from '../../../play-ai-project/app/components/ui/processing-overlay';

// Define ProcessingOverlayProps here for TypeScript compatibility
interface ProcessingOverlayProps {
  state: 'idle' | 'processing' | 'completed' | 'failed';
  message?: string;
  errorMessage?: string | null;
  metadata?: {
    pageCount?: number;
    documentType?: string;
    processingTimeMs?: number;
  } | null;
  onContinue?: () => void;
}
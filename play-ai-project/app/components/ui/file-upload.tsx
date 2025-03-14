import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Upload, FileX, FileCheck, RefreshCw, 
  FileUp, WifiOff, AlertCircle, Eye
} from 'lucide-react';
import { useMediaQuery } from '@/app/hooks/use-media-query';

interface FileUploadProps {
  onUploadComplete: (key: string, fileName: string) => void;
  buttonLabel?: string;
  className?: string;
}

export function FileUpload({ 
  onUploadComplete, 
  buttonLabel = "Upload PDF", 
  className = "" 
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('(max-width: 640px)');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Clean up preview URL on unmount or when file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Create preview for PDF
  const createPreview = useCallback((file: File | null) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    
    if (file && file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }, [previewUrl]);

  const validateFile = (file: File): string | null => {
    // Validate file type (more thorough check beyond MIME type)
    if (file.type !== 'application/pdf') {
      return 'Only PDF files are allowed';
    }

    // Validate file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return 'File size cannot exceed 10MB';
    }

    // More validation could be added here
    
    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError(null);
    const validationError = validateFile(file);
    
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setSelectedFile(file);
    createPreview(file);
  };

  const handleDragEvents = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setError(null);
      
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      
      setSelectedFile(file);
      createPreview(file);
      
      // Reset file input to ensure onChange fires if same file is dropped again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Helper function to compress PDF files using PDF.js
  const compressPdf = async (file: File, quality: 'low' | 'medium' | 'high' = 'medium'): Promise<File | null> => {
    // If file is small enough already, no need to compress
    if (file.size < 1 * 1024 * 1024) {
      return file;
    }
    
    try {
      // Create a notification for users
      setError('Optimizing PDF for upload...');
      
      // Quality settings
      const qualityMap = {
        low: 0.4,
        medium: 0.7,
        high: 0.9
      };
      
      // Create the PDF data URL
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      // Use dynamic import to load PDF.js only when needed
      const pdfjs = await import('pdfjs-dist');
      // @ts-ignore - PDF.js types are not always recognized correctly
      const pdfjsLib = pdfjs.default;
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
      
      // Load the document
      const loadingTask = pdfjsLib.getDocument(url);
      const pdfDoc = await loadingTask.promise;
      
      // Create a canvas element for rendering
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to create canvas context');
      }
      
      // Create a new PDF document
      // @ts-ignore - PDF.js types are not always recognized correctly
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt'
      });
      
      // Process each page
      const numPages = pdfDoc.numPages;
      for (let i = 1; i <= numPages; i++) {
        // Get the page
        const page = await pdfDoc.getPage(i);
        
        // Get the viewport
        const viewport = page.getViewport({ scale: 1.5 });
        
        // Set canvas dimensions
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render the page
        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;
        
        // Add the page to the PDF
        const imgData = canvas.toDataURL('image/jpeg', qualityMap[quality]);
        const imgWidth = 595.28; // A4 width in points
        const imgHeight = 841.89; // A4 height in points
        
        if (i > 1) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      }
      
      // Generate the compressed PDF
      const compressedPdfBlob = pdf.output('blob');
      
      // Clean up
      URL.revokeObjectURL(url);
      
      // Create a new file
      const compressedFile = new File([compressedPdfBlob], file.name, {
        type: 'application/pdf',
        lastModified: Date.now()
      });
      
      // Log compression stats
      console.log(`PDF Compression: ${(file.size / (1024 * 1024)).toFixed(2)}MB → ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB (${Math.round((1 - compressedFile.size / file.size) * 100)}% reduction)`);
      
      // Reset error since compression is done
      setError(null);
      
      return compressedFile;
    } catch (error) {
      console.error('PDF compression error:', error);
      // If compression fails, fall back to original file
      return file;
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;
    if (!isOnline) {
      setError('You appear to be offline. Please check your connection and try again.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setError(null);
      
      // Create a new AbortController for this upload
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Compression step (only for large files)
      let fileToUpload = selectedFile;
      if (selectedFile.size > 2 * 1024 * 1024) { // Compress if > 2MB
        setUploadProgress(0);
        setError('Optimizing PDF before upload...');
        
        const compressedFile = await compressPdf(selectedFile);
        if (compressedFile && compressedFile.size < selectedFile.size) {
          fileToUpload = compressedFile;
          // Update the UI to show compression results
          setError(`Reduced file size by ${Math.round((1 - compressedFile.size / selectedFile.size) * 100)}%`);
          
          // Clear the compression message after 2 seconds
          setTimeout(() => {
            if (isOnline) {
              setError(null);
            }
          }, 2000);
        } else {
          setError(null);
        }
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);

      // Create a custom upload function with progress tracking
      const response = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentComplete);
          }
        });
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const responseObj = new Response(xhr.response, {
              status: xhr.status,
              statusText: xhr.statusText,
              headers: new Headers({
                'Content-Type': xhr.getResponseHeader('Content-Type') || 'application/json'
              })
            });
            resolve(responseObj);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
        
        xhr.addEventListener('error', () => {
          reject(new Error('Network error occurred during upload'));
        });
        
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'));
        });
        
        // Auto-retry on connection issues
        xhr.addEventListener('timeout', () => {
          if (retryCount < 3) {
            setRetryCount(prev => prev + 1);
            xhr.open('POST', '/api/upload');
            xhr.send(formData);
          } else {
            reject(new Error('Upload timed out after multiple retries'));
          }
        });
        
        xhr.open('POST', '/api/upload');
        xhr.timeout = 30000; // 30 seconds timeout
        xhr.send(formData);
        
        // Connect abort signal to XHR
        if (signal) {
          signal.addEventListener('abort', () => {
            xhr.abort();
            reject(new Error('Upload cancelled by user'));
          });
        }
      });

      // Process normal response
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const { key } = await response.json();
      onUploadComplete(key, selectedFile.name);
      setSelectedFile(null);
      setUploadProgress(0);
      
      // Clean up preview
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      
      // Create announcement for screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.classList.add('sr-only');
      announcement.textContent = 'File uploaded successfully.';
      document.body.appendChild(announcement);
      setTimeout(() => document.body.removeChild(announcement), 1000);
    } catch (err) {
      console.error('Error uploading file:', err);
      
      // Provide more detailed error messages based on the type of error
      if (!isOnline) {
        setError('You are currently offline. Please check your connection and try again.');
      } else if (err instanceof Error) {
        if (err.message.includes('cancelled')) {
          setError('Upload was cancelled.');
        } else if (err.message.includes('timed out')) {
          setError('Upload timed out. Your connection may be slow or unstable.');
        } else {
          setError(`${err.message}. Please try again.`);
        }
      } else {
        setError('Upload failed. Please try again.');
      }
    } finally {
      setIsUploading(false);
      setRetryCount(0);
      abortControllerRef.current = null;
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setError(null);
    setUploadProgress(0);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Clean up preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div 
        ref={dropAreaRef}
        onDragEnter={handleDragEvents}
        onDragOver={handleDragEvents}
        onDragLeave={handleDragEvents}
        onDrop={handleDrop}
        className={`w-full transition-all duration-300 ${
          !selectedFile && !isMobile ? 'min-h-[120px] border-2 border-dashed rounded-lg flex items-center justify-center' : ''
        } ${
          dragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/20'
        }`}
        aria-label="Drop area for PDF files"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            triggerFileInput();
          }
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="application/pdf"
          className="hidden"
          aria-label="Select a PDF file"
        />
        
        {!selectedFile && !isMobile ? (
          <div className="p-4 text-center">
            <FileUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">Drag & drop your PDF here</p>
            <p className="text-xs text-muted-foreground mb-2">or</p>
            <Button 
              onClick={triggerFileInput}
              disabled={isUploading}
              variant="outline"
              className="mx-auto"
              aria-label="Browse for PDF file"
            >
              <Upload className="h-4 w-4 mr-2" />
              Browse Files
            </Button>
          </div>
        ) : !selectedFile ? (
          <Button 
            onClick={triggerFileInput}
            disabled={isUploading}
            variant="outline"
            className="w-full"
            aria-label="Select a PDF file"
          >
            <Upload className="h-4 w-4 mr-2" />
            {buttonLabel}
          </Button>
        ) : null}
      </div>
      
      {selectedFile && (
        <div className="w-full space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center text-sm truncate max-w-[70%]">
              <FileCheck className="h-4 w-4 mr-2 flex-shrink-0 text-green-500" />
              <span className="truncate">{selectedFile.name}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
          
          {previewUrl && (
            <div className="relative border rounded-md overflow-hidden h-[120px] bg-muted/30">
              <Button 
                variant="outline" 
                size="sm" 
                className="absolute top-2 right-2 h-7 w-7 p-0"
                onClick={() => window.open(previewUrl, '_blank')}
                aria-label="Preview PDF"
              >
                <Eye className="h-3 w-3" />
              </Button>
              <iframe 
                src={previewUrl} 
                className="w-full h-full" 
                title="PDF Preview" 
              />
            </div>
          )}
          
          {isUploading && (
            <div className="w-full">
              <div className="flex justify-between text-xs mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                  role="progressbar"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            {isUploading ? (
              <Button 
                onClick={cancelUpload}
                variant="outline"
                className="flex-1"
                aria-label="Cancel upload"
              >
                <FileX className="h-4 w-4 mr-2" />
                Cancel Upload
              </Button>
            ) : (
              <>
                <Button 
                  onClick={uploadFile}
                  disabled={isUploading || !!error || !isOnline}
                  className="flex-1"
                  aria-label="Upload file"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
                
                <Button 
                  onClick={resetSelection}
                  variant="outline"
                  disabled={isUploading}
                  aria-label="Clear selection"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
          
          {!isOnline && (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <WifiOff className="h-4 w-4" />
              <span>You appear to be offline</span>
            </div>
          )}
        </div>
      )}
      
      {error && (
        <div className="w-full mt-2 p-3 border border-destructive/30 rounded-md bg-destructive/10">
          <div className="flex items-center text-destructive text-sm font-medium mb-2">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
          
          <div className="text-xs text-muted-foreground mb-2">
            {error.includes('file type') && 'Please make sure you are uploading a PDF file.'}
            {error.includes('file size') && 'Try compressing your PDF before uploading.'}
            {error.includes('offline') && 'Waiting for connection to return...'}
          </div>
          
          <Button 
            onClick={resetSelection} 
            variant="outline" 
            size="sm" 
            className="w-full"
            aria-label="Try uploading again"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Try again
          </Button>
        </div>
      )}
      
      <div aria-live="polite" className="sr-only">
        {isUploading && `Uploading file ${selectedFile?.name}, ${uploadProgress}% complete.`}
        {error && `Error: ${error}`}
        {selectedFile && !isUploading && !error && `File ${selectedFile.name} selected and ready to upload.`}
      </div>
    </div>
  );
}
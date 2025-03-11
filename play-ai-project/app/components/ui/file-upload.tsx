import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileX, FileCheck, Loader2, RefreshCw } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setError(null);
    setSelectedFile(file);

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }

    // Validate file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size cannot exceed 10MB');
      return;
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const { key } = await response.json();
      onUploadComplete(key, selectedFile.name);
      setSelectedFile(null);
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="application/pdf"
        className="hidden"
      />
      
      {!selectedFile ? (
        <Button 
          onClick={triggerFileInput}
          disabled={isUploading}
          variant="outline"
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {buttonLabel}
        </Button>
      ) : (
        <div className="w-full space-y-2">
          <div className="text-sm truncate max-w-full">
            <FileCheck className="h-4 w-4 inline mr-2 text-green-500" />
            {selectedFile.name}
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={uploadFile}
              disabled={isUploading || !!error}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
            
            <Button 
              onClick={resetSelection}
              variant="outline"
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      
      {error && (
        <div className="w-full mt-2">
          <div className="flex items-center text-destructive text-sm">
            <FileX className="h-4 w-4 mr-1 flex-shrink-0" />
            <span>{error}</span>
          </div>
          
          <Button 
            onClick={resetSelection} 
            variant="outline" 
            size="sm" 
            className="mt-2 w-full"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
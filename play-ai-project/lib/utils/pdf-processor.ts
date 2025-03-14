import Reducto from 'reductoai';
import { ProcessPdfParams } from '../types/chat';
import { ParseRunParams } from 'reductoai/resources/parse';
import { ProcessPdfResult } from '../types/reducto';

// Initialize Reducto client
const reductoClient = new Reducto({
  apiKey: process.env.REDUCTO_API_KEY,
});

/**
 * Transforms a storage key to a publicly accessible URL
 * @param pdfStorageUrl - The storage URL or key
 * @returns A publicly accessible URL for the PDF
 */
export function getPdfAccessUrl(pdfStorageUrl: string): string {
  // Check if already a full URL
  if (pdfStorageUrl.startsWith('http://') || pdfStorageUrl.startsWith('https://')) {
    return pdfStorageUrl;
  }
  
  // Format as a direct R2 URL
  const publicUrl = process.env.NEXT_PUBLIC_S3_PUBLIC_URL || "https://pub-136d99f684c64492a0588acb1ec07263.r2.dev";
  const formattedKey = pdfStorageUrl.startsWith('/') ? pdfStorageUrl.substring(1) : pdfStorageUrl;
  
  return `${publicUrl}/${formattedKey}`;
}

/**
 * Gets the proxy URL for a PDF
 * @param pdfStorageUrl - The storage URL or key
 * @returns A proxy URL for the PDF
 */
export function getProxyUrl(pdfStorageUrl: string): string {
  if (pdfStorageUrl.startsWith('http://') || pdfStorageUrl.startsWith('https://')) {
    return pdfStorageUrl;
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/api/proxy/pdf?key=${encodeURIComponent(pdfStorageUrl)}`;
}

/**
 * Standard options for Reducto PDF parsing
 */
const defaultReductoOptions = {
  options: {
    extraction_mode: 'ocr',
    chunking: {
      chunk_mode: 'page'
    },
    filter_blocks: ['Discard', 'Comment']
  },
  advanced_options: {
    ocr_system: 'multilingual' as 'multilingual' | 'highres' | 'combined',
    keep_line_breaks: true,
    add_page_markers: true,
    table_output_format: 'dynamic',
    continue_hierarchy: true,
    remove_text_formatting: false,
    merge_tables: true,
    spreadsheet_table_clustering: 'default' as 'default' | 'disabled'
  }
};

/**
 * Process a PDF document with Reducto API
 * @param params - Parameters for PDF processing
 * @returns The Reducto API response
 */
export async function processPdfWithReducto(params: ProcessPdfParams): Promise<ProcessPdfResult> {
  const { pdfStorageUrl } = params;
  
  // Try the direct R2 URL first
  const directUrl = getPdfAccessUrl(pdfStorageUrl);
  console.log('Attempting to process PDF with direct URL:', directUrl);
  
  try {
    // First attempt with direct URL
    const response = await reductoClient.parse.run({
      document_url: directUrl,
      ...defaultReductoOptions
    } as ParseRunParams);
    
    return {
      success: true,
      response,
      url: directUrl
    };
  } catch (directUrlError) {
    console.error('Direct URL processing failed:', directUrlError);
    
    // Fallback to proxy URL
    const proxyUrl = getProxyUrl(pdfStorageUrl);
    console.log('Retrying with proxy URL:', proxyUrl);
    
    try {
      const response = await reductoClient.parse.run({
        document_url: proxyUrl,
        ...defaultReductoOptions
      } as ParseRunParams);
      
      return {
        success: true,
        response,
        url: proxyUrl
      };
    } catch (proxyUrlError) {
      console.error('Proxy URL processing also failed:', proxyUrlError);
      
      // Both approaches failed
      return {
        success: false,
        error: proxyUrlError as Error,
        directUrlError: directUrlError as Error,
        url: directUrl
      };
    }
  }
}
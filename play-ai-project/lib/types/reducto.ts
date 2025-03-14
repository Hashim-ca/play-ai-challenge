/**
 * Type definitions for Reducto API responses
 * 
 * These types are based on the actual response structure from the Reducto API
 */

/**
 * Represents a page in a PDF document processed by Reducto
 */
export interface ReductoPage {
  page_num: number;
  content: string;
  // Add other page properties as needed
}

/**
 * Full result data from Reducto
 */
export interface FullResult {
  pages: ReductoPage[];
  // Add other FullResult properties as needed
}

/**
 * URL-based result data
 */
export interface URLResult {
  url: string;
  // Add other URLResult properties as needed
}

/**
 * Response from Reducto parse operation
 */
export interface ParseResponse {
  job_id: string;
  result: FullResult | URLResult;
  processing_time: number;
  // Add other response properties as needed
}

import { ParseResponse as ReductoParseResponse } from 'reductoai/resources/shared';

/**
 * Extended ParseResponse type that includes runtime properties
 * Use type intersection instead of interface extension to avoid conflicts
 */
export type ExtendedParseResponse = ReductoParseResponse & {
  processing_time: number;
};

/**
 * Result from the processPdfWithReducto function
 */
export interface ProcessPdfResult {
  success: boolean;
  response?: ReductoParseResponse & {
    processing_time?: number;
    result?: {
      pages?: unknown[];
    };
  };
  error?: Error;
  url?: string;
  directUrlError?: Error;
} 
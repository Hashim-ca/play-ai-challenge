import mongoose, { Schema } from 'mongoose';

/**
 * ParsedContentSchema - Stores the results of document parsing operations
 * 
 * This schema is designed to store the parsed content from PDF documents
 * separately from the chat data for better performance and data management.
 */
const ParsedContentSchema = new Schema(
  {
    // Reference to the chat this parsed content belongs to
    chatId: { 
      type: String, 
      required: true,
      index: true // Index for faster lookups 
    },
    
    // Tracking ID from the parsing service
    jobId: { 
      type: String 
    },
    
    // The actual parsed content (stored as a JSON string)
    result: { 
      type: String, 
      maxLength: 16777215 // ~16MB limit for large documents
    },
    
    // Processing status
    status: { 
      type: String, 
      enum: ['pending', 'processing', 'completed', 'failed'], 
      default: 'pending',
      index: true // Index for status-based queries
    },
    
    // Error details if processing failed
    errorMessage: { 
      type: String 
    },
    
    // Metadata about the document
    metadata: {
      pageCount: { type: Number },
      documentType: { type: String },
      processingTimeMs: { type: Number }
    }
  },
  {
    timestamps: true,
  }
);

// Additional compound index for more efficient queries
ParsedContentSchema.index({ chatId: 1, status: 1 });

// Check if the model is already defined to prevent overwriting during hot reloads
const ParsedContent = mongoose.models.ParsedContent || mongoose.model('ParsedContent', ParsedContentSchema);

export default ParsedContent;
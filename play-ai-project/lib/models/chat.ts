import mongoose, { Schema } from 'mongoose';

const MessageSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    role: { type: String, required: true, enum: ['user', 'assistant'] },
    timestamp: { type: Date, default: Date.now },
  }
);

const ChatSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    pdfStorageUrl: { type: String },
    pdfFileName: { type: String },
    // Legacy field maintained for backward compatibility
    // New code should use parsedContentId instead
    parsedContent: { type: String, maxLength: 16777215 }, 
    // Reference to the ParsedContent model
    parsedContentId: { type: Schema.Types.ObjectId, ref: 'ParsedContent' },
    // Processing state to track PDF processing status
    processingState: {
      type: String,
      enum: ['idle', 'processing', 'completed', 'failed'],
      default: 'idle'
    },
    audioInfo: { type: String },
    messages: [MessageSchema],
  },
  {
    timestamps: true,
  }
);

// Add indexes for faster queries
ChatSchema.index({ id: 1 });
ChatSchema.index({ createdAt: -1 });

// Check if the model is already defined to prevent overwriting during hot reloads
const Chat = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);

export default Chat; 
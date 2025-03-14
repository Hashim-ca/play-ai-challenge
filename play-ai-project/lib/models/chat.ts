import mongoose, { Schema } from 'mongoose';

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
    // We no longer store messages directly in the chat document
    // Instead, they will be queried from the Message collection
  },
  {
    timestamps: true,
  }
);

// Add indexes for faster queries
// Note: We've manually dropped the previous 'messages.id_1' index to prevent
// the "E11000 duplicate key error collection: test.chats index: messages.id_1" error
ChatSchema.index({ createdAt: -1 });

// Check if the model is already defined to prevent overwriting during hot reloads
const Chat = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);

export default Chat; 
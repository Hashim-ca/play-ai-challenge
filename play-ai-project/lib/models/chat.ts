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
    parsedContent: { type: String, maxLength: 16777215 }, // Use String with large max size to store JSON
    audioInfo: { type: String },
    messages: [MessageSchema],
  },
  {
    timestamps: true,
  }
);

// Check if the model is already defined to prevent overwriting during hot reloads
const Chat = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);

export default Chat; 
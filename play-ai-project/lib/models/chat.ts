import mongoose, { Schema } from 'mongoose';

const ChatSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    pdfStorageUrl: { type: String },
    pdfFileName: { type: String },
    parsedContent: { type: String },
    audioInfo: { type: String },
  },
  {
    timestamps: true,
  }
);

// Check if the model is already defined to prevent overwriting during hot reloads
const Chat = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);

export default Chat; 
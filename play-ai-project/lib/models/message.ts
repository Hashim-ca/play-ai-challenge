import mongoose, { Schema } from 'mongoose';

const MessageSchema = new Schema(
  {
    id: { type: String, required: true },
    chatId: { type: String, required: true, index: true },
    content: { type: String, required: true },
    role: { type: String, required: true, enum: ['user', 'assistant'] },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

// Add indexes for faster queries
MessageSchema.index({ chatId: 1, timestamp: 1 });

// Check if the model is already defined to prevent overwriting during hot reloads
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);

export default Message; 
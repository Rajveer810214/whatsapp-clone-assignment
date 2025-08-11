// src/models.ts
import { Schema, model, Document } from 'mongoose';

export interface IMessage extends Document {
  conversationId: string;
  messageId: string;
  metaMsgId?: string;
  from: string;
  to: string;
  timestamp: Date;
  type: string;
  body: string;
  status: 'pending' | 'sent' | 'delivered' | 'read';
  userName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const messageSchema = new Schema<IMessage>({
  conversationId: { type: String, required: true, index: true },
  messageId: { type: String, required: true },
  metaMsgId: { type: String },
  from: { type: String, required: true },
  to: { type: String, required: true },
  timestamp: { type: Date, required: true },
  type: { type: String, required: true, default: 'text' },
  body: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['pending', 'sent', 'delivered', 'read'], 
    default: 'pending' 
  },
  userName: { type: String, default: 'Unknown User' },
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Create indexes for better query performance
messageSchema.index({ conversationId: 1, timestamp: 1 });
messageSchema.index({ messageId: 1 });

export const Message = model<IMessage>('processed_messages', messageSchema);
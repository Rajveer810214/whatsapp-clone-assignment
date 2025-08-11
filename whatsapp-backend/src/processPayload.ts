// src/processPayload.ts
import { Message } from './models.js';

// WhatsApp webhook payload types
interface WhatsAppMessage {
  id: string;
  from: string;
  to?: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
  image?: {
    caption?: string;
  };
  document?: {
    filename?: string;
  };
  video?: {
    caption?: string;
  };
}

interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

interface WhatsAppMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

interface WhatsAppStatus {
  id: string;
  meta_msg_id?: string;
  status: 'sent' | 'delivered' | 'read';
  timestamp: string;
  recipient_id: string;
}

interface WhatsAppValue {
  messaging_product?: string;
  metadata?: WhatsAppMetadata;
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
}

interface WebhookPayload {
  metaData?: {
    entry?: Array<{
      changes?: Array<{
        field: string;
        value: WhatsAppValue;
      }>;
    }>;
  };
}

// Function to process incoming webhook payload
export const processWebhookPayload = async (payload: WebhookPayload): Promise<void> => {
  try {
    const entry = payload.metaData?.entry?.[0];
    if (!entry) {
      console.log('No entry found in payload');
      return;
    }

    const changes = entry.changes?.[0];
    const value = changes?.value;

    if (!value) {
      console.log('No value found in payload');
      return;
    }

    if (value.messages) {
      await processMessage(value);
    } else if (value.statuses) {
      await processStatusUpdate(value);
    } else {
      console.log('Unknown payload type');
    }
  } catch (error) {
    console.error('Error processing webhook payload:', error);
    throw error;
  }
};

// Process new message
const processMessage = async (value: WhatsAppValue): Promise<void> => {
  try {
    const message = value.messages?.[0];
    const contact = value.contacts?.[0];
    const metadata = value.metadata;

    if (!message || !message.id) {
      console.log('Invalid message data');
      return;
    }

    // Check if message already exists to prevent duplicates
    const existingMessage = await Message.findOne({ messageId: message.id });
    if (existingMessage) {
      console.log(`Message ${message.id} already exists, skipping`);
      return;
    }

    // Determine conversation participants
    const businessNumber = metadata?.phone_number_id || metadata?.display_phone_number || '918329446654';
    const userNumber = message.from !== businessNumber ? message.from : message.to || '';
    const conversationId = `conv_${userNumber}`;

    // Determine if message is from business or user
    const isFromBusiness = message.from === businessNumber;
    const from = message.from;
    const to = isFromBusiness ? userNumber : businessNumber;

    // Extract message content based on type
    let messageBody = '';
    if (message.type === 'text') {
      messageBody = message.text?.body || '';
    } else if (message.type === 'image') {
      messageBody = message.image?.caption || '[Image]';
    } else if (message.type === 'document') {
      messageBody = message.document?.filename || '[Document]';
    } else if (message.type === 'audio') {
      messageBody = '[Voice Message]';
    } else if (message.type === 'video') {
      messageBody = message.video?.caption || '[Video]';
    } else {
      messageBody = `[${message.type.toUpperCase()}]`;
    }

    const newMessage = new Message({
      conversationId,
      messageId: message.id,
      from,
      to,
      timestamp: new Date(parseInt(message.timestamp) * 1000),
      type: message.type || 'text',
      body: messageBody,
      status: 'sent',
      userName: contact?.profile?.name || (isFromBusiness ? 'Business' : 'Unknown User'),
    });

    await newMessage.save();
    console.log(`✅ Inserted message: ${message.id} from ${newMessage.userName}`);
    console.log(`   Content: ${messageBody.substring(0, 50)}${messageBody.length > 50 ? '...' : ''}`);
  } catch (error) {
    console.error('Error processing message:', error);
    throw error;
  }
};

// Process status update
const processStatusUpdate = async (value: WhatsAppValue): Promise<void> => {
  try {
    const statusUpdate = value.statuses?.[0];
    
    if (!statusUpdate) {
      console.log('No status update found');
      return;
    }

    const messageId = statusUpdate.id || statusUpdate.meta_msg_id;
    if (!messageId) {
      console.log('No message ID found in status update');
      return;
    }

    // Validate status value
    const validStatuses: string[] = ['sent', 'delivered', 'read'];
    if (!validStatuses.includes(statusUpdate.status)) {
      console.log(`Invalid status: ${statusUpdate.status}`);
      return;
    }

    const updateResult = await Message.updateOne(
      { messageId },
      { 
        $set: { 
          status: statusUpdate.status,
          updatedAt: new Date()
        } 
      }
    );

    if (updateResult.matchedCount > 0) {
      console.log(`✅ Updated status for message ${messageId} to ${statusUpdate.status}`);
    } else {
      console.log(`⚠️  No message found to update for ${messageId}`);
      
      // Log available message IDs for debugging
      const recentMessages = await Message.find({}, { messageId: 1 }).limit(5).sort({ timestamp: -1 });
      console.log('Recent message IDs:', recentMessages.map(m => m.messageId));
    }
  } catch (error) {
    console.error('Error processing status update:', error);
    throw error;
  }
};

// Helper function to extract phone number from various formats
const extractPhoneNumber = (phoneNumber: string): string | null => {
  if (!phoneNumber) return null;
  
  // Remove any non-numeric characters except +
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');
  
  // Remove leading + if present
  return cleaned.startsWith('+') ? cleaned.substring(1) : cleaned;
};

// Helper function to determine conversation ID consistently
export const getConversationId = (userNumber: string, businessNumber: string): string => {
  const cleanUserNumber = extractPhoneNumber(userNumber);
  return `conv_${cleanUserNumber}`;
};

// Helper function to format timestamp for logging
const formatTimestamp = (timestamp: string): string => {
  return new Date(parseInt(timestamp) * 1000).toISOString();
};
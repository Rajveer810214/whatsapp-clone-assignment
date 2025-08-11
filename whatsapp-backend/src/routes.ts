// src/routes.ts - Updated with status update endpoint
import { Router, Request, Response } from 'express';
import { 
  getConversations, 
  getMessagesByConversation, 
  sendMessage, 
  getConversationStats, 
  updateMessageStatus 
} from './controllers.js';
import { processWebhookPayload } from './processPayload.js';

const router = Router();

// Webhook endpoint to receive payloads
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📥 Received webhook payload');
    await processWebhookPayload(req.body);
    res.status(200).json({ success: true, message: 'Payload processed successfully' });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({ success: false, error: 'Error processing payload' });
  }
});

// API endpoints for frontend
router.get('/conversations', getConversations);
router.get('/conversations/:conversationId/messages', getMessagesByConversation);
router.post('/messages', sendMessage);
router.put('/messages/:messageId/status', updateMessageStatus);
router.get('/stats', getConversationStats);

// Simulate status update endpoint (for demo purposes)
router.post('/simulate-status', async (req: Request, res: Response): Promise<void> => {
  const { messageId, status } = req.body;
  
  if (!messageId || !status) {
    res.status(400).json({ error: 'messageId and status are required' });
    return;
  }

  try {
    // Use the existing updateMessageStatus logic
    req.params.messageId = messageId;
    req.body.status = status;
    await updateMessageStatus(req, res);
  } catch (error) {
    console.error('❌ Error simulating status update:', error);
    res.status(500).json({ error: 'Failed to simulate status update' });
  }
});

// Health check endpoint
router.get('/health', (req: Request, res: Response): void => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;
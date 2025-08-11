// src/controllers.ts - Updated with WebSocket support
import { Request, Response } from 'express';
import { Message } from './models.js';

interface ConversationSummary {
  conversationId: string;
  userName: string;
  lastMessageBody: string;
  lastTimestamp: Date;
  messageCount: number;
  participants: string[];
}

interface MessageRequest {
  conversationId: string;
  from: string;
  to: string;
  body: string;
  userName?: string;
}

// Get all conversations grouped by conversationId
export const getConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const conversations = await Message.aggregate([
      {
        $sort: { timestamp: 1 } // Sort messages by timestamp
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $last: '$$ROOT' }, // Get the latest message
          messageCount: { $sum: 1 },
          participants: { $addToSet: '$userName' }, // Collect all unique userNames
          customerMessages: {
            $push: {
              $cond: [
                { $ne: ['$userName', 'Business'] }, // Exclude 'Business'
                { userName: '$userName', from: '$from' },
                null
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          conversationId: '$_id',
          lastMessageBody: '$lastMessage.body',
          lastTimestamp: '$lastMessage.timestamp',
          messageCount: '$messageCount',
          participants: '$participants',
          userName: {
            $let: {
              vars: {
                customer: {
                  $arrayElemAt: [
                    { $filter: { input: '$customerMessages', as: 'msg', cond: { $ne: ['$$msg', null] } } },
                    0
                  ]
                }
              },
              in: {
                $cond: {
                  if: { $eq: ['$$customer', null] },
                  then: { $concat: ['+', { $substrCP: ['$_id', 5, { $subtract: [ { $strLenCP: '$_id' }, 5 ] } ] } ] },
                  else: '$$customer.userName'
                }
              }
            }
          }
        }
      },
      {
        $sort: { lastTimestamp: -1 } // Sort conversations by last message time
      }
    ]);

    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

// Get messages for a specific conversation
export const getMessagesByConversation = async (req: Request, res: Response): Promise<void> => {
  const { conversationId } = req.params;
  
  if (!conversationId) {
    res.status(400).json({ error: 'Conversation ID is required' });
    return;
  }
  
  try {
    const messages = await Message.find({ conversationId })
      .sort({ timestamp: 1 })
      .lean(); // Use lean() for better performance
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Send a new message with WebSocket notification
export const sendMessage = async (req: Request<{}, {}, MessageRequest>, res: Response): Promise<void> => {
  const { conversationId, from, to, body, userName } = req.body;
  
  // Validate required fields
  if (!conversationId || !from || !to || !body) {
    res.status(400).json({ error: 'Missing required fields: conversationId, from, to, body' });
    return;
  }

  try {
    const newMessage = new Message({
      conversationId,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from,
      to,
      timestamp: new Date(),
      type: 'text',
      body: body.trim(),
      status: 'sent',
      userName: userName || 'Business',
    });

    const savedMessage = await newMessage.save();
    
    // Get WebSocket instance and emit new message
    const io = req.app.get('socketio');
    if (io) {
      io.to(conversationId).emit('new-message', savedMessage);
      console.log(`📡 Emitted new message to conversation: ${conversationId}`);
    }
    
    res.status(201).json(savedMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Get conversation statistics
export const getConversationStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await Message.aggregate([
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          totalConversations: { $addToSet: '$conversationId' },
          statusBreakdown: {
            $push: '$status'
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalMessages: 1,
          totalConversations: { $size: '$totalConversations' },
          statusBreakdown: 1
        }
      }
    ]);

    const result = stats[0] || { 
      totalMessages: 0, 
      totalConversations: 0, 
      statusBreakdown: [] 
    };

    res.json(result);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
};

// Update message status endpoint
export const updateMessageStatus = async (req: Request, res: Response): Promise<void> => {
  const { messageId } = req.params;
  const { status } = req.body;
  
  if (!messageId || !status) {
    res.status(400).json({ error: 'Message ID and status are required' });
    return;
  }

  const validStatuses = ['sent', 'delivered', 'read'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid status. Must be: sent, delivered, or read' });
    return;
  }

  try {
    const updatedMessage = await Message.findOneAndUpdate(
      { messageId },
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedMessage) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Emit status update via WebSocket
    const io = req.app.get('socketio');
    if (io) {
      io.to(updatedMessage.conversationId).emit('message-status-updated', {
        messageId,
        status,
        updatedAt: updatedMessage.updatedAt
      });
    }

    res.json(updatedMessage);
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({ error: 'Failed to update message status' });
  }
};
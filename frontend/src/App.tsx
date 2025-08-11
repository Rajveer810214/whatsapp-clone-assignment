// Updated frontend (WhatsAppWebClone.jsx) - Added phone number display in chat header and conversation list, fixed name display logic
import React, { useState, useEffect, useRef } from 'react';
import { Search, Phone, MoreVertical, Send, Smile, Paperclip, Mic, Check, CheckCheck, Clock } from 'lucide-react';

interface Message {
  _id: string;
  conversationId: string;
  messageId: string;
  from: string;
  to: string;
  timestamp: Date;
  type: string;
  body: string;
  status: 'pending' | 'sent' | 'delivered' | 'read';
  userName: string;
}

interface Conversation {
  conversationId: string;
  userName: string;
  lastMessageBody: string;
  lastTimestamp: Date;
  messageCount: number;
  participants: string[];
}

const WhatsAppWebClone = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle responsive design
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/conversations');
      const data = await response.json();
      console.log({data})
      setConversations(data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for selected conversation
  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`http://localhost:3000/api/conversations/${conversationId}/messages`);
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Send new message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    setSendingMessage(true);
    try {
      const selectedConv = conversations.find(c => c.conversationId === selectedConversation);
      const userNumber = selectedConv?.conversationId.replace('conv_', '') || '';
      
      const messageData = {
        conversationId: selectedConversation,
        from: '918329446654', // Business number
        to: userNumber,
        body: newMessage.trim(),
        userName: 'Business'
      };

      const response = await fetch('http://localhost:3000/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });

      if (response.ok) {
        const sentMessage = await response.json();
        setMessages(prev => [...prev, sentMessage]);
        setNewMessage('');
        // Update conversation list
        fetchConversations();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle Enter key to send message
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format timestamp
  const formatTime = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatLastSeen = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return formatTime(timestamp);
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Status indicator component
  const StatusIndicator = ({ status }: { status: string }) => {
    switch (status) {
      case 'sent':
        return <Check size={16} className="text-gray-400" />;
      case 'delivered':
        return <CheckCheck size={16} className="text-gray-400" />;
      case 'read':
        return <CheckCheck size={16} className="text-blue-400" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv =>
    conv.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessageBody.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  // Mobile view management
  const showChatList = !selectedConversation || !isMobile;
  const showChatArea = selectedConversation && (!isMobile || selectedConversation);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar - Chat List */}
      {showChatList && (
        <div className={`${isMobile ? 'w-full' : 'w-1/3 min-w-80'} bg-white border-r border-gray-200 flex flex-col`}>
          {/* Header */}
          <div className="bg-green-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">WhatsApp Business</h1>
              <div className="flex items-center space-x-2">
                <MoreVertical size={20} className="cursor-pointer hover:bg-green-700 rounded p-1" />
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading conversations...</div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {conversations.length === 0 ? 'No conversations yet' : 'No conversations match your search'}
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                return (
                  <div
                    key={conversation.conversationId}
                    onClick={() => setSelectedConversation(conversation.conversationId)}
                    className={`flex items-center p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedConversation === conversation.conversationId ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-white font-semibold mr-3 flex-shrink-0">
                      {conversation.userName.charAt(0).toUpperCase()}
                    </div>
                    
                    {/* Conversation Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900 truncate">{conversation.userName}</h3>
                         
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {formatLastSeen(conversation.lastTimestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {conversation.lastMessageBody}
                      </p>
                      {conversation.messageCount > 0 && (
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-400">
                            {conversation.messageCount} message{conversation.messageCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Chat Area */}
      {showChatArea ? (
        <div className={`${isMobile ? 'w-full' : 'flex-1'} flex flex-col bg-white`}>
          {/* Chat Header */}
          <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              {isMobile && (
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="mr-3 p-1 hover:bg-gray-200 rounded"
                >
                  ←
                </button>
              )}
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                {conversations.find(c => c.conversationId === selectedConversation)?.userName.charAt(0).toUpperCase()}
              </div>
              <div>
                {(() => {
                  const selectedConv = conversations.find(c => c.conversationId === selectedConversation);
                  const userName = selectedConv?.userName || 'Unknown User';
                  
                  const userNumber = selectedConv?.conversationId.replace('conv_', '') || '';
                  return (
                    <>
                      <h2 className="font-semibold text-gray-900">{userName}</h2>
                      <p className="text-sm text-gray-500">
                        {userName.startsWith('+') 
                          ? `${messages.length} messages` 
                          : `+${userNumber}`}
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Phone size={20} className="text-gray-600 cursor-pointer hover:bg-gray-200 rounded p-1" />
              <MoreVertical size={20} className="text-gray-600 cursor-pointer hover:bg-gray-200 rounded p-1" />
            </div>
          </div>

          {/* Messages Area */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-2"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grain' width='100' height='100' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='10' cy='10' r='0.5' fill='%23e5e7eb' opacity='0.1'/%3E%3Ccircle cx='30' cy='25' r='0.5' fill='%23e5e7eb' opacity='0.1'/%3E%3Ccircle cx='50' cy='40' r='0.5' fill='%23e5e7eb' opacity='0.1'/%3E%3Ccircle cx='70' cy='55' r='0.5' fill='%23e5e7eb' opacity='0.1'/%3E%3Ccircle cx='90' cy='70' r='0.5' fill='%23e5e7eb' opacity='0.1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grain)'/%3E%3C/svg%3E")`,
              backgroundColor: '#f0f2f5'
            }}
          >
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    💬
                  </div>
                  <p>No messages in this conversation yet</p>
                  <p className="text-sm mt-2">Send a message to get started</p>
                </div>
              </div>
            ) : (
              messages.map((message) => {
                const isFromBusiness = message.userName === 'Business';
                return (
                  <div
                    key={message._id}
                    className={`flex ${isFromBusiness ? 'justify-end' : 'justify-start'} mb-2`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm ${
                        isFromBusiness
                          ? 'bg-green-500 text-white'
                          : 'bg-white text-gray-900'
                      }`}
                    >
                      <p className="text-sm break-words">{message.body}</p>
                      <div className={`flex items-center justify-end mt-1 space-x-1 ${isFromBusiness ? 'text-green-100' : 'text-gray-500'}`}>
                        <span className="text-xs">
                          {formatTime(message.timestamp)}
                        </span>
                        {isFromBusiness && (
                          <StatusIndicator status={message.status} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Area */}
          <div className="bg-gray-50 p-4 border-t border-gray-200">
            <div className="flex items-end space-x-2">
              <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                <Smile size={20} />
              </button>
              <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                <Paperclip size={20} />
              </button>
              
              <div className="flex-1 relative">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  rows={1}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  style={{ minHeight: '40px', maxHeight: '120px' }}
                />
              </div>

              {newMessage.trim() ? (
                <button
                  onClick={sendMessage}
                  disabled={sendingMessage}
                  className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              ) : (
                <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                  <Mic size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Welcome Screen for Desktop
        !isMobile && (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="text-4xl">💬</div>
              </div>
              <h2 className="text-2xl font-light text-gray-600 mb-2">WhatsApp Business Web</h2>
              <p className="text-gray-500 mb-4">Send and receive messages without keeping your phone online.</p>
              <p className="text-sm text-gray-400">
                Select a conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            <span className="text-gray-700">Loading conversations...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppWebClone;
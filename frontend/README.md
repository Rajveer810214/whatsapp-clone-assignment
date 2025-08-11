# WhatsApp Web Clone - Frontend

## Overview
This is the frontend for a WhatsApp Web Clone, built with React, TypeScript, and Tailwind CSS. It provides a responsive UI for a WhatsApp-like messaging interface, displaying conversations, messages, and real-time status updates (e.g., 'sent', 'delivered', 'read') using WebSocket (Socket.IO). The frontend communicates with a Node.js backend to fetch conversations and messages, send messages, and receive real-time updates.

## Features

- **Responsive Design:** Adapts to desktop and mobile screens with a sidebar for conversations and a chat area.
- **Real-Time Updates:** Uses Socket.IO to receive new messages and status updates (e.g., single tick for 'sent', double ticks for 'delivered'/'read') without manual refresh.
- **Message Sending:** Send text messages to selected conversations.
- **Search Functionality:** Filter conversations by user name or last message content.
- **Status Indicators:** Displays message status with icons:
  - ⏳ Clock for 'pending'
  - ✓ Single check for 'sent'
  - ✓✓ Double checks for 'delivered'
  - ✓✓ (blue) Double checks for 'read'

## Prerequisites
- Node.js (v16 or higher)
- npm (v8 or higher)
- Backend server running at `http://localhost:3000` (see Backend README for setup)
- Internet connection for CDN dependencies (lucide-react, socket.io-client)

## Installation

### Clone the Repository (if not already cloned)
```bash
git clone <repository-url>
cd whatsapp-web-clone/frontend
```

### Install Dependencies
```bash
npm install
```
This installs required packages, including:
- react, react-dom
- lucide-react for icons
- socket.io-client for WebSocket communication
- tailwindcss for styling

## Running Locally

### Start the Development Server
```bash
npm start
```
This runs the app in development mode, typically at `http://localhost:3000`.

### Access the App
Open `http://localhost:3000` in your browser. Ensure the backend is running at `http://localhost:3000` for API and WebSocket connectivity.

### Test Real-Time Features
1. Select a conversation from the sidebar.
2. Send a message (appears with a single tick for 'sent').
3. Use the backend to process a status update (e.g., via `processWebhookFiles.ts` with a status payload) to see the status change to 'delivered' (double gray ticks) or 'read' (double blue ticks) in real-time.

## Project Structure
```
src/WhatsAppWebClone.tsx  # Main React component handling UI, state, API calls, and WebSocket integration
src/index.tsx             # Entry point for the React application
public/                   # Static assets (e.g., favicon, index.html)
tailwind.config.js        # Tailwind CSS configuration
```

## Deployment

### To deploy the frontend to Vercel:

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Deploy**
```bash
vercel
```
Follow the prompts to configure the project. Ensure the backend is deployed (e.g., on Render) and update the API/WebSocket URL in `WhatsAppWebClone.tsx`:
```javascript
const socket = io('https://your-backend-url.com');
const response = await fetch('https://your-backend-url.com/api/...');
```

3. **Environment Variables**
No environment variables are required for the frontend, but ensure the backend URL is accessible.

## WebSocket Integration

The frontend connects to the backend's Socket.IO server at `http://localhost:3000` (or the deployed URL).

### Listens for:
- **newMessage:** Adds new messages to the current conversation and refreshes the conversation list.
- **statusUpdate:** Updates message status in real-time (e.g., from 'sent' to 'delivered' or 'read').

#### Example:
```javascript
socket.on('statusUpdate', (update) => {
  setMessages(prev => prev.map(msg => 
    msg.messageId === update.messageId ? { ...msg, status: update.status } : msg
  ));
});
```

## Testing

### Manual Testing
- Send messages and verify they appear with a single tick.
- Process a status update payload (e.g., via `processWebhookFiles.ts` in the backend) to confirm real-time status changes to 'delivered' or 'read'.

### Debugging
- Check browser console for WebSocket connection logs and event data.
- Ensure the backend is running and emitting `newMessage` and `statusUpdate` events.

## Known Issues
- If status updates don’t reflect (e.g., stuck at single tick), verify:
  - The `messageId` in the status update payload matches the message in the database.
  - The WebSocket connection is active (check `console.log('🔗 Connected to WebSocket')`).
- Mobile view may require clicking the back button to return to the conversation list.

## Future Improvements
- Add support for media messages (images, documents) in the UI.
- Implement message deletion or editing.
- Add typing indicators via WebSocket.

  # WhatsApp Web Clone - Backend

## Overview
This is the backend for a WhatsApp Web Clone, built with Node.js, Express, MongoDB, and Socket.IO. It handles message storage, conversation aggregation, webhook payload processing, and real-time updates for message statuses (e.g., 'sent', 'delivered', 'read'). The backend processes WhatsApp webhook payloads from files or a webhook endpoint and emits real-time events to the frontend via Socket.IO.

## Features

### REST API:
- **GET** `/api/conversations`: List all conversations with the latest message and metadata.
- **GET** `/api/conversations/:conversationId/messages`: Get messages for a specific conversation.
- **POST** `/api/messages`: Send a new message.
- **GET** `/api/stats`: Get conversation and message statistics.

### Webhook Processing
Processes WhatsApp webhook payloads (messages and status updates) from files or a `/webhook` endpoint.

### Real-Time Updates
Uses Socket.IO to emit `newMessage` and `statusUpdate` events for real-time message and status updates.

### MongoDB Integration
Stores messages with fields for conversationId, messageId, status, etc.

## Prerequisites
- Node.js (v16 or higher)
- npm (v8 or higher)
- MongoDB (local or MongoDB Atlas)
- Access to sample webhook payloads (e.g., from provided Google Drive link)

## Installation

### Clone the Repository (if not already cloned)
```bash
git clone <repository-url>
cd whatsapp-web-clone/backend
```

### Install Dependencies
```bash
npm install
```
This installs required packages, including:
- express, cors
- mongoose for MongoDB
- socket.io for WebSocket
- dotenv for environment variables

### Set Up Environment Variables
Create a `.env` file in the backend directory:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/whatsapp_clone
```
Replace `MONGODB_URI` with your MongoDB connection string (e.g., MongoDB Atlas URI).

## Running Locally

### Start MongoDB
Ensure MongoDB is running locally (`mongod`) or use a cloud instance like MongoDB Atlas.

### Process Webhook Files (if using sample payloads)
Place webhook JSON files in the `webhook_files` directory and run:
```bash
node processWebhookFiles.js
```
This populates the database with messages and status updates.

### Start the Server
```bash
npm start
```
This runs the server at `http://localhost:3000`. The API and WebSocket server are available at this URL.

### Test WebSocket
- Connect the frontend (see Frontend README) to `http://localhost:3000`.
- Send a message via the frontend and verify it appears with 'sent' status.
- Process a status update payload (e.g., via `processWebhookFiles.js`) to confirm real-time updates to 'delivered' or 'read'.

## Project Structure
```
src/index.ts               # Entry point, sets up Express, Socket.IO, and MongoDB
src/controllers.ts         # API route handlers for conversations, messages, and stats
src/processPayload.ts       # Processes webhook payloads (messages and status updates)
src/processWebhookFiles.ts  # Reads and processes webhook JSON files from webhook_files
src/models.ts              # Mongoose schema for messages
src/db.ts                  # MongoDB connection setup
src/routes.ts              # Express routes configuration
webhook_files/             # Directory for sample webhook payloads
```

## Deployment

### To deploy the backend to Render:

1. **Push to GitHub**  
   Ensure your backend code is in a GitHub repository.

2. **Create a Render Web Service**  
   In Render, create a new Web Service and connect your GitHub repository.  
   Set the runtime to Node and configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

3. **Add environment variables** in Render’s dashboard:
```env
PORT=3000
MONGODB_URI=<your-mongodb-uri>
```

4. **Deploy**  
   Trigger a deployment in Render. Note the deployed URL (e.g., `https://your-backend.onrender.com`).

5. **Update Frontend**  
   Update the frontend’s API and WebSocket URLs to use the deployed backend URL (e.g., `wss://your-backend.onrender.com`).

6. **Webhook Endpoint**  
   Expose the `/webhook` endpoint for real-time payloads using ngrok:
   ```bash
   ngrok http 3000
   ```
   Use the ngrok URL (e.g., `https://<ngrok-id>.ngrok.io/webhook`) to receive WhatsApp webhook payloads.

## WebSocket Integration

### Setup
Socket.IO server is initialized in `index.ts` and listens on the same port as the Express server.

### Events
- **newMessage:** Emitted when a new message is sent (`controllers.ts`) or processed (`processPayload.ts`).
- **statusUpdate:** Emitted when a message status is updated (`processPayload.ts`), including `messageId`, `status`, and `conversationId`.

#### Example:
```javascript
io.emit('statusUpdate', {
  messageId: messageId,
  status: statusUpdate.status,
  conversationId: `conv_${statusUpdate.recipient_id}`
});
```

## Testing

### API Testing
Use Postman to test endpoints:
```http
GET http://localhost:3000/api/conversations
GET http://localhost:3000/api/conversations/conv_<phone_number>/messages
POST http://localhost:3000/api/messages
```
Body example for `POST /api/messages`:
```json
{
  "conversationId": "conv_1234567890",
  "message": "Hello!"
}
```
Send a status update to:
```http
POST http://localhost:3000/webhook
```
With payload:
```json
{
  "metaData": {
    "entry": [{
      "changes": [{
        "value": {
          "statuses": [{
            "id": "<message_id>",
            "status": "delivered",
            "timestamp": "1697051234",
            "recipient_id": "<phone_number>"
          }]
        }
      }]
    }]
  }
}
```

### WebSocket Testing
- Connect the frontend and send a message to verify `newMessage` event.
- Process a status update file to verify `statusUpdate` event updates the message status in real-time.

### Database Testing
Check MongoDB (`processed_messages` collection) to confirm messages and statuses:
```javascript
db.processed_messages.find(
  { conversationId: "conv_<phone_number>" },
  { messageId: 1, status: 1 }
);
```

## Known Issues
- **Status Update Failures:** If status updates don’t apply, verify the `messageId` in the payload matches a message in the database.
- **WebSocket Connection:** Ensure the frontend and backend URLs match (e.g., both use `http://localhost:3000` locally).
- **Webhook Files:** Ensure sample payloads in `webhook_files` include status updates for testing 'delivered' and 'read' statuses.

## Future Improvements
- Add authentication for the API and WebSocket.
- Support media message processing (images, documents).
- Implement rate limiting for the webhook endpoint.
- Add error logging to a file or service.

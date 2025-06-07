require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { xHubSignatureMiddleware } = require('x-hub-signature-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_SECRET = process.env.META_APP_SECRET;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

// Middleware for raw body parsing
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Signature verification middleware
app.use(xHubSignatureMiddleware({
  algorithm: 'sha256',
  secret: APP_SECRET,
  require: true,
  getRawBody: req => req.rawBody
}));

// Webhook verification endpoint
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// Webhook event handling
app.post('/webhook', (req, res) => {
  const body = req.body;

  if (body.object === 'instagram') {
    body.entry.forEach(entry => {
      if (entry.changes) {
        entry.changes.forEach(change => {
          switch (change.field) {
            case 'mention':
              handleInstagramMention(change.value);
              break;
            case 'comments':
              handleInstagramComment(change.value);
              break;
            case 'messages':
              handleInstagramMessage(change.value);
              break;
            default:
              console.log('Unhandled Instagram field:', change.field);
          }
        });
      }
    });
  } else {
    console.log('Unhandled webhook object:', body.object);
  }

  res.sendStatus(200);
});

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Meta Webhook Server is running!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

// Handler functions
function handleInstagramMention(data) {
  console.log('Instagram Mention:', data);
  // Implement your logic to respond to mentions
}

function handleInstagramComment(data) {
  console.log('Instagram Comment:', data);
  // Implement your logic to respond to comments
}

function handleInstagramMessage(data) {
  console.log('Instagram Message:', data);
  // Implement your logic to respond to messages
}
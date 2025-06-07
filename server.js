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

// Create an instance of the xHubSignatureMiddleware
// This will be applied specifically to the POST /webhook route
const verifyXHubSignature = xHubSignatureMiddleware({
  algorithm: 'sha256',
  secret: APP_SECRET,
  require: true, // This means if the signature is missing or invalid, it will throw an error.
                 // Set to false if you want to handle req.isXHubValid() manually.
  getRawBody: req => {
    // This function tells the middleware how to get the raw body.
    // It should return the same buffer that bodyParser stored.
    return req.rawBody;
  }
});

// Webhook verification endpoint GET
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

// Webhook event handling POST
// Apply the signature verification middleware ONLY to this route
app.post('/webhook', verifyXHubSignature, (req, res) => {
  console.log("Received POST /webhook event. Signature verified.");
  const body = req.body;

  if (body.object === 'instagram') {
    body.entry.forEach(entry => {
      if (entry.changes) {
        entry.changes.forEach(change => {
          switch (change.field) {
            case 'mentions':
              handleInstagramMention(change.value);
              break;
            case 'comments':
              handleInstagramComment(change.value);
              break;
            case 'messages':
              handleInstagramMessage(change.value);
            case 'message_reactions':
              handleInstagramMessageReaction(change.value);
            case 'messaging_postbacks':
              handleInstagramMessagingPostback(change.value);
            case 'messaging_seen':
              handleInstagramMessagingSeen(change.value);
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
  // console.log('Instagram Mention:', data);
  // Implement your logic to respond to mentions
  media_id = data.media_id;
  comment_id = data.comment_id;
}

function handleInstagramComment(data) {
  console.log('Instagram Comment:', data);
  // Implement your logic to respond to comments
}

function handleInstagramMessage(data) {
  console.log('Instagram Message:', data);
  // Implement your logic to respond to messages
}

function handleInstagramMessageReaction(data) {
  console.log('Instagram Message Reaction:', data);
  // Implement your logic to handle message reactions
}

function handleInstagramMessagingPostback(data) {
  console.log('Instagram Messaging Postback:', data);
  // Implement your logic to handle messaging postbacks
}

function handleInstagramMessagingSeen(data) {
  console.log('Instagram Messaging Seen:', data);
  // Implement your logic to handle messaging seen
}
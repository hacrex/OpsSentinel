const express = require('express');
const cors = require('cors');
const db = require('./db');
const { verifySignature, handleWebhook } = require('./webhook');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());

// Capture raw body for webhook verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/webhook', verifySignature, handleWebhook);

app.get('/events', (req, res) => {
  db.all('SELECT * FROM events ORDER BY created_at DESC LIMIT 100', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/auth/github', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'No code provided' });

  try {
    const response = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code
    }, {
      headers: { Accept: 'application/json' }
    });

    const { access_token } = response.data;
    if (access_token) {
      res.json({ token: access_token });
    } else {
      res.status(400).json({ error: 'Failed to retrieve access token' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Auth failed' });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});

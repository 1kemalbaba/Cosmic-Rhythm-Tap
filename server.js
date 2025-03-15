const express = require('express');
const Database = require("@replit/database");
const db = new Database();
const app = express();

app.use(express.json());
app.use(express.static('./'));

app.post('/scores', async (req, res) => {
  try {
    const scores = await db.get('scores') || [];
    if (!req.body.name || !req.body.score) {
      return res.status(400).json({ error: 'Name and score required' });
    }
    scores.push(req.body);
    scores.sort((a, b) => b.score - a.score);
    scores.splice(10);
    await db.set('scores', scores);
    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/scores', async (req, res) => {
  try {
    const scores = await db.get('scores') || [];
    res.json(scores);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on port 3000');
});

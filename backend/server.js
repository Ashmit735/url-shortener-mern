require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { nanoid } = require('nanoid');
const { Url, Click } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

const createUrlLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later.' }
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

app.post('/api/urls', createUrlLimiter, async (req, res) => {
  try {
    const { originalUrl, customAlias } = req.body;
    if (!originalUrl || (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://'))) {
      return res.status(400).json({ error: 'Invalid URL. Must start with http:// or https://' });
    }

    let shortCode;
    if (customAlias) {
      if (!/^[a-zA-Z0-9_-]{3,20}$/.test(customAlias)) {
        return res.status(400).json({ error: 'Custom alias must be 3-20 alphanumeric characters, hyphens, or underscores' });
      }
      shortCode = customAlias;
    } else {
      shortCode = nanoid(6);
    }

    const newUrl = new Url({ shortCode, originalUrl });
    await newUrl.save();
    return res.status(201).json(newUrl);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Short code already exists' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/urls', async (req, res) => {
  try {
    const urls = await Url.find().sort({ createdAt: -1 });
    res.json(urls);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/urls/:id/analytics', async (req, res) => {
  try {
    const url = await Url.findById(req.params.id);
    if (!url) {
      return res.status(404).json({ error: 'URL not found' });
    }
    const clicks = await Click.find({ urlId: url._id }).sort({ timestamp: -1 }).limit(20);
    res.json({ url, clicks });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    const url = await Url.findOneAndUpdate(
      { shortCode },
      { $inc: { totalClicks: 1 } },
      { new: true }
    );
    if (!url) {
      return res.status(404).send('URL not found');
    }
    const userAgent = req.headers['user-agent'] || 'Unknown';
    await Click.create({ urlId: url._id, userAgent });
    return res.redirect(302, url.originalUrl);
  } catch (error) {
    return res.status(500).send('Internal server error');
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

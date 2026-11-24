const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
  shortCode: { type: String, required: true, unique: true, index: true },
  originalUrl: { type: String, required: true },
  totalClicks: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const clickSchema = new mongoose.Schema({
  urlId: { type: mongoose.Schema.Types.ObjectId, ref: 'Url', required: true, index: true },
  timestamp: { type: Date, default: Date.now },
  userAgent: { type: String, default: 'Unknown' }
});

const Url = mongoose.model('Url', urlSchema);
const Click = mongoose.model('Click', clickSchema);

module.exports = { Url, Click };

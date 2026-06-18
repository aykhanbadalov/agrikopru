const express = require('express');
const cors = require('cors');
const errorHandler    = require('./middleware/errorHandler');
const healthRouter    = require('./routes/health');
const scoreRouter     = require('./routes/score');
const farmersRouter   = require('./routes/farmers');
const contractsRouter = require('./routes/contracts');

const app = express();
app.use(cors()); // dev: * — prodda origin məhdudlaşdır
app.use(express.json());

app.use('/health',        healthRouter);
app.use('/api/score',     scoreRouter);
app.use('/api/farmers',   farmersRouter);
app.use('/api/contracts', contractsRouter);

app.use(errorHandler);

module.exports = app;

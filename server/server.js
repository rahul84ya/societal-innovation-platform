const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const port = Number.parseInt(process.env.PORT, 10) || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/problems', require('./routes/problemRoutes'));

app.get('/', (req, res) => {
  res.json({ message: 'API running successfully.' });
});

app.get('/api/health', async (request, response) => {
  try {
    const [reportedQueue, openResearchQueue, fundsReleased] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total_reports FROM problems WHERE problem_status = 'reported';"),
      pool.query("SELECT COUNT(*) AS total_open FROM problems WHERE problem_status = 'open_for_research';"),
      pool.query("SELECT COALESCE(SUM(amount_released), 0) AS total_funds FROM financial_ledger;"),
    ]);

    return response.status(200).json({
      status: 'ok',
      database: 'connected',
      telemetry: {
        reported_queue_count: Number(reportedQueue.rows[0].total_reports || 0),
        open_research_count: Number(openResearchQueue.rows[0].total_open || 0),
        total_funds_released: Number(fundsReleased.rows[0].total_funds || 0),
      },
    });
  } catch (error) {
    console.error('Health check database query failed:', error);

    return response.status(503).json({
      status: 'error',
      database: 'unavailable',
      telemetry: null,
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

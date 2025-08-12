import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Finance Tracker Backend API',
    version: '1.0.0',
    endpoints: [
      'GET /health - Health check',
      'GET /api/transactions - Get all transactions',
      'POST /api/transactions - Create transaction',
      'POST /api/income - Create income record',
      'POST /api/insights - Get financial insights'
    ]
  });
});

app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: { category: true, user: true },
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const { amount, categoryId, description, userId } = req.body;
    const transaction = await prisma.transaction.create({
      data: {
        amount,
        categoryId,
        description,
        userId,
      },
    });
    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

app.post('/api/income', async (req, res) => {
  const { amount, source, date, userId } = req.body;
  try {
    const income = await prisma.income.create({
      data: { amount, source, date: new Date(date), userId },
    });
    res.json(income);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save income' });
  }
});

// Define Alpha Vantage response interface
interface AlphaVantageResponse {
  'Monthly Time Series': {
    [date: string]: {
      '1. open': string;
      '2. high': string;
      '3. low': string;
      '4. close': string;
      '5. volume': string;
    };
  };
}

app.post('/api/insights', async (req, res) => {
  const { income, expenses } = req.body;
  try {
    // Local logic for budget recommendations
    const surplus = income - expenses;
    const suggestions = [];
    if (surplus > 0) {
      suggestions.push(`Save ${Math.round(surplus * 0.2)} monthly for an emergency fund.`);
      if (expenses / income > 0.7) {
        suggestions.push('Reduce discretionary spending by 15% to increase savings.');
      }
    } else {
      suggestions.push('Expenses exceed income. Cut non-essential spending by 10%.');
    }

    // Alpha Vantage for investment insights
    const response = await axios.get<AlphaVantageResponse>('https://www.alphavantage.co/query', {
      params: {
        function: 'TIME_SERIES_MONTHLY',
        symbol: 'SPY',
        apikey: process.env.ALPHA_VANTAGE_API_KEY,
      },
    });
    const data = response.data['Monthly Time Series'];
    const latestPrice = Object.values(data)[0]?.['4. close'] || 'N/A';
    suggestions.push(`Consider investing in low-cost ETFs like SPY (current price: $${latestPrice}).`);

    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
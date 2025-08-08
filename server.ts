import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

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

app.listen(3001, () => console.log('Server running on port 3001'));

import axios from 'axios';

app.post('/api/insights', async (req, res) => {
  const { income, expenses } = req.body;
  try {
    // Local logic for budget recommendations
    const surplus = income - expenses;
    let suggestions = [];
    if (surplus > 0) {
      suggestions.push(`Save ${Math.round(surplus * 0.2)} monthly for an emergency fund.`);
      if (expenses / income > 0.7) {
        suggestions.push('Reduce discretionary spending by 15% to increase savings.');
      }
    } else {
      suggestions.push('Expenses exceed income. Cut non-essential spending by 10%.');
    }

    // Alpha Vantage for investment insights
    const response = await axios.get(
      'https://www.alphavantage.co/query',
      {
        params: {
          function: 'TIME_SERIES_MONTHLY',
          symbol: 'SPY', // Example: S&P 500 ETF
          apikey: process.env.ALPHA_VANTAGE_API_KEY,
        },
      }
    );
    const data = response.data['Monthly Time Series'] as Record<string, { [key: string]: string }>;
    const latestPrice = Object.values(data)[0]['4. close'];
    suggestions.push(`Consider investing in low-cost ETFs like SPY (current price: $${latestPrice}).`);

    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch insights' });
  }
});
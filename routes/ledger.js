import express from 'express';
import { v4 as uuid } from 'uuid';
import { ledgerDB } from '../db.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * DASHBOARD
 * Default: Shows only today's entries.
 * Toggle: Can show 'all' via ?view=all
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    await ledgerDB.read();
    const user = req.session.user;
    const view = req.query.view || 'today'; // Default to today

    let entries = (ledgerDB.data?.entries || []).filter(e => e.userId === user.id);

    if (view === 'today') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      
      entries = entries.filter(e => new Date(e.date) >= startOfToday);
    }

    res.render('dashboard', {
      entries: entries.sort((a, b) => new Date(b.date) - new Date(a.date)), // Newest first
      user,
      currentView: view
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).send("Error loading dashboard");
  }
});

/**
 * ADD ENTRY
 */
router.get('/add', requireAuth, (req, res) => {
  res.render('add-entry', { user: req.session.user });
});

router.post('/add', requireAuth, async (req, res) => {
  try {
    const { type, amount, description } = req.body;
    await ledgerDB.read();

    ledgerDB.data ||= { entries: [] };
    
    const newEntry = {
      id: uuid(),
      userId: req.session.user.id,
      type, 
      amount: parseFloat(amount) || 0,
      description: description || 'No description',
      date: new Date().toISOString()
    };

    ledgerDB.data.entries.push(newEntry);
    await ledgerDB.write();
    
    res.redirect('/ledger/dashboard');
  } catch (error) {
    console.error("Add Entry Error:", error);
    res.status(500).send("Database Write Error");
  }
});

/**
 * INCOME STATEMENT / SUMMARY
 * Supports ranges: weekly, monthly, annual, all
 */
router.get('/income-statement', requireAuth, async (req, res) => {
  try {
    await ledgerDB.read();
    const user = req.session.user;
    const range = req.query.range || 'monthly'; // Default to monthly summary

    let entries = (ledgerDB.data?.entries || []).filter(e => e.userId === user.id);

    // Date Filtering Logic
    if (range !== 'all') {
      const cutoff = new Date();
      if (range === 'weekly') cutoff.setDate(cutoff.getDate() - 7);
      else if (range === 'monthly') cutoff.setMonth(cutoff.getMonth() - 1);
      else if (range === 'annual') cutoff.setFullYear(cutoff.getFullYear() - 1);
      
      entries = entries.filter(e => new Date(e.date) >= cutoff);
    }

    // Calculations
    let totals = { income: 0, expense: 0, purchase: 0, drawings: 0 };

    entries.forEach(entry => {
      const amt = Number(entry.amount) || 0;
      if (entry.type === 'income') totals.income += amt;
      if (entry.type === 'expense') totals.expense += amt;
      if (entry.type === 'purchase') {
        totals.purchase += amt;
        totals.expense += amt; // COGS logic
      }
      if (entry.type === 'drawings') totals.drawings += amt;
    });

    const netProfit = totals.income - totals.expense;

    res.render('income-statement', {
      user,
      entries,
      totals,
      netProfit,
      currentRange: range
    });
  } catch (error) {
    console.error("Statement Error:", error);
    res.status(500).send("Error generating summary");
  }
});

export default router;
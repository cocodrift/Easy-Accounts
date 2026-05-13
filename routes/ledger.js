import express from 'express';
import { v4 as uuid } from 'uuid';
// Ensure these paths match your actual folder names exactly (case-sensitive!)
import { ledgerDB } from '../db.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * DASHBOARD (USER ONLY)
 * Displays all entries belonging to the logged-in user.
 */
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    await ledgerDB.read();
    
    // Safety check: ensure session user exists
    const user = req.session?.user;
    if (!user) return res.redirect('/login');

    const entries = (ledgerDB.data?.entries || []).filter(e => e.userId === user.id);

    res.render('dashboard', {
      entries,
      user
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

/**
 * ADD ENTRY PAGE
 */
router.get('/add', requireAuth, (req, res) => {
  res.render('add-entry', { user: req.session.user });
});

/**
 * PROCESS ADD ENTRY
 */
router.post('/add', requireAuth, async (req, res) => {
  try {
    const { type, amount, description } = req.body;
    await ledgerDB.read();

    // Initialize entries array if it doesn't exist
    if (!ledgerDB.data.entries) ledgerDB.data.entries = [];

    const newEntry = {
      id: uuid(),
      userId: req.session.user.id,
      type, // income | expense | purchase | drawings
      amount: parseFloat(amount) || 0,
      description: description || 'No description',
      date: new Date().toISOString()
    };

    ledgerDB.data.entries.push(newEntry);
    await ledgerDB.write();
    
    res.redirect('/ledger/dashboard');
  } catch (error) {
    console.error("Add Entry Error:", error);
    res.status(500).send("Error saving entry");
  }
});

/**
 * INCOME STATEMENT (USER ONLY)
 * Calculates Profit & Loss based on entry types.
 */
router.get('/income-statement', requireAuth, async (req, res) => {
  try {
    await ledgerDB.read();

    const userId = req.session.user.id;
    const entries = (ledgerDB.data?.entries || []).filter(e => e.userId === userId);

    let totalIncome = 0;
    let totalExpenses = 0;
    let totalPurchases = 0;
    let totalDrawings = 0;

    for (const entry of entries) {
      const amt = Number(entry.amount) || 0;

      switch (entry.type) {
        case 'income':
          totalIncome += amt;
          break;
        case 'expense':
          totalExpenses += amt;
          break;
        case 'purchase':
          totalPurchases += amt;
          totalExpenses += amt; // Purchases are costs of goods sold/expenses
          break;
        case 'drawings':
          totalDrawings += amt; // Cash taken out, doesn't reduce profit
          break;
      }
    }

    const netProfit = totalIncome - totalExpenses;

    res.render('income-statement', {
      user: req.session.user,
      entries,
      totalIncome,
      totalExpenses,
      totalPurchases,
      totalDrawings,
      netProfit
    });
  } catch (error) {
    console.error("Income Statement Error:", error);
    res.status(500).send("Error generating statement");
  }
});

export default router;

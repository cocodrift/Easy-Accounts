import express from 'express'
import { ledgerDB } from '../db.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { v4 as uuid } from 'uuid'

const router = express.Router()

/* ===============================
   DASHBOARD (USER ONLY)
================================ */
router.get('/dashboard', requireAuth, async (req, res) => {
  await ledgerDB.read()

  const userId = req.session.user.id

  const entries = ledgerDB.data.entries.filter(e => e.userId === userId)

  res.render('dashboard', {
    entries,
    user: req.session.user
  })
})

router.get('/add', requireAuth, (req, res) => {
  res.render('add-entry', { user: req.session.user })
})

router.post('/add', requireAuth, async (req, res) => {
  const { type, amount, description } = req.body

  await ledgerDB.read()

  ledgerDB.data.entries.push({
    id: uuid(),
    userId: req.session.user.id,
    type, // income | expense | purchase | drawings
    amount: Number(amount),
    description,
    date: new Date().toISOString()
  })

  await ledgerDB.write()
  res.redirect('/ledger/dashboard')
})

/* ===============================
   INCOME STATEMENT (USER ONLY)
================================ */
router.get('/income-statement', requireAuth, async (req, res) => {
  await ledgerDB.read()

  const userId = req.session.user.id
  const entries = ledgerDB.data.entries.filter(e => e.userId === userId)

  let totalIncome = 0
  let totalExpenses = 0
  let totalPurchases = 0
  let totalDrawings = 0

  for (const entry of entries) {
    const amt = Number(entry.amount) || 0

    if (entry.type === 'income') totalIncome += amt

    if (entry.type === 'expense') totalExpenses += amt

    if (entry.type === 'purchase') {
      totalPurchases += amt
      totalExpenses += amt // purchases included in expenses (simple model)
    }

    if (entry.type === 'drawings') {
      totalDrawings += amt // not part of profit
    }
  }

  const netProfit = totalIncome - totalExpenses

  res.render('income-statement', {
    user: req.session.user,
    entries,
    totalIncome,
    totalExpenses,
    totalPurchases,
    totalDrawings,
    netProfit
  })
})

export default router


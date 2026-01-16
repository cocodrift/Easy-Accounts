import express from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { usersDB } from '../db.js'

const router = express.Router()

router.get('/register', (req, res) => res.render('register'))
router.get('/login', (req, res) => res.render('login'))

router.post('/register', async (req, res) => {
  const { username, password } = req.body

  await usersDB.read()
  const exists = usersDB.data.users.find(u => u.username === username)
  if (exists) return res.status(400).send('Username already exists')

  const passwordHash = await bcrypt.hash(password, 10)

  usersDB.data.users.push({
    id: uuid(),
    username,
    passwordHash,
    createdAt: new Date().toISOString()
  })

  await usersDB.write()
  res.redirect('/auth/login')
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body

  await usersDB.read()
  const user = usersDB.data.users.find(u => u.username === username)
  if (!user) return res.status(400).send('Invalid username or password')

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(400).send('Invalid username or password')

  req.session.user = { id: user.id, username: user.username }
  res.redirect('/ledger/dashboard')
})

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/auth/login'))
})

export default router


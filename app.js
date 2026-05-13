import express from 'express'
import session from 'express-session'
import path from 'path'
import { fileURLToPath } from 'url'

import { initDB } from './db.js'
import authRoutes from './routes/auth.js'
import ledgerRoutes from './routes/ledger.js'

const app = express()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

await initDB()

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.use(express.static(path.join(__dirname, 'public')))

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use(
  session({
    secret: 'change_this_to_a_long_random_secret',
    resave: false,
    saveUninitialized: false
  })
)

app.get('/', (req, res) => {
  if (req.session?.user?.id) return res.redirect('/ledger/dashboard')
  res.redirect('/auth/login')
})

app.use('/auth', authRoutes)
app.use('/ledger', ledgerRoutes)

export default app



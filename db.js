import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

export const usersDB = new Low(new JSONFile('data/users.json'), { users: [] })
export const ledgerDB = new Low(new JSONFile('data/ledger.json'), { entries: [] })

export async function initDB() {
  await usersDB.read()
  usersDB.data ||= { users: [] }
  await usersDB.write()

  await ledgerDB.read()
  ledgerDB.data ||= { entries: [] }
  await ledgerDB.write()
}


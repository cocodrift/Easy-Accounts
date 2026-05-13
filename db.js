import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import path from 'path'
import fs from 'fs'

// Check if we are running in a serverless environment (Vercel/AWS)
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Path logic: Use /tmp in production, local data/ folder in development
const usersPath = isServerless 
  ? path.join('/tmp', 'users.json') 
  : path.resolve('data/users.json');

const ledgerPath = isServerless 
  ? path.join('/tmp', 'ledger.json') 
  : path.resolve('data/ledger.json');

// Ensure the local 'data' directory exists during development
if (!isServerless && !fs.existsSync('data')) {
  fs.mkdirSync('data');
}

export const usersDB = new Low(new JSONFile(usersPath), { users: [] });
export const ledgerDB = new Low(new JSONFile(ledgerPath), { entries: [] });

export async function initDB() {
  // Read existing data or initialize with defaults
  await usersDB.read();
  usersDB.data ||= { users: [] };
  
  // Write only if the file doesn't exist yet to avoid unnecessary disk hits
  if (!fs.existsSync(usersPath)) {
    await usersDB.write();
  }

  await ledgerDB.read();
  ledgerDB.data ||= { entries: [] };
  
  if (!fs.existsSync(ledgerPath)) {
    await ledgerDB.write();
  }
}
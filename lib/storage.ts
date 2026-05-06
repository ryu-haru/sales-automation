import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const DATA_DIR = path.join(process.cwd(), 'data')
const COMPANIES_FILE = path.join(DATA_DIR, 'companies.json')
const LOGS_FILE = path.join(DATA_DIR, 'logs.json')

export interface Company {
  id: string
  company_name: string
  email?: string
  url?: string
  area?: string
  notes?: string
  status: 'pending' | 'sent' | 'failed' | 'skipped'
  created_at: string
}

export interface Log {
  id: string
  company_id: string
  company_name: string
  method: 'email' | 'form' | 'none'
  status: 'success' | 'failed' | 'skipped'
  message?: string
  error?: string
  sent_at: string
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function getCompanies(): Company[] {
  ensureDataDir()
  if (!fs.existsSync(COMPANIES_FILE)) return []
  try {
    return JSON.parse(fs.readFileSync(COMPANIES_FILE, 'utf-8'))
  } catch {
    return []
  }
}

export function saveCompanies(companies: Company[]): void {
  ensureDataDir()
  fs.writeFileSync(COMPANIES_FILE, JSON.stringify(companies, null, 2))
}

export function addCompanies(rows: Omit<Company, 'id' | 'status' | 'created_at'>[]): Company[] {
  const existing = getCompanies()
  const newCompanies: Company[] = rows.map(r => ({
    ...r,
    id: uuidv4(),
    status: 'pending' as const,
    created_at: new Date().toISOString(),
  }))
  saveCompanies([...existing, ...newCompanies])
  return newCompanies
}

export function updateCompanyStatus(id: string, status: Company['status']): void {
  const companies = getCompanies()
  const idx = companies.findIndex(c => c.id === id)
  if (idx !== -1) companies[idx].status = status
  saveCompanies(companies)
}

export function clearCompanies(): void {
  saveCompanies([])
}

export function getLogs(): Log[] {
  ensureDataDir()
  if (!fs.existsSync(LOGS_FILE)) return []
  try {
    return JSON.parse(fs.readFileSync(LOGS_FILE, 'utf-8'))
  } catch {
    return []
  }
}

export function addLog(log: Omit<Log, 'id' | 'sent_at'>): void {
  ensureDataDir()
  const logs = getLogs()
  logs.unshift({ ...log, id: uuidv4(), sent_at: new Date().toISOString() })
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2))
}

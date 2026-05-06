import * as XLSX from 'xlsx'
import { parse } from 'csv-parse/sync'

export interface ParsedRow {
  company_name: string
  email?: string
  url?: string
  area?: string
  notes?: string
}

function normalizeRow(row: Record<string, string>): ParsedRow | null {
  const name = (
    row['company_name'] || row['会社名'] || row['企業名'] ||
    row['Company'] || row['company'] || row['name'] || ''
  ).trim()

  if (!name) return null

  return {
    company_name: name,
    email: (
      row['email'] || row['Email'] || row['メール'] || row['メールアドレス'] || ''
    ).trim() || undefined,
    url: (
      row['url'] || row['URL'] || row['ホームページ'] || row['website'] || row['Website'] || ''
    ).trim() || undefined,
    area: (
      row['area'] || row['Area'] || row['地域'] || row['エリア'] || ''
    ).trim() || undefined,
    notes: (
      row['notes'] || row['Notes'] || row['備考'] || row['メモ'] || ''
    ).trim() || undefined,
  }
}

export async function parseFile(file: File): Promise<ParsedRow[]> {
  const name = file.name.toLowerCase()

  if (name.endsWith('.csv')) {
    const text = await file.text()
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      relax_column_count: true,
    }) as Record<string, string>[]
    return records.map(normalizeRow).filter(Boolean) as ParsedRow[]
  }

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const records = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })
    return records.map(normalizeRow).filter(Boolean) as ParsedRow[]
  }

  throw new Error('CSV または Excel（.xlsx/.xls）ファイルをアップロードしてください。')
}

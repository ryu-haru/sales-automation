import { NextResponse } from 'next/server'
import { getCompanies, clearCompanies } from '@/lib/storage'

export async function GET() {
  const companies = getCompanies()
  return NextResponse.json(companies)
}

export async function DELETE() {
  clearCompanies()
  return NextResponse.json({ success: true })
}

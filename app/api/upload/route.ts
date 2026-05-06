import { NextRequest, NextResponse } from 'next/server'
import { parseFile } from '@/lib/parser'
import { addCompanies } from '@/lib/storage'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 })
    }

    const rows = await parseFile(file)

    if (rows.length === 0) {
      return NextResponse.json({ error: 'データが見つかりませんでした。列名を確認してください。' }, { status: 400 })
    }

    const companies = addCompanies(rows)

    return NextResponse.json({
      success: true,
      count: companies.length,
      message: `${companies.length}件の会社を追加しました`,
    })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'アップロードに失敗しました' },
      { status: 500 }
    )
  }
}

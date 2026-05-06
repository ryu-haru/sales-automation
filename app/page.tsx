'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { StatusBadge } from '@/components/StatusBadge'

interface Company {
  id: string
  company_name: string
  email?: string
  url?: string
  area?: string
  notes?: string
  status: 'pending' | 'sent' | 'failed' | 'skipped'
  created_at: string
}

interface Log {
  id: string
  company_name: string
  method: 'email' | 'form' | 'none'
  status: 'success' | 'failed' | 'skipped'
  message?: string
  error?: string
  sent_at: string
}

interface Progress {
  running: boolean
  total: number
  processed: number
  sent: number
  failed: number
  skipped: number
  currentCompany: string | null
}

export default function Dashboard() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [progress, setProgress] = useState<Progress>({
    running: false, total: 0, processed: 0, sent: 0, failed: 0, skipped: 0, currentCompany: null,
  })
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [emailConfigured, setEmailConfigured] = useState<boolean | null>(null)
  const [sender, setSender] = useState({
    name: process.env.NEXT_PUBLIC_DEFAULT_SENDER_NAME || '',
    company: process.env.NEXT_PUBLIC_DEFAULT_SENDER_COMPANY || '',
    email: process.env.NEXT_PUBLIC_DEFAULT_SENDER_EMAIL || '',
  })
  const [activeTab, setActiveTab] = useState<'companies' | 'logs'>('companies')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchCompanies = useCallback(async () => {
    const res = await fetch('/api/companies')
    if (res.ok) setCompanies(await res.json())
  }, [])

  const fetchLogs = useCallback(async () => {
    const res = await fetch('/api/logs')
    if (res.ok) setLogs(await res.json())
  }, [])

  const fetchProgress = useCallback(async () => {
    const res = await fetch('/api/run/progress')
    if (res.ok) {
      const p = await res.json()
      setProgress(p)
      if (!p.running) {
        // キャンペーン完了時にデータ更新
        fetchCompanies()
        fetchLogs()
      }
    }
  }, [fetchCompanies, fetchLogs])

  useEffect(() => {
    fetchCompanies()
    fetchLogs()
    fetchProgress()
    fetch('/api/config').then(r => r.json()).then(d => setEmailConfigured(d.emailConfigured))
  }, [fetchCompanies, fetchLogs, fetchProgress])

  // キャンペーン実行中はポーリング
  useEffect(() => {
    if (progress.running) {
      pollRef.current = setInterval(fetchProgress, 2000)
    } else {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [progress.running, fetchProgress])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMsg('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        setUploadMsg(`✓ ${data.message}`)
        await fetchCompanies()
      } else {
        setUploadMsg(`エラー: ${data.error}`)
      }
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleClear() {
    if (!confirm('全ての会社データを削除しますか？')) return
    await fetch('/api/companies', { method: 'DELETE' })
    await fetchCompanies()
  }

  async function handleRun() {
    if (!sender.name || !sender.email) {
      alert('送信者情報（担当者名・メール）を入力してください')
      return
    }
    const pendingCount = companies.filter(c => c.status === 'pending').length
    if (pendingCount === 0) {
      alert('未送信の会社がありません')
      return
    }
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sender),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error); return }
    setProgress(p => ({ ...p, running: true }))
    // ポーリング開始
    pollRef.current = setInterval(fetchProgress, 2000)
  }

  async function handleStop() {
    await fetch('/api/run/stop', { method: 'POST' })
  }

  const pending = companies.filter(c => c.status === 'pending').length
  const sent = companies.filter(c => c.status === 'sent').length
  const failed = companies.filter(c => c.status === 'failed').length
  const skipped = companies.filter(c => c.status === 'skipped').length
  const total = companies.length
  const progressPct = progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">催事営業 自動送信ツール</h1>
        <p className="text-sm text-gray-500 mt-1">通信系催事営業会社への自動営業メール・フォーム送信</p>
      </div>

      {/* メール未設定バナー */}
      {emailConfigured === false && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <span className="text-amber-500 text-lg mt-0.5">⚠</span>
          <div>
            <p className="text-sm font-medium text-amber-800">Gmail未設定 — フォーム送信モードで動作中</p>
            <p className="text-xs text-amber-700 mt-1">
              URLがある会社はPlaywrightでフォーム自動送信します。メールアドレスのみの会社はスキップされます。<br/>
              メール送信を有効にするには <code className="bg-amber-100 px-1 rounded">.env.local</code> に <code className="bg-amber-100 px-1 rounded">GMAIL_APP_PASSWORD</code> を設定してサーバーを再起動してください。
            </p>
          </div>
        </div>
      )}

      {emailConfigured === true && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <span className="text-green-500">✓</span>
          <p className="text-sm text-green-800 font-medium">Gmail設定済み — メール＋フォーム送信の両方が有効です</p>
        </div>
      )}

      {/* 統計カード */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: '総件数', value: total,   color: 'text-gray-800' },
          { label: '未送信', value: pending,  color: 'text-gray-600' },
          { label: '送信済', value: sent,     color: 'text-green-600' },
          { label: '失敗',   value: failed,   color: 'text-red-600' },
          { label: 'スキップ', value: skipped, color: 'text-yellow-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {/* 送信者情報 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">送信者情報</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">担当者名 *</label>
              <input
                type="text"
                value={sender.name}
                onChange={e => setSender(s => ({ ...s, name: e.target.value }))}
                placeholder="山田 太郎"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">会社/屋号</label>
              <input
                type="text"
                value={sender.company}
                onChange={e => setSender(s => ({ ...s, company: e.target.value }))}
                placeholder="株式会社〇〇"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">返信先メール *</label>
              <input
                type="email"
                value={sender.email}
                onChange={e => setSender(s => ({ ...s, email: e.target.value }))}
                placeholder="you@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* アップロード */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">リストをアップロード</h2>
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-600">
              {uploading ? 'アップロード中...' : 'CSV / Excel をドロップ or クリック'}
            </p>
            <p className="text-xs text-gray-400 mt-1">company_name, email, url, area, notes</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleUpload}
          />
          {uploadMsg && (
            <p className={`text-sm mt-2 ${uploadMsg.startsWith('エラー') ? 'text-red-600' : 'text-green-600'}`}>
              {uploadMsg}
            </p>
          )}
          <button
            onClick={handleClear}
            className="mt-3 w-full text-xs text-gray-500 hover:text-red-500 transition-colors"
          >
            リストをクリア
          </button>
        </div>

        {/* キャンペーン実行 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">キャンペーン実行</h2>

          {progress.running ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium text-green-700">実行中</span>
              </div>
              {progress.currentCompany && (
                <p className="text-xs text-gray-500 truncate">
                  処理中: {progress.currentCompany}
                </p>
              )}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{progress.processed} / {progress.total}</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
              <div className="flex gap-3 text-xs flex-wrap">
                <span className="text-green-600">成功: {progress.sent}</span>
                <span className="text-red-600">失敗: {progress.failed}</span>
                {progress.skipped > 0 && <span className="text-yellow-600">スキップ: {progress.skipped}</span>}
              </div>
              <button
                onClick={handleStop}
                className="w-full bg-red-100 text-red-700 hover:bg-red-200 rounded-lg py-2 text-sm font-medium transition-colors"
              >
                停止する
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                未送信: <span className="font-bold text-gray-900">{pending}件</span>
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• AIが会社ごとに文面を自動生成</p>
                {emailConfigured
                  ? <p>• メアドあり → <span className="text-green-600 font-medium">Gmail送信</span></p>
                  : <p>• メアドあり → <span className="text-yellow-600 font-medium">スキップ（Gmail未設定）</span></p>
                }
                <p>• URLあり → <span className="text-blue-600 font-medium">フォーム自動入力</span></p>
                <p>• 送信間隔: 3秒</p>
              </div>
              <button
                onClick={handleRun}
                disabled={pending === 0}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg py-2.5 text-sm font-medium transition-colors"
              >
                キャンペーン開始
              </button>
            </div>
          )}
        </div>
      </div>

      {/* タブ */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex border-b border-gray-200">
          {(['companies', 'logs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'companies' ? `会社リスト (${companies.length})` : `送信ログ (${logs.length})`}
            </button>
          ))}
        </div>

        {activeTab === 'companies' && (
          <div className="overflow-x-auto">
            {companies.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg">リストが空です</p>
                <p className="text-sm mt-1">CSVまたはExcelをアップロードしてください</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500">
                    <th className="px-4 py-3 font-medium">会社名</th>
                    <th className="px-4 py-3 font-medium">メール</th>
                    <th className="px-4 py-3 font-medium">URL</th>
                    <th className="px-4 py-3 font-medium">地域</th>
                    <th className="px-4 py-3 font-medium">ステータス</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {companies.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{c.company_name}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{c.email || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                        {c.url
                          ? <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{c.url}</a>
                          : '—'
                        }
                      </td>
                      <td className="px-4 py-3 text-gray-500">{c.area || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="overflow-x-auto">
            {logs.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg">ログはありません</p>
                <p className="text-sm mt-1">キャンペーンを実行すると送信結果が表示されます</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500">
                    <th className="px-4 py-3 font-medium">送信日時</th>
                    <th className="px-4 py-3 font-medium">会社名</th>
                    <th className="px-4 py-3 font-medium">手段</th>
                    <th className="px-4 py-3 font-medium">結果</th>
                    <th className="px-4 py-3 font-medium">詳細</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map(log => (
                    <>
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(log.sent_at).toLocaleString('ja-JP', {
                            month: '2-digit', day: '2-digit',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">{log.company_name}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {{ email: 'メール', form: 'フォーム', none: '—' }[log.method]}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                        <td className="px-4 py-3">
                          {(log.message || log.error) && (
                            <button
                              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                              className="text-xs text-blue-500 hover:underline"
                            >
                              {expandedLog === log.id ? '閉じる' : '表示'}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedLog === log.id && (
                        <tr key={`${log.id}-expand`}>
                          <td colSpan={5} className="px-4 pb-3 bg-gray-50">
                            {log.error && (
                              <p className="text-red-600 text-xs mb-2">エラー: {log.error}</p>
                            )}
                            {log.message && (
                              <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-white border border-gray-200 rounded p-3 max-h-48 overflow-y-auto">
                                {log.message}
                              </pre>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="mt-6 text-center text-xs text-gray-400">
        <p>リスト列名: company_name / email / url / area / notes（日本語列名も対応）</p>
      </div>
    </div>
  )
}

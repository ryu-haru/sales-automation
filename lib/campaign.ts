import { getCompanies, updateCompanyStatus, addLog } from './storage'
import { generateMessage } from './message-generator'
import { sendEmail } from './email-sender'
import { submitContactForm } from './form-submitter'

export interface CampaignState {
  running: boolean
  shouldStop: boolean
  total: number
  processed: number
  sent: number
  failed: number
  skipped: number
  currentCompany: string | null
}

export const campaignState: CampaignState = {
  running: false,
  shouldStop: false,
  total: 0,
  processed: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
  currentCompany: null,
}

const DELAY_MS = 3000

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isEmailConfigured(): boolean {
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
}

export async function runCampaign(sender: {
  name: string
  company: string
  email: string
}) {
  if (campaignState.running) return

  const companies = getCompanies().filter(c => c.status === 'pending')
  const emailOk = isEmailConfigured()

  campaignState.running = true
  campaignState.shouldStop = false
  campaignState.total = companies.length
  campaignState.processed = 0
  campaignState.sent = 0
  campaignState.failed = 0
  campaignState.skipped = 0
  campaignState.currentCompany = null

  for (const company of companies) {
    if (campaignState.shouldStop) break

    campaignState.currentCompany = company.company_name

    try {
      const { subject, body } = await generateMessage(company, sender)

      let result: { success: boolean; error?: string }
      let method: 'email' | 'form' | 'none'

      if (company.email && emailOk) {
        // メール設定済み → メール送信
        method = 'email'
        result = await sendEmail(company.email, subject, body, sender.name)
      } else if (company.url) {
        // URLあり → フォーム送信（メール未設定でも動く）
        method = 'form'
        result = await submitContactForm(company.url, {
          name: sender.name,
          email: sender.email,
          company: sender.company,
          message: body,
        })
      } else if (company.email && !emailOk) {
        // メールアドレスはあるがGmail未設定 → スキップ
        method = 'none'
        result = { success: false, error: 'Gmail未設定のためスキップ（.env.local に GMAIL_APP_PASSWORD を設定してください）' }
        updateCompanyStatus(company.id, 'skipped')
        campaignState.skipped++
        addLog({
          company_id: company.id,
          company_name: company.company_name,
          method,
          status: 'skipped',
          message: body,
          error: result.error,
        })
        campaignState.processed++
        continue
      } else {
        method = 'none'
        result = { success: false, error: 'メールアドレスもURLも未設定' }
      }

      updateCompanyStatus(company.id, result.success ? 'sent' : 'failed')
      if (result.success) {
        campaignState.sent++
      } else {
        campaignState.failed++
      }

      addLog({
        company_id: company.id,
        company_name: company.company_name,
        method,
        status: result.success ? 'success' : 'failed',
        message: body,
        error: result.error,
      })
    } catch (e: unknown) {
      updateCompanyStatus(company.id, 'failed')
      campaignState.failed++
      addLog({
        company_id: company.id,
        company_name: company.company_name,
        method: 'none',
        status: 'failed',
        error: e instanceof Error ? e.message : String(e),
      })
    }

    campaignState.processed++
    if (!campaignState.shouldStop) await sleep(DELAY_MS)
  }

  campaignState.running = false
  campaignState.currentCompany = null
}

export function stopCampaign() {
  campaignState.shouldStop = true
}

import { chromium, type Browser, type Page } from 'playwright'

let _browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (_browser?.isConnected()) return _browser
  _browser = await chromium.launch({ headless: true })
  _browser.on('disconnected', () => { _browser = null })
  return _browser
}

// お問い合わせページとして試みるパス
const CONTACT_PATHS = [
  '/contact',
  '/contact/',
  '/contact-us',
  '/contactus',
  '/inquiry',
  '/inquiry/',
  '/form',
  '/contact.html',
  '/inquiry.html',
  '/contact/index.html',
  '/お問い合わせ',
  '/toiawase',
  '/otoiawase',
  '/company/contact',
  '/about/contact',
  '/info/contact',
  '/pages/contact',
  '/support/contact',
]

// お問い合わせリンクのhref/テキストパターン
const CONTACT_HREF_PATTERNS = [
  'contact', 'inquiry', 'toiawase', 'otoiawase', 'form', 'enquiry'
]

const CONTACT_LINK_TEXTS = [
  'お問い合わせ',
  '問い合わせ',
  '問合せ',
  'お問合せ',
  'ご相談',
  'コンタクト',
  'お問い合わせはこちら',
  'Contact',
  'contact',
  'Inquiry',
  'inquiry',
  '連絡',
  'CONTACT',
  'INQUIRY',
]

async function findContactPage(page: Page, baseUrl: string): Promise<boolean> {
  const origin = new URL(baseUrl).origin

  // よくあるパスを直接試す
  for (const contactPath of CONTACT_PATHS) {
    try {
      const url = `${origin}${contactPath}`
      const response = await page.goto(url, { timeout: 20000, waitUntil: 'domcontentloaded' })
      if (response?.ok()) {
        await page.waitForTimeout(1000)
        const hasForm = await page.$('form')
        if (hasForm) return true
      }
    } catch { /* 次を試す */ }
  }

  // トップページを読み込んでリンクを探す
  try {
    await page.goto(baseUrl, { timeout: 25000, waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)

    // hrefにキーワードを含むリンクを探す
    for (const pattern of CONTACT_HREF_PATTERNS) {
      try {
        const links = await page.$$(`a[href*="${pattern}" i]`)
        for (const link of links) {
          try {
            const href = await link.getAttribute('href')
            if (!href) continue
            const fullUrl = href.startsWith('http') ? href : `${origin}${href.startsWith('/') ? '' : '/'}${href}`
            const response = await page.goto(fullUrl, { timeout: 20000, waitUntil: 'domcontentloaded' })
            if (response?.ok()) {
              await page.waitForTimeout(1000)
              const hasForm = await page.$('form')
              if (hasForm) return true
            }
            // ページを戻して次のリンクを試す
            await page.goto(baseUrl, { timeout: 15000, waitUntil: 'domcontentloaded' }).catch(() => {})
          } catch { /* 次を試す */ }
        }
      } catch { /* 次のパターンへ */ }
    }

    // テキストでリンクを探す
    for (const text of CONTACT_LINK_TEXTS) {
      try {
        const link = page.locator(`a:has-text("${text}")`).first()
        if (await link.count() > 0) {
          await link.click({ timeout: 10000 })
          await page.waitForLoadState('domcontentloaded', { timeout: 15000 })
          await page.waitForTimeout(1000)
          const hasForm = await page.$('form')
          if (hasForm) return true
        }
      } catch { /* 次を試す */ }
    }
  } catch { /* ホームページ読み込み失敗 */ }

  return false
}

async function fillFormFields(
  page: Page,
  data: { name: string; email: string; company: string; message: string }
): Promise<void> {
  // 会社名フィールド
  const companySelectors = [
    'input[name*="company" i]', 'input[name*="corp" i]',
    'input[placeholder*="会社名"]', 'input[placeholder*="会社"]',
    'input[id*="company" i]',
  ]
  for (const sel of companySelectors) {
    const el = await page.$(sel)
    if (el && await el.isVisible()) { await el.fill(data.company); break }
  }

  // 氏名フィールド
  const nameSelectors = [
    'input[name="name"]', 'input[name="your_name"]', 'input[name*="name" i]',
    'input[placeholder*="氏名"]', 'input[placeholder*="お名前"]', 'input[placeholder*="名前"]',
    'input[id*="name" i]',
  ]
  for (const sel of nameSelectors) {
    const el = await page.$(sel)
    if (el && await el.isVisible()) { await el.fill(data.name); break }
  }

  // メールフィールド
  const emailSelectors = [
    'input[type="email"]',
    'input[name*="email" i]', 'input[name*="mail" i]',
    'input[placeholder*="メール"]', 'input[placeholder*="メールアドレス"]',
    'input[id*="email" i]',
  ]
  for (const sel of emailSelectors) {
    const el = await page.$(sel)
    if (el && await el.isVisible()) { await el.fill(data.email); break }
  }

  // 電話番号（ダミー。必須の場合に備えて）
  const telSelectors = [
    'input[type="tel"]', 'input[name*="tel" i]', 'input[name*="phone" i]',
    'input[placeholder*="電話"]', 'input[placeholder*="TEL"]',
  ]
  for (const sel of telSelectors) {
    const el = await page.$(sel)
    if (el && await el.isVisible()) { await el.fill('00-0000-0000'); break }
  }

  // お問い合わせ内容（textarea）
  const messageSelectors = [
    'textarea[name*="message" i]', 'textarea[name*="content" i]',
    'textarea[name*="body" i]', 'textarea[name*="inquiry" i]',
    'textarea[name*="お問い合わせ"]', 'textarea[name*="text" i]',
    'textarea',
  ]
  for (const sel of messageSelectors) {
    const el = await page.$(sel)
    if (el && await el.isVisible()) { await el.fill(data.message); break }
  }
}

export async function submitContactForm(
  url: string,
  data: { name: string; email: string; company: string; message: string }
): Promise<{ success: boolean; error?: string }> {
  const browser = await getBrowser()
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  })
  const page = await context.newPage()
  try {
    const found = await findContactPage(page, url)
    if (!found) {
      return { success: false, error: 'お問い合わせフォームが見つかりませんでした' }
    }

    await fillFormFields(page, data)

    // 送信ボタン
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("送信")',
      'button:has-text("確認画面へ")',
      'button:has-text("次へ")',
      'button:has-text("Submit")',
      'button:has-text("Send")',
      '[class*="submit" i]',
    ]
    for (const sel of submitSelectors) {
      const btn = await page.$(sel)
      if (btn && await btn.isVisible()) {
        await btn.click({ timeout: 15000 })
        await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {})
        return { success: true }
      }
    }

    return { success: false, error: '送信ボタンが見つかりませんでした' }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  } finally {
    await page.close().catch(() => {})
    await context.close().catch(() => {})
  }
}

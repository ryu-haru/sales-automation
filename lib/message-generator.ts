import Anthropic from '@anthropic-ai/sdk'

interface MessageResult {
  subject: string
  body: string
}

function generateFromTemplate(
  company: { company_name: string; area?: string; notes?: string },
  sender: { name: string; company: string; email: string }
): MessageResult {
  const area = company.area && company.area !== '不明' ? `${company.area}エリアを中心に` : ''
  const subject = `【業務協力・案件ご紹介のお願い】${company.company_name}様`
  const body = `${company.company_name} 御中

突然のご連絡、誠に失礼いたします。
${sender.company}の${sender.name}と申します。

${area}通信系催事・イベント営業に携わっており、このたびぜひ一度ご連絡させていただきました。

弊社では、スーパーやショッピングモールなどの商業施設における通信商材（スマートフォン・タブレット・インターネット回線等）の催事販売を行っております。

現在、下記の2点についてご相談させていただきたく存じます。

■ 人材のご提供
催事現場での販売経験が豊富なスタッフを提供できます。
繁忙期・単発・継続いずれにも柔軟に対応可能です。

■ 案件のご紹介・業務協力
貴社にて催事・イベントの案件がございましたら、ぜひお声がけいただけますと幸いです。
逆に弊社案件へのご参加もご相談できればと考えております。

まずはお気軽にご返信またはメールにてお問い合わせいただけますと幸いです。
何卒よろしくお願いいたします。

━━━━━━━━━━━━━━━━━━
${sender.name}
${sender.company}
${sender.email}
━━━━━━━━━━━━━━━━━━`

  return { subject, body }
}

async function generateWithAI(
  company: { company_name: string; area?: string; notes?: string },
  sender: { name: string; company: string; email: string },
  apiKey: string
): Promise<MessageResult> {
  const client = new Anthropic({ apiKey })
  const area = company.area && company.area !== '不明' ? `エリア: ${company.area}` : ''
  const notes = company.notes ? `企業メモ: ${company.notes}` : ''

  const prompt = `以下の企業に対して、通信系催事・イベント営業の業務協力依頼メールを作成してください。

送信先企業: ${company.company_name}
${area}
${notes}

送信者情報:
- 名前: ${sender.name}
- 会社: ${sender.company}
- メール: ${sender.email}

要件:
- 件名と本文を作成する
- 自然で丁寧な日本語ビジネスメール
- 企業のメモ情報があれば、それを活かして個別化した文面にする
- 人材提供と案件紹介の2点を提案する
- 署名は以下の形式にする（変更不可）:
━━━━━━━━━━━━━━━━━━
${sender.name}
${sender.company}
${sender.email}
━━━━━━━━━━━━━━━━━━

以下のJSON形式で返答してください:
{"subject": "件名", "body": "本文（署名含む）"}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('AI response parse failed')
  const parsed = JSON.parse(match[0])
  if (!parsed.subject || !parsed.body) throw new Error('AI response missing fields')
  return { subject: parsed.subject, body: parsed.body }
}

export async function generateMessage(
  company: { company_name: string; area?: string; notes?: string },
  sender: { name: string; company: string; email: string }
): Promise<MessageResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (apiKey) {
    try {
      return await generateWithAI(company, sender, apiKey)
    } catch {
      // API失敗時はテンプレートにフォールバック
    }
  }
  return generateFromTemplate(company, sender)
}

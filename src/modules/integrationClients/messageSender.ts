/**
 * WhatsApp/Telegram send adapter.
 *
 * `messageScripts.ts` only builds the message text/variant; this module
 * actually delivers it through the WhatsApp Business Cloud API or the
 * Telegram Bot API, with a small retry policy since outbound sends to
 * social APIs are expected to occasionally fail transiently.
 */

export interface WhatsAppCredentials {
  phoneNumberId: string;
  accessToken: string;
}

export interface TelegramCredentials {
  botToken: string;
}

export type SendableChannel = 'whatsapp' | 'telegram';

export interface SendMessageParams {
  channel: SendableChannel;
  /** E.164 phone for WhatsApp, or chat id for Telegram. */
  to: string;
  body: string;
}

export interface SendMessageResult {
  success: boolean;
  channel: SendableChannel;
  messageId?: string;
  attempts: number;
  error?: string;
}

type FetchLike = typeof fetch;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MessageSender {
  constructor(
    private readonly fetchImpl: FetchLike = fetch,
    private readonly maxRetries = 2,
    private readonly retryDelayMs = 250
  ) {}

  async send(
    params: SendMessageParams,
    credentials: WhatsAppCredentials | TelegramCredentials
  ): Promise<SendMessageResult> {
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt += 1) {
      try {
        const messageId =
          params.channel === 'whatsapp'
            ? await this.sendWhatsApp(params, credentials as WhatsAppCredentials)
            : await this.sendTelegram(params, credentials as TelegramCredentials);
        return { success: true, channel: params.channel, messageId, attempts: attempt };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt <= this.maxRetries) {
          await delay(this.retryDelayMs * attempt);
        }
      }
    }

    return { success: false, channel: params.channel, error: lastError, attempts: this.maxRetries + 1 };
  }

  private async sendWhatsApp(params: SendMessageParams, credentials: WhatsAppCredentials): Promise<string> {
    const response = await this.fetchImpl(
      `https://graph.facebook.com/v19.0/${credentials.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + credentials.accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: params.to,
          type: 'text',
          text: { body: params.body },
        }),
      }
    );
    if (!response.ok) {
      throw new Error(`WhatsApp send failed with status ${response.status}`);
    }
    const body = (await response.json()) as { messages?: { id?: string }[] };
    return body.messages?.[0]?.id ?? '';
  }

  private async sendTelegram(params: SendMessageParams, credentials: TelegramCredentials): Promise<string> {
    const response = await this.fetchImpl(`https://api.telegram.org/bot${credentials.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: params.to, text: params.body }),
    });
    if (!response.ok) {
      throw new Error(`Telegram send failed with status ${response.status}`);
    }
    const body = (await response.json()) as { result?: { message_id?: number } };
    return body.result?.message_id !== undefined ? String(body.result.message_id) : '';
  }
}

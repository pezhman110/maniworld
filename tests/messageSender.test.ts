import { MessageSender } from '../src/modules/integrationClients/messageSender';

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>): typeof fetch {
  return impl as unknown as typeof fetch;
}

describe('MessageSender', () => {
  it('sends a WhatsApp message and returns the message id', async () => {
    const fetchImpl = mockFetch(async () =>
      new Response(JSON.stringify({ messages: [{ id: 'wamid.123' }] }), { status: 200 })
    );
    const sender = new MessageSender(fetchImpl);

    const result = await sender.send(
      { channel: 'whatsapp', to: '+989123456789', body: 'Hello' },
      { phoneNumberId: '1', accessToken: 'token' }
    );

    expect(result).toEqual({ success: true, channel: 'whatsapp', messageId: 'wamid.123', attempts: 1 });
  });

  it('sends a Telegram message and returns the message id', async () => {
    const fetchImpl = mockFetch(async () =>
      new Response(JSON.stringify({ result: { message_id: 42 } }), { status: 200 })
    );
    const sender = new MessageSender(fetchImpl);

    const result = await sender.send(
      { channel: 'telegram', to: '12345', body: 'Hello' },
      { botToken: 'bot-token' }
    );

    expect(result).toEqual({ success: true, channel: 'telegram', messageId: '42', attempts: 1 });
  });

  it('retries on failure and eventually succeeds', async () => {
    let calls = 0;
    const fetchImpl = mockFetch(async () => {
      calls += 1;
      if (calls < 2) return new Response('error', { status: 500 });
      return new Response(JSON.stringify({ messages: [{ id: 'wamid.ok' }] }), { status: 200 });
    });
    const sender = new MessageSender(fetchImpl, 2, 1);

    const result = await sender.send(
      { channel: 'whatsapp', to: '+989123456789', body: 'Hello' },
      { phoneNumberId: '1', accessToken: 'token' }
    );

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
  });

  it('returns a failure result after exhausting retries', async () => {
    const fetchImpl = mockFetch(async () => new Response('error', { status: 500 }));
    const sender = new MessageSender(fetchImpl, 1, 1);

    const result = await sender.send(
      { channel: 'telegram', to: '12345', body: 'Hello' },
      { botToken: 'bot-token' }
    );

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(2);
    expect(result.error).toBeDefined();
  });
});

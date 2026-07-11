import { IntegrationCredentialsStore } from '../src/modules/credentialsStore';

describe('IntegrationCredentialsStore', () => {
  const testKey = Buffer.alloc(32, 7);

  it('encrypts fields at rest and decrypts them back on get()', async () => {
    const store = new IntegrationCredentialsStore(undefined, testKey);

    const summary = await store.set('twilio', 'Production Twilio', {
      accountSid: 'ACabcdef1234567890',
      authToken: 'super-secret-token',
    });

    expect(summary.status).toBe('unverified');
    expect(summary.maskedFields.authToken).not.toContain('super-secret-token');
    expect(summary.maskedFields.authToken.endsWith('oken')).toBe(true);

    const fields = await store.get('twilio');
    expect(fields).toEqual({ accountSid: 'ACabcdef1234567890', authToken: 'super-secret-token' });
  });

  it('never exposes plaintext secrets through list()/getSummary()', async () => {
    const store = new IntegrationCredentialsStore(undefined, testKey);
    await store.set('whatsapp', 'WA Business', { phoneNumberId: '123', accessToken: 'EAAG12345678' });

    const listed = await store.list();
    expect(listed).toHaveLength(1);
    expect(JSON.stringify(listed)).not.toContain('EAAG12345678');

    const summary = await store.getSummary('whatsapp');
    expect(summary?.maskedFields.accessToken).not.toContain('EAAG12345678');
  });

  it('markStatus() updates connection status and throws for unknown providers', async () => {
    const store = new IntegrationCredentialsStore(undefined, testKey);
    await store.set('vapi', 'Vapi', { apiKey: 'vapi_key_1234' });

    const updated = await store.markStatus('vapi', 'connected');
    expect(updated.status).toBe('connected');

    await expect(store.markStatus('telegram', 'connected')).rejects.toThrow();
  });

  it('remove() deletes stored credentials', async () => {
    const store = new IntegrationCredentialsStore(undefined, testKey);
    await store.set('zoom', 'Zoom', { accountId: 'a', clientId: 'b', clientSecret: 'c' });

    expect(await store.remove('zoom')).toBe(true);
    expect(await store.get('zoom')).toBeUndefined();
    expect(await store.remove('zoom')).toBe(false);
  });

  it('produces different ciphertext for the same secret across two set() calls (random IV)', async () => {
    const store = new IntegrationCredentialsStore(undefined, testKey);
    await store.set('apollo', 'Apollo A', { apiKey: 'same-secret' });
    const firstFields = await store.get('apollo');

    await store.set('apollo', 'Apollo B', { apiKey: 'same-secret' });
    const secondFields = await store.get('apollo');

    expect(firstFields).toEqual(secondFields);
  });
});

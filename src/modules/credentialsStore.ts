import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { InMemoryRepository, Repository } from './persistence';

/**
 * Integration credentials store.
 *
 * This is the "Integration Credentials" layer referenced by the outreach
 * adapters (Twilio, WhatsApp, Telegram, Vapi, Zoom, Google Meet, Apollo):
 * managers store their API keys/tokens here (via the admin API/dashboard)
 * instead of them being hardcoded, and the adapters read them back here.
 *
 * Secrets are encrypted at rest with AES-256-GCM using a master key derived
 * from the `MW_CREDENTIALS_KEY` environment variable. Callers may also pass
 * an explicit key (e.g. for tests). If neither is provided, an ephemeral
 * random key is generated for the lifetime of the process -- fine for local
 * development, but every restart invalidates previously stored secrets, so
 * production deployments must set `MW_CREDENTIALS_KEY`.
 */

export type IntegrationProvider =
  | 'twilio'
  | 'whatsapp'
  | 'telegram'
  | 'vapi'
  | 'zoom'
  | 'google-meet'
  | 'apollo';

export type IntegrationConnectionStatus = 'connected' | 'unverified' | 'invalid';

export interface IntegrationCredentialSummary {
  provider: IntegrationProvider;
  label: string;
  /** Field values masked for display (e.g. "sk_live_****ab12"); never the plaintext secret. */
  maskedFields: Record<string, string>;
  status: IntegrationConnectionStatus;
  updatedAt: number;
}

interface EncryptedPayload {
  iv: string;
  authTag: string;
  ciphertext: string;
}

interface StoredRecord {
  provider: IntegrationProvider;
  label: string;
  status: IntegrationConnectionStatus;
  updatedAt: number;
  encrypted: EncryptedPayload;
  /** Field names only (values live encrypted in `encrypted`), used to build masked summaries. */
  fieldNames: string[];
  maskedFields: Record<string, string>;
}

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, 'maniworld-integration-credentials', 32);
}

/** Resolves the AES-256 master key from an explicit override or the `MW_CREDENTIALS_KEY` env var, else a random per-process key. */
export function resolveMasterKey(explicitKey?: string): Buffer {
  const secret = explicitKey ?? process.env.MW_CREDENTIALS_KEY;
  if (secret) {
    return deriveKey(secret);
  }
  // eslint-disable-next-line no-console
  console.warn(
    '[credentialsStore] MW_CREDENTIALS_KEY is not set; using an ephemeral random key. ' +
      'Stored credentials will be unreadable after a restart. Set MW_CREDENTIALS_KEY for production.'
  );
  return randomBytes(32);
}

function encrypt(plaintext: string, key: Buffer): EncryptedPayload {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
}

function decrypt(payload: EncryptedPayload, key: Buffer): string {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

function maskValue(value: string): string {
  if (value.length <= 4) return '*'.repeat(value.length);
  return `${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

export class IntegrationCredentialsStore {
  private readonly key: Buffer;

  constructor(
    private repo: Repository<StoredRecord> = new InMemoryRepository(),
    masterKey?: Buffer
  ) {
    this.key = masterKey ?? resolveMasterKey();
  }

  /** Stores (or replaces) the credential fields for a provider, e.g. { accountSid, authToken } for Twilio. */
  async set(
    provider: IntegrationProvider,
    label: string,
    fields: Record<string, string>,
    now: number = Date.now()
  ): Promise<IntegrationCredentialSummary> {
    const encrypted = encrypt(JSON.stringify(fields), this.key);
    const maskedFields = Object.fromEntries(
      Object.entries(fields).map(([field, value]) => [field, maskValue(value)])
    );
    const record: StoredRecord = {
      provider,
      label,
      status: 'unverified',
      updatedAt: now,
      encrypted,
      fieldNames: Object.keys(fields),
      maskedFields,
    };
    await this.repo.save(provider, record);
    return this.toSummary(record);
  }

  /** Decrypts and returns the raw credential fields for an adapter to use. */
  async get(provider: IntegrationProvider): Promise<Record<string, string> | undefined> {
    const record = await this.repo.getById(provider);
    if (!record) return undefined;
    return JSON.parse(decrypt(record.encrypted, this.key));
  }

  async markStatus(
    provider: IntegrationProvider,
    status: IntegrationConnectionStatus,
    now: number = Date.now()
  ): Promise<IntegrationCredentialSummary> {
    const record = await this.repo.getById(provider);
    if (!record) throw new Error(`No credentials configured for provider "${provider}".`);
    record.status = status;
    record.updatedAt = now;
    await this.repo.save(provider, record);
    return this.toSummary(record);
  }

  async remove(provider: IntegrationProvider): Promise<boolean> {
    return this.repo.delete(provider);
  }

  async list(): Promise<IntegrationCredentialSummary[]> {
    const records = await this.repo.list();
    return records.map((r) => this.toSummary(r));
  }

  async getSummary(provider: IntegrationProvider): Promise<IntegrationCredentialSummary | undefined> {
    const record = await this.repo.getById(provider);
    return record ? this.toSummary(record) : undefined;
  }

  private toSummary(record: StoredRecord): IntegrationCredentialSummary {
    return {
      provider: record.provider,
      label: record.label,
      maskedFields: record.maskedFields,
      status: record.status,
      updatedAt: record.updatedAt,
    };
  }
}

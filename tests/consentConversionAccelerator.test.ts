import { ConsentConversionAcceleratorRegistry } from '../src/modules/consentConversionAccelerator';

describe('consentConversionAccelerator', () => {
  it('produces ready final output only for sourced, consented contacts', () => {
    const registry = new ConsentConversionAcceleratorRegistry();

    const record = registry.submitAccount({
      id: 'legal-1',
      platform: 'instagram',
      accountHandle: '@salon',
      source: 'lead_ad',
      sourceProof: 'Meta Lead Form submission id lead-123',
      accountKind: 'business',
      matchScore: 72,
      estimatedCostMinor: 120,
      contact: {
        kind: 'phone',
        value: '050 000 0000',
        verified: true,
        proof: 'Phone submitted in lead form.',
      },
      consentGranted: true,
      consentProof: 'Lead form checkbox accepted.',
    });

    const output = registry.finalOutput();

    expect(record.status).toBe('ready');
    expect(output.summary.ready).toBe(1);
    expect(output.items[0].contactValue).toBe('+98500000000');
    expect(output.csv).toContain('legal-1,instagram,salon');
  });

  it('blocks scraped, guessed, purchased, or fake sources instead of exposing contacts', () => {
    const registry = new ConsentConversionAcceleratorRegistry();

    const record = registry.submitAccount({
      id: 'bad-1',
      platform: 'linkedin',
      accountHandle: 'target',
      source: 'scraped',
      sourceProof: 'scraped from profile',
      matchScore: 99,
      estimatedCostMinor: 500,
      contact: {
        kind: 'phone',
        value: '+971500000000',
        proof: 'guessed from account name',
      },
    });

    const output = registry.finalOutput();

    expect(record.status).toBe('blocked');
    expect(output.summary.blocked).toBe(1);
    expect(output.summary.avoidedSpendMinor).toBe(500);
    expect(output.items[0].contactValue).toBeUndefined();
  });

  it('deduplicates accounts and contacts before spending again', () => {
    const registry = new ConsentConversionAcceleratorRegistry();

    registry.submitAccount({
      id: 'first',
      platform: 'instagram',
      accountHandle: '@brand',
      source: 'owned_form',
      sourceProof: 'Website form submission',
      contact: { kind: 'email', value: 'Owner@Example.com', proof: 'Submitted in form' },
      consentGranted: true,
      consentProof: 'Checkbox accepted',
      estimatedCostMinor: 100,
    });
    const duplicate = registry.submitAccount({
      id: 'dup',
      platform: 'instagram',
      accountHandle: 'brand',
      source: 'owned_form',
      sourceProof: 'Repeated form submission',
      estimatedCostMinor: 100,
    });

    const output = registry.finalOutput();

    expect(duplicate.status).toBe('duplicate');
    expect(output.summary.duplicates).toBe(1);
    expect(output.summary.avoidedSpendMinor).toBe(100);
  });

  it('moves public business contacts to ready only after opt-in proof is recorded', () => {
    const registry = new ConsentConversionAcceleratorRegistry();
    const record = registry.submitAccount({
      id: 'business-public',
      platform: 'instagram',
      accountHandle: 'clinic',
      source: 'public_business_contact',
      sourceProof: 'Public business bio snapshot',
      matchScore: 70,
      contact: { kind: 'whatsapp', value: '+971500000001', proof: 'Public WhatsApp button', verified: true },
    });

    expect(record.status).toBe('needs-consent');
    expect(registry.finalOutput().items[0].contactValue).toBeUndefined();

    registry.recordConsent(record.id, 'Owner replied yes to permission-first message.');

    const output = registry.finalOutput();
    expect(output.summary.ready).toBe(1);
    expect(output.items[0].contactValue).toBe('+971500000001');
  });
});

import { InstagramLegalGrowthRegistry } from '../src/modules/instagramLegalGrowth';

describe('instagramLegalGrowth', () => {
  it('blocks cold automated permission messages to personal accounts without engagement', () => {
    const registry = new InstagramLegalGrowthRegistry();
    const account = registry.addAccount({ id: 'ig-1', handle: '@person', source: 'manual public search' });
    registry.classify(account.id, 'personal');

    expect(registry.evaluateEligibility(account.id).status).toBe('needs-review');
    expect(() => registry.preparePermissionMessage(account.id, 'May we send details?')).toThrow(/Personal accounts/);
  });

  it('allows permission-first conversion after an inbound Instagram engagement and consent', () => {
    const registry = new InstagramLegalGrowthRegistry();
    const account = registry.addAccount({ id: 'ig-1', handle: '@beautybuyer', source: 'comment keyword campaign' });
    registry.classify(account.id, 'personal');
    registry.recordWarmupPath(account.id, 'comment_keyword');
    registry.preparePermissionMessage(account.id, 'May we send the offer?');
    registry.sendPermissionMessage(account.id);
    registry.recordReply(account.id, { consentGranted: true, proof: 'User replied yes in DM.' });
    registry.addContact(account.id, {
      kind: 'phone',
      value: '+971500000000',
      source: 'inbound_dm',
      proof: 'User sent phone in DM after opt-in.',
    });

    const converted = registry.convertContactAfterConsent(account.id);

    expect(converted.stage).toBe('converted-contact');
    expect(registry.markBookingReady(account.id).stage).toBe('booking-ready');
    expect(registry.metrics().consented).toBe(1);
    expect(registry.metrics().booked).toBe(1);
  });

  it('records public business contacts with proof and allows manual seller handoff by phone', () => {
    const registry = new InstagramLegalGrowthRegistry();
    const account = registry.addAccount({ id: 'ig-business', handle: 'salonco', source: 'manual public search' });
    registry.classify(account.id, 'business');
    registry.collectPublicSignals(account.id, { bio: 'Salon in Dubai', website: 'https://example.com' });
    registry.addContact(account.id, {
      kind: 'phone',
      value: '+971511111111',
      source: 'instagram_bio_public_contact',
      proof: 'Visible in public business bio snapshot.',
      publicBusinessContact: true,
    });

    const handedOff = registry.enqueueSellerHandoff(account.id, {
      assignedSeller: 'Neda',
      allowedMethod: 'phone',
      reason: 'No reply from warm-up path; public business phone exists.',
      script: 'Hello, may I send Mani World details?',
      maxAttempts: 1,
      deadlineAt: Date.now() + 86400000,
    });

    expect(handedOff.stage).toBe('human-handoff-needed');
    expect(handedOff.sellerHandoff?.manualOnly).toBe(true);
    expect(handedOff.sellerHandoff?.noAutomation).toBe(true);
    expect(registry.recordSellerAction(account.id, { outcome: 'success', note: 'Seller received permission.' }).stage).toBe(
      'seller-success'
    );
  });

  it('refuses seller phone handoff without a sourced phone and blocks future outreach after opt-out', () => {
    const registry = new InstagramLegalGrowthRegistry();
    const account = registry.addAccount({ id: 'ig-1', handle: 'unknown', source: 'manual public search' });

    expect(() =>
      registry.enqueueSellerHandoff(account.id, {
        assignedSeller: 'Ali',
        allowedMethod: 'phone',
        reason: 'No path',
        script: 'May I send details?',
        maxAttempts: 1,
        deadlineAt: Date.now() + 86400000,
      })
    ).toThrow(/without a sourced phone/);

    registry.recordOptOut(account.id, 'User requested stop.');
    expect(() => registry.recordWarmupPath(account.id, 'retargeting_ad')).toThrow(/opted out/);
    expect(registry.evaluateEligibility(account.id).status).toBe('blocked');
  });

  it('blocks guessed, scraped, fake, or purchased contact sources', () => {
    const registry = new InstagramLegalGrowthRegistry();
    const account = registry.addAccount({ id: 'ig-1', handle: 'target', source: 'manual public search' });

    const blocked = registry.addContact(account.id, {
      kind: 'email',
      value: 'guessed@example.com',
      source: 'manual_public_note',
      proof: 'guessed from username',
    });

    expect(blocked.stage).toBe('blocked');
    expect(registry.evaluateEligibility(account.id).status).toBe('blocked');
  });
});

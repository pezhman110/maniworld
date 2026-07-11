import { LinkedInLegalGrowthRegistry } from '../src/modules/linkedInLegalGrowth';

describe('linkedInLegalGrowth', () => {
  it('supports a personal investor path through InMail, Lead Gen Form, seller brief, meeting, and deal room', () => {
    const registry = new LinkedInLegalGrowthRegistry();
    const lead = registry.addLead({
      id: 'li-investor-1',
      name: 'Sara Investor',
      scope: 'personal',
      leadType: 'investor',
      source: 'manual Sales Navigator research',
      profileUrl: 'https://linkedin.com/in/sara',
      score: 82,
      campaign: 'uae-investors',
    });

    registry.selectLegalPath(lead.id, {
      path: 'sales-navigator-inmail',
      approvedTemplate: 'May I send a short UAE investment intro?',
      legalGateRequired: true,
      allowedHours: { startHour: 9, endHour: 18 },
      noBulkMessaging: true,
      manualOnly: true,
      proof: 'Approved InMail template LI-INV-1.',
    });
    registry.submitLeadGenForm(lead.id, {
      formId: 'investor-form',
      campaignId: 'campaign-1',
      answers: {
        Email: 'sara@example.com',
        Phone: '+971500000001',
        'Ticket Size': '500k AED',
        'Preferred Sector': 'Beauty services',
        Timeline: '30 days',
      },
      proof: 'LinkedIn Lead Gen Form submission id 123.',
    });

    const assigned = registry.assignSeller(lead.id, {
      seller: 'Neda',
      reason: 'High-score investor submitted official LinkedIn form.',
      slaFollowUpDeadline: Date.now() + 86400000,
    });

    expect(assigned.stage).toBe('seller-assigned');
    expect(assigned.sellerAssignment?.brief.consentStatus).toBe('granted');
    expect(assigned.sellerAssignment?.brief.email).toBe('sara@example.com');
    expect(assigned.sellerAssignment?.brief.recommendedNextAction).toMatch(/Lead Gen Form/);
    expect(registry.markMeetingReady(lead.id, 'https://meet.example/investor').stage).toBe('meeting-ready');
    expect(registry.moveToDealRoom(lead.id, 'deal-investor-1').stage).toBe('deal-room-ready');
  });

  it('supports a company ABM path and exposes corporate workbench tabs', () => {
    const registry = new LinkedInLegalGrowthRegistry();
    const lead = registry.addLead({
      id: 'li-company-1',
      name: 'Dubai Hotel Group',
      scope: 'company',
      leadType: 'partner',
      source: 'public company page discovery',
      companyUrl: 'https://linkedin.com/company/dubai-hotel-group',
      companyName: 'Dubai Hotel Group',
      industry: 'Hospitality',
      score: 88,
    });

    registry.selectLegalPath(lead.id, {
      path: 'company-list-abm',
      approvedTemplate: 'Approved Conversation Ad with Lead Gen Form CTA.',
      legalGateRequired: true,
      allowedHours: { startHour: 9, endHour: 18 },
      noBulkMessaging: true,
      manualOnly: false,
      proof: 'Company domain uploaded to LinkedIn Matched Audiences.',
    });
    registry.recordResponse(lead.id, {
      message: 'Please send B2B partnership details.',
      consentGranted: true,
      email: 'bd@examplehotel.com',
      proof: 'Decision maker replied yes to Conversation Ad CTA.',
    });
    registry.assignSeller(lead.id, {
      seller: 'Omid',
      reason: 'Company partner reply with consent.',
      slaFollowUpDeadline: Date.now() + 43200000,
    });

    const workbench = registry.buildWorkbench('Omid');
    expect(workbench.tabs['corporate-partner-leads']).toHaveLength(1);
    expect(workbench.tabs['hot-leads'][0].brief.companyUrl).toContain('/company/');
    expect(workbench.tools.some((tool) => tool.name === 'LinkedIn Matched Audiences')).toBe(true);
  });

  it('blocks scraping, guessed emails, bulk messaging, unsuitable paths, and opt-out follow-up', () => {
    const registry = new LinkedInLegalGrowthRegistry();
    const lead = registry.addLead({ id: 'li-1', name: 'Ali Buyer', scope: 'personal', source: 'manual public profile review' });
    registry.classify(lead.id, { leadType: 'buyer', score: 80 });

    expect(() =>
      registry.selectLegalPath(lead.id, {
        path: 'company-list-abm',
        approvedTemplate: 'Wrong path',
        legalGateRequired: true,
        allowedHours: { startHour: 9, endHour: 17 },
        noBulkMessaging: true,
        manualOnly: true,
        proof: 'No proof',
      })
    ).toThrow(/not suitable/);

    expect(() =>
      registry.selectLegalPath(lead.id, {
        path: 'connection-request',
        approvedTemplate: 'Bulk invite everyone',
        legalGateRequired: true,
        allowedHours: { startHour: 9, endHour: 17 },
        noBulkMessaging: false,
        manualOnly: true,
        proof: 'Approved template',
      })
    ).toThrow(/bulk messaging/);

    const blocked = registry.addContactPoint(lead.id, {
      channel: 'email',
      value: 'ali@example.com',
      source: 'guessed from name and company',
      confidence: 0.2,
      consentStatus: 'none',
      proof: 'guessed email pattern',
      lastAction: 'none',
      nextAllowedAction: 'archive',
    });
    expect(blocked.stage).toBe('blocked');

    const opted = registry.addLead({ id: 'li-optout', name: 'No Contact', scope: 'personal', leadType: 'buyer', source: 'manual public profile review', score: 90 });
    registry.recordOptOut(opted.id, 'User clicked not interested.');
    expect(() => registry.score(opted.id, 95)).toThrow(/opted out/);
  });

  it('allows legally sourced no-reply phone handoff to seller for manual review', () => {
    const registry = new LinkedInLegalGrowthRegistry();
    const lead = registry.addLead({
      id: 'li-phone-1',
      name: 'Public Company Owner',
      scope: 'company',
      leadType: 'seller',
      source: 'public company website contact page linked from LinkedIn',
      score: 60,
    });
    registry.addContactPoint(lead.id, {
      channel: 'phone',
      value: '+971500000002',
      source: 'public company website contact page',
      confidence: 0.9,
      consentStatus: 'pending',
      proof: 'Phone visible on official company contact page.',
      lastAction: 'LinkedIn path received no reply',
      nextAllowedAction: 'seller-call',
    });

    const assigned = registry.assignSeller(lead.id, {
      seller: 'Reza',
      reason: 'No LinkedIn reply; legally sourced company phone should go to seller for manual follow-up.',
      slaFollowUpDeadline: Date.now() + 86400000,
      forceNoReplyPhoneHandoff: true,
    });

    expect(assigned.stage).toBe('seller-assigned');
    expect(assigned.sellerAssignment?.brief.phone).toBe('+971500000002');
    expect(assigned.sellerAssignment?.brief.recommendedNextAction).toMatch(/ABM|company-list|Lead Gen Form/);
  });
});

import { InvestorAcquisitionRegistry } from '../src/modules/investorAcquisition';

describe('investorAcquisition', () => {
  it('exposes all 20 stage-one tools with unsafe items converted into guarded/replaced capabilities', () => {
    const registry = new InvestorAcquisitionRegistry();
    const tools = registry.listTools();

    expect(tools).toHaveLength(20);
    expect(tools.find((tool) => tool.id === 14)?.blockedCapabilities.join(' ')).toMatch(/fake accounts/i);
    expect(tools.find((tool) => tool.id === 15)?.blockedCapabilities.join(' ')).toMatch(/Detection avoidance/i);
    expect(tools.find((tool) => tool.id === 20)?.safeReplacement).toMatch(/QR\/NFC/);
  });

  it('scores an opted-in investor signal and creates a compliant outreach plan', () => {
    const registry = new InvestorAcquisitionRegistry();
    const lead = registry.registerLead({
      id: 'lead-1',
      fullName: 'Investor One',
      source: 'lead_gen_form',
      sourceProof: 'Meta Lead Gen Form consent id lgf-1',
      consentGranted: true,
      message: 'میخوام سرمایهگذاری کنم و سرمایهگذاری مطمئن میخوام',
      declaredInterests: ['درآمد غیرفعال'],
      investorAmount: 250000,
      channels: ['whatsapp', 'email'],
      now: 100,
    });

    expect(lead.evaluation.complianceStatus).toBe('allowed');
    expect(lead.evaluation.priority).toBe('hot');
    expect(lead.evaluation.triggeredIntent).toBe('investment-intent');
    expect(lead.evaluation.persona).toBe('risk-averse-investor');
    expect(lead.outreachPlan.join(' ')).toMatch(/official APIs/);
  });

  it('blocks scraped, fake-account, anti-detection, private-monitoring, and face-recognition sources', () => {
    const registry = new InvestorAcquisitionRegistry();

    for (const source of ['scraped_contact', 'fake_account', 'anti_detection', 'private_group', 'face_recognition'] as const) {
      const evaluation = registry.evaluateSignal({
        source,
        sourceProof: 'test source proof',
        message: 'میخوام سرمایهگذاری کنم',
        consentGranted: true,
      });

      expect(evaluation.complianceStatus).toBe('blocked');
      expect(evaluation.priority).toBe('blocked');
      expect(evaluation.allowedActions[0]).toMatch(/Do not contact/);
    }
  });

  it('creates a 20-tool playbook with explicit compliance rules', () => {
    const registry = new InvestorAcquisitionRegistry();
    const playbook = registry.createPlaybook({
      id: 'pb-1',
      name: 'Stage 1',
      objective: 'Acquire investor leads lawfully',
      region: 'GCC',
      channels: ['website', 'linkedin'],
      now: 100,
    });

    expect(playbook.toolIds).toHaveLength(20);
    expect(playbook.complianceRules.join(' ')).toMatch(/No fake\/purchased accounts/);
    expect(registry.metrics().playbooks).toBe(1);
  });
});

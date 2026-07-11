import { Channel, ChannelAccount } from '../types/domain';

/**
 * Channel / account map module.
 *
 * Defines, for every external platform mentioned in the brief (Google, X,
 * Telegram, WhatsApp, Instagram, LinkedIn, Facebook, YouTube, Email, Meta
 * Ads, Forums, phone, in-person, website), who owns the account, what its
 * goal and KPI are, and what access level is granted. This is the missing
 * "map" that lets a technical team wire up real API credentials per channel
 * without guessing ownership or purpose.
 */

export class ChannelAccountRegistry {
  private accounts = new Map<string, ChannelAccount>();

  private key(channel: Channel, accountHandle: string): string {
    return `${channel}:${accountHandle}`;
  }

  register(account: ChannelAccount): void {
    this.accounts.set(this.key(account.channel, account.accountHandle), account);
  }

  get(channel: Channel, accountHandle: string): ChannelAccount | undefined {
    return this.accounts.get(this.key(channel, accountHandle));
  }

  listByChannel(channel: Channel): ChannelAccount[] {
    return Array.from(this.accounts.values()).filter((a) => a.channel === channel);
  }

  listActive(): ChannelAccount[] {
    return Array.from(this.accounts.values()).filter((a) => a.active);
  }

  deactivate(channel: Channel, accountHandle: string): void {
    const account = this.get(channel, accountHandle);
    if (account) {
      account.active = false;
    }
  }

  all(): ChannelAccount[] {
    return Array.from(this.accounts.values());
  }
}

/**
 * Default channel map covering every platform named in the requirements.
 * Owners/handles are placeholders ("TBD-*") meant to be filled in by the
 * technical/ops team; the structure itself is what was previously missing.
 */
export function buildDefaultChannelMap(): ChannelAccountRegistry {
  const registry = new ChannelAccountRegistry();

  const defaults: Array<Omit<ChannelAccount, 'active'>> = [
    { channel: 'google', accountHandle: 'google-business-profile', owner: 'TBD-marketing', role: 'owner', goal: 'Search & Maps discovery', kpi: 'Profile views -> calls', accessLevel: 'admin' },
    { channel: 'x', accountHandle: '@maniworld', owner: 'TBD-social', role: 'responder', goal: 'Brand awareness & DMs', kpi: 'DM response rate', accessLevel: 'editor' },
    { channel: 'telegram', accountHandle: '@maniworld_support', owner: 'TBD-sales', role: 'responder', goal: 'Direct lead chat', kpi: 'First response time', accessLevel: 'editor' },
    { channel: 'whatsapp', accountHandle: 'whatsapp-business-main', owner: 'TBD-sales', role: 'responder', goal: 'Direct lead chat', kpi: 'First response time', accessLevel: 'editor' },
    { channel: 'instagram', accountHandle: '@maniworld', owner: 'TBD-social', role: 'responder', goal: 'Discovery & DMs', kpi: 'DM-to-lead rate', accessLevel: 'editor' },
    { channel: 'linkedin', accountHandle: 'company/maniworld', owner: 'TBD-b2b', role: 'owner', goal: 'B2B outreach', kpi: 'InMail reply rate', accessLevel: 'editor' },
    { channel: 'facebook', accountHandle: 'maniworld', owner: 'TBD-social', role: 'responder', goal: 'Community & ads', kpi: 'Lead-form completion', accessLevel: 'editor' },
    { channel: 'youtube', accountHandle: 'ManiWorldChannel', owner: 'TBD-content', role: 'owner', goal: 'Educational content & trust', kpi: 'Watch-to-lead rate', accessLevel: 'editor' },
    { channel: 'meta-ads', accountHandle: 'meta-ads-account', owner: 'TBD-growth', role: 'owner', goal: 'Paid acquisition', kpi: 'CPL / CAC', accessLevel: 'admin' },
    { channel: 'email', accountHandle: 'hello@maniworld.example', owner: 'TBD-sales', role: 'responder', goal: 'Formal follow-up & docs', kpi: 'Open & reply rate', accessLevel: 'editor' },
    { channel: 'forum', accountHandle: 'community-forums', owner: 'TBD-community', role: 'moderator', goal: 'Competitor & community discovery', kpi: 'Mentions converted', accessLevel: 'read-only' },
    { channel: 'phone', accountHandle: 'sales-line-main', owner: 'TBD-sales', role: 'responder', goal: 'Direct call qualification', kpi: 'Call-to-meeting rate', accessLevel: 'editor' },
    { channel: 'in-person', accountHandle: 'front-desk', owner: 'TBD-ops', role: 'responder', goal: 'Walk-in intake', kpi: 'Walk-in-to-booking rate', accessLevel: 'editor' },
    { channel: 'website', accountHandle: 'maniworld.example', owner: 'TBD-marketing', role: 'owner', goal: 'Primary lead capture', kpi: 'Form conversion rate', accessLevel: 'admin' },
  ];

  for (const account of defaults) {
    registry.register({ ...account, active: true });
  }

  return registry;
}

import { Lead, ScoreBreakdown, Channel } from '../types/domain';

/**
 * Lead scoring module.
 *
 * A transparent, explainable scoring model: every factor and its weight
 * is visible in `ScoreBreakdown`, so sales/ops can audit *why* a lead
 * received a given score instead of trusting an opaque black box.
 */

const CHANNEL_WEIGHTS: Record<Channel, number> = {
  google: 20,
  website: 20,
  linkedin: 18,
  whatsapp: 15,
  telegram: 15,
  instagram: 12,
  facebook: 10,
  email: 10,
  x: 8,
  youtube: 8,
  'meta-ads': 12,
  forum: 6,
  phone: 20,
  'in-person': 25,
};

const QUALIFIED_THRESHOLD = 50;

export function scoreLead(lead: Lead): ScoreBreakdown {
  const channelWeight = CHANNEL_WEIGHTS[lead.channel] ?? 5;
  const hasEmail = lead.email ? 10 : 0;
  const messageQuality = scoreMessageQuality(lead.message);
  const utmQuality = lead.utm?.campaign ? 10 : lead.utm?.source ? 5 : 0;
  const consentGranted = lead.consent === 'granted' ? 10 : 0;

  const total = channelWeight + hasEmail + messageQuality + utmQuality + consentGranted;

  return {
    channelWeight,
    hasEmail,
    messageQuality,
    utmQuality,
    consentGranted,
    total,
  };
}

function scoreMessageQuality(message?: string): number {
  if (!message) return 0;
  const length = message.trim().length;
  if (length === 0) return 0;
  if (length < 15) return 5;
  if (length < 80) return 15;
  return 25;
}

/** A lead is considered a "potential applicant" worth active follow-up once it crosses this threshold. */
export function isPotentialApplicant(breakdown: ScoreBreakdown): boolean {
  return breakdown.total >= QUALIFIED_THRESHOLD;
}

export function applyScoreToLead(lead: Lead): Lead {
  const scoreBreakdown = scoreLead(lead);
  return {
    ...lead,
    score: scoreBreakdown.total,
    scoreBreakdown,
  };
}

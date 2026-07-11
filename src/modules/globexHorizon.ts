/**
 * Globex Horizon industrial sales system.
 *
 * The requested operating model is represented as executable CRM state:
 * 37 targets across 6 groups, monthly revenue goals, daily team workflow,
 * KPI thresholds, daily reporting, and a compliance gate that replaces
 * scraping/fake/private/purchased-contact tactics with consent-first,
 * official-API or manual public-business workflows.
 */

export type GlobexTargetGroupId =
  | 'investment'
  | 'business-acquisition'
  | 'salon-booking'
  | 'freelancer-network'
  | 'bridal-contracts'
  | 'financial-projects';

export type GlobexComplianceStatus = 'allowed' | 'guarded' | 'replaced' | 'blocked';
export type GlobexReadinessStatus = 'ready' | 'needs-input' | 'blocked';
export type GlobexTeamId = 'discovery' | 'communications' | 'operations';

export interface GlobexRevenueLine {
  id: string;
  label: string;
  monthlyTargetAed: number;
  percentage: number;
}

export interface GlobexTarget {
  id: string;
  groupId: GlobexTargetGroupId;
  label: string;
  monthlyGoal: string;
  revenueTargetAed?: number;
  searchSources: string[];
  keyMessage: string;
  safeAcquisitionPath: string[];
  complianceStatus: GlobexComplianceStatus;
  blockedTactics: string[];
}

export interface GlobexTargetGroup {
  id: GlobexTargetGroupId;
  label: string;
  objective: string;
  monthlyTargetAed?: number;
  targets: GlobexTarget[];
}

export interface GlobexTeamRole {
  id: string;
  teamId: GlobexTeamId;
  title: string;
  responsibility: string;
  dailyGoal: string;
  workingHours: string;
}

export interface GlobexWorkflowBlock {
  startsAt: string;
  label: string;
  actions: string[];
}

export interface GlobexKpiThreshold {
  id: string;
  label: string;
  dailyTarget: number;
  unit: string;
  alertBelow?: number;
}

export interface GlobexDailyReportInput {
  id?: string;
  date: string;
  discoveredLeads: number;
  aiQualifiedLeads: number;
  salonBookings: number;
  successfulCalls: number;
  bridalContracts: number;
  freelancerInterviews: number;
  investorMeetings: number;
  revenueAed: number;
  averageResponseMinutes: number;
  customerSatisfaction: number;
  notes?: string;
  now?: number;
}

export interface GlobexDailyReport extends GlobexDailyReportInput {
  id: string;
  createdAt: number;
  progressToDailyRevenueTarget: number;
  alerts: string[];
}

export interface GlobexMetrics {
  targetCount: number;
  monthlyRevenueTargetAed: number;
  dailyRevenueTargetAed: number;
  reports: number;
  latestRevenueAed: number;
  latestProgressToDailyRevenueTarget: number;
  latestAlerts: number;
  readiness: GlobexReadinessStatus;
}

export interface GlobexSourceEvaluation {
  status: GlobexComplianceStatus;
  reason: string;
  allowedPath: string[];
}

export interface GlobexMissionPack {
  name: string;
  monthlyRevenueTargetAed: number;
  investmentGoalAed: number;
  revenueLines: GlobexRevenueLine[];
  groups: GlobexTargetGroup[];
  teamRoles: GlobexTeamRole[];
  dailyWorkflow: GlobexWorkflowBlock[];
  kpis: GlobexKpiThreshold[];
  complianceRules: string[];
  ninetyDayPlan: string[];
  deploymentChecklist: string[];
}

export interface GlobexDeploymentManifest {
  packageName: string;
  includes: string[];
  windowsCommands: string[];
  linuxMacCommands: string[];
  runtimeNotes: string[];
}

const MONTHLY_REVENUE_TARGET_AED = 1_000_000;
const INVESTMENT_GOAL_AED = 20_000_000;

export const GLOBEX_REVENUE_LINES: GlobexRevenueLine[] = [
  { id: 'salon-bookings', label: 'Salon bookings', monthlyTargetAed: 600_000, percentage: 60 },
  { id: 'bridal-contracts', label: 'Bridal contracts', monthlyTargetAed: 200_000, percentage: 20 },
  { id: 'investments', label: 'Investments', monthlyTargetAed: 150_000, percentage: 15 },
  { id: 'other-services', label: 'Other services', monthlyTargetAed: 50_000, percentage: 5 },
];

const compliantPath = [
  'Use owned CRM, inbound forms, official lead forms, public business contacts, events with consent, or manual research with source proof.',
  'Score and route the lead before outreach.',
  'Send permission-first messages through official APIs or a logged human seller task.',
  'Stop immediately on opt-out, no reply after the allowed cadence, or missing source proof.',
];

function target(
  id: string,
  groupId: GlobexTargetGroupId,
  label: string,
  monthlyGoal: string,
  searchSources: string[],
  keyMessage: string,
  revenueTargetAed?: number
): GlobexTarget {
  return {
    id,
    groupId,
    label,
    monthlyGoal,
    revenueTargetAed,
    searchSources,
    keyMessage,
    safeAcquisitionPath: compliantPath,
    complianceStatus: searchSources.some((source) => evaluateSourceText(source).status === 'replaced') ? 'guarded' : 'allowed',
    blockedTactics: [
      'fake or purchased social accounts',
      'scraping private/personal contact data',
      'anti-detection automation',
      'bulk cold DMs without consent',
      'private-group monitoring',
    ],
  };
}

export const GLOBEX_TARGETS: GlobexTarget[] = [
  target('T1.1', 'investment', '50K–500K AED investor', '60 investors/month', ['LinkedIn official search', 'AngelList public profiles'], '30-40% projected beauty industry return', 50_000),
  target('T1.2', 'investment', '501K–2M AED investor', '15 investors/month', ['Dubai investor networks', 'chamber events'], 'Exclusive 24-month contract opportunity', 100_000),
  target('T1.3', 'investment', '2M–10M AED investor', '5 investors/month', ['Mubadala public channels', 'Dubai Investment Forum'], 'Investment in 4 luxury salons', 150_000),
  target('T1.4', 'investment', '10M+ AED strategic investor', '1 investor/month', ['private banking introductions with consent', 'family-office events'], 'Strategic regional expansion partner', 300_000),

  target('T2.1', 'business-acquisition', 'Beauty salon acquisition', 'shortlist 4 deals/month', ['Dubizzle public listings', 'licensed business brokers'], 'Fast cash buyer, 7-14 day closing'),
  target('T2.2', 'business-acquisition', 'Nail salon acquisition', 'shortlist 4 deals/month', ['commercial broker referrals', 'public for-sale listings'], 'Loyal-client salons can join Globex network'),
  target('T2.3', 'business-acquisition', 'Spa acquisition', 'shortlist 3 deals/month', ['Bayut commercial listings', 'broker mandates'], 'Equipment-ready spa acquisition path'),
  target('T2.4', 'business-acquisition', 'Men salon acquisition', 'shortlist 3 deals/month', ['public business listings', 'walk-in owner meetings'], 'Prime-location purchase conversation'),
  target('T2.5', 'business-acquisition', 'Beauty clinic acquisition', 'shortlist 2 deals/month', ['medical-license broker referrals', 'public clinic sale listings'], 'Licensed clinic investment review'),
  target('T2.6', 'business-acquisition', 'Beauty academy acquisition', 'shortlist 2 deals/month', ['education-license directories', 'broker referrals'], 'Acquire accredited training pipeline'),
  target('T2.7', 'business-acquisition', 'Cosmetics retail acquisition', 'shortlist 3 deals/month', ['public distributor directories', 'broker referrals'], 'Distribution network purchase path'),
  target('T2.8', 'business-acquisition', 'Hybrid salon acquisition', 'shortlist 3 deals/month', ['public listings', 'broker referrals'], 'Multi-service salon consolidation'),

  target('T3.1', 'salon-booking', 'Elaris bookings', '40 clients/day', ['Google Ads', 'Instagram official ads', 'referral program'], 'Bridal makeup and hair color with first-visit offer', 250_000),
  target('T3.2', 'salon-booking', 'Sanctuary bookings', '35 clients/day', ['Google Business Profile', 'Booksy/Shedul integrations', 'hotel partnerships'], 'Nails and massage booking path', 180_000),
  target('T3.3', 'salon-booking', 'Dolce bookings', '30 clients/day', ['Google Maps profile', 'official Meta ads', 'gym partnerships'], 'Hair cut and facial appointment offer', 170_000),
  target('T3.4', 'salon-booking', 'Anota VIP bookings', '15 clients/day', ['VIP referral program', 'hotel concierge partnerships', 'owned CRM'], 'Premium VIP services', 100_000),

  target('T4.1', 'freelancer-network', 'Makeup artists', '180 interviews/month', ['portfolio submissions', 'beauty expo opt-in badges'], '20% commission and monthly projects'),
  target('T4.2', 'freelancer-network', 'Nail technicians', '180 interviews/month', ['official job posts', 'academy referrals'], 'Fixed projects and training support'),
  target('T4.3', 'freelancer-network', 'Hair stylists', '180 interviews/month', ['landing page applications', 'referral program'], 'Client flow and legal support'),
  target('T4.4', 'freelancer-network', 'Facial/spa specialists', '180 interviews/month', ['licensed training centers', 'event opt-ins'], 'VIP project matching'),
  target('T4.5', 'freelancer-network', 'Beauty trainers', '180 interviews/month', ['academy partnerships', 'LinkedIn lead forms'], 'Paid training projects'),

  target('T5.1', 'bridal-contracts', 'Silver bridal package', '50 contracts/month', ['wedding planner referrals', 'lead forms'], '15K AED wedding-day package', 750_000),
  target('T5.2', 'bridal-contracts', 'Gold bridal package', '60 contracts/month', ['venue partnerships', 'bridal expo opt-ins'], '30K AED three-month prep package', 1_800_000),
  target('T5.3', 'bridal-contracts', 'Diamond bridal package', '40 contracts/month', ['luxury planner referrals', 'hotel partnerships'], '50K AED private team package', 2_000_000),
  target('T5.4', 'bridal-contracts', 'Wedding planner partner channel', '20 active partners/month', ['direct partner agreements', 'event networking'], 'Partner referral commission'),
  target('T5.5', 'bridal-contracts', 'Venue/photographer partner channel', '20 active partners/month', ['public business contacts', 'manual partner outreach'], 'Bundled bride acquisition path'),

  target('P1', 'financial-projects', 'Salon booking revenue', '600,000 AED/month', ['owned booking system', 'ad platforms'], 'Operate salons at target capacity', 600_000),
  target('P2', 'financial-projects', 'Bridal revenue', '200,000 AED/month', ['partner referrals', 'lead forms'], 'Close bridal contracts with deposits', 200_000),
  target('P3', 'financial-projects', 'Investment revenue', '100,000 AED/month', ['investor meetings', 'deal room'], 'Qualified investment consultations', 100_000),
  target('P4', 'financial-projects', 'Product sales', '50,000 AED/month', ['salon upsell', 'website'], 'Retail products per appointment', 50_000),
  target('P5', 'financial-projects', 'Training sales', '25,000 AED/month', ['academy funnel', 'freelancer network'], 'Paid beauty training packages', 25_000),
  target('P6', 'financial-projects', 'Consulting', '10,000 AED/month', ['business consultations', 'website'], 'Beauty business consulting', 10_000),
  target('P7', 'financial-projects', 'Brand partnerships', '5,000 AED/month', ['brand outreach', 'media kit'], 'Compliant brand collaboration', 5_000),
  target('P8', 'financial-projects', 'In-salon advertising', '3,000 AED/month', ['partner offers', 'venue screens'], 'Ad placements inside salons', 3_000),
  target('P9', 'financial-projects', 'Equipment rental', '3,000 AED/month', ['freelancer network', 'partner salons'], 'Beauty equipment rentals', 3_000),
  target('P10', 'financial-projects', 'Online services', '2,000 AED/month', ['website checkout', 'online consults'], 'Remote consultation products', 2_000),
  target('P11', 'financial-projects', 'Other services', '2,000 AED/month', ['manual manager-defined offers'], 'Other approved revenue', 2_000),
];

export const GLOBEX_TEAM_ROLES: GlobexTeamRole[] = [
  { id: 'discovery-manager', teamId: 'discovery', title: 'Discovery Manager', responsibility: 'Manage compliant discovery engines and quality scoring.', dailyGoal: '700 sourced leads with proof', workingHours: '09:00-18:00' },
  { id: 'discovery-assistant-1', teamId: 'discovery', title: 'Discovery Assistant 1', responsibility: 'Investment, business acquisition and salon sources.', dailyGoal: '500 qualified leads', workingHours: '09:00-18:00' },
  { id: 'discovery-assistant-2', teamId: 'discovery', title: 'Discovery Assistant 2', responsibility: 'Bridal, freelancer and partner sources.', dailyGoal: '300 qualified leads', workingHours: '09:00-18:00' },
  { id: 'comms-manager', teamId: 'communications', title: 'Communications Manager', responsibility: 'Coordinate scripts, response SLA and seller handoff.', dailyGoal: 'under 5 minute response time', workingHours: '09:00-21:00' },
  { id: 'whatsapp-investor-agent', teamId: 'communications', title: 'Investor WhatsApp Agent', responsibility: 'Respond to opted-in investors.', dailyGoal: '20 effective conversations', workingHours: '10:00-19:00' },
  { id: 'whatsapp-salon-agent', teamId: 'communications', title: 'Salon Booking Agent', responsibility: 'Confirm salon bookings through approved channels.', dailyGoal: '120 bookings', workingHours: '09:00-21:00' },
  { id: 'bridal-call-agent', teamId: 'communications', title: 'Bridal Call Agent', responsibility: 'Consult brides and close deposits.', dailyGoal: '50 calls / 5 contracts', workingHours: '11:00-20:00' },
  { id: 'freelancer-call-agent', teamId: 'communications', title: 'Freelancer Call Agent', responsibility: 'Interview and qualify freelancers.', dailyGoal: '30 interviews', workingHours: '10:00-18:00' },
  { id: 'operations-manager', teamId: 'operations', title: 'Operations Manager', responsibility: 'Manage salon service delivery and quality.', dailyGoal: '4.8/5 satisfaction', workingHours: '08:00-21:00' },
  { id: 'salon-coordinator-1', teamId: 'operations', title: 'Elaris & Sanctuary Coordinator', responsibility: 'Monitor service quality and upsells.', dailyGoal: '95% service completion', workingHours: '08:00-20:00' },
  { id: 'salon-coordinator-2', teamId: 'operations', title: 'Dolce & Anota Coordinator', responsibility: 'Manage staff and VIP execution.', dailyGoal: '30% upsell rate', workingHours: '09:00-21:00' },
  { id: 'technical-support', teamId: 'operations', title: 'Technical Support', responsibility: 'Maintain server, APIs, backups and manual fallback.', dailyGoal: 'daily system check complete', workingHours: '10:00-18:00' },
];

export const GLOBEX_DAILY_WORKFLOW: GlobexWorkflowBlock[] = [
  { startsAt: '08:00', label: 'Start of day', actions: ['Check APIs/server/database', 'Review yesterday report', 'Set daily goals', '15-minute team standup'] },
  { startsAt: '09:00', label: 'Discovery and first contact', actions: ['Run sources 1-7', 'Collect morning leads', 'Follow up yesterday leads', 'Reply to overnight messages'] },
  { startsAt: '12:00', label: 'Analysis and adjustment', actions: ['Review morning performance', 'Adjust afternoon strategy', 'Resolve technical issues'] },
  { startsAt: '14:00', label: 'High-intensity communications', actions: ['Investor and bride calls', 'Warm lead follow-up', 'Close contracts', 'Run sources 8-14'] },
  { startsAt: '18:00', label: 'Salon peak operations', actions: ['Serve booked customers', 'Upsell products/packages', 'Book next-day appointments'] },
  { startsAt: '20:00', label: 'Daily reporting', actions: ['Update CRM', 'Submit team reports', 'Calculate KPIs', 'Set next-day plan'] },
];

export const GLOBEX_KPIS: GlobexKpiThreshold[] = [
  { id: 'quality-leads', label: 'High-quality leads', dailyTarget: 700, unit: 'leads', alertBelow: 350 },
  { id: 'ai-qualified', label: 'AI score > 70', dailyTarget: 300, unit: 'leads', alertBelow: 150 },
  { id: 'salon-bookings', label: 'Salon bookings', dailyTarget: 120, unit: 'bookings', alertBelow: 60 },
  { id: 'successful-calls', label: 'Successful calls', dailyTarget: 200, unit: 'calls', alertBelow: 100 },
  { id: 'bridal-contracts', label: 'Bridal contracts', dailyTarget: 5, unit: 'contracts', alertBelow: 3 },
  { id: 'freelancer-interviews', label: 'Freelancer interviews', dailyTarget: 30, unit: 'interviews', alertBelow: 15 },
  { id: 'response-time', label: 'Response time', dailyTarget: 5, unit: 'minutes max' },
  { id: 'customer-satisfaction', label: 'Customer satisfaction', dailyTarget: 4.8, unit: 'stars' },
];

export function evaluateSourceText(source: string): GlobexSourceEvaluation {
  const normalized = source.toLowerCase();
  if (/fake|anti[-\s]?detection|private group|face recognition|purchased/.test(normalized)) {
    return {
      status: 'blocked',
      reason: 'This source would rely on fake identity, private monitoring, purchased data, or evasion.',
      allowedPath: ['Do not contact.', 'Replace with opt-in lead forms, partner referrals, official ads, or manually verified public business contacts.'],
    };
  }
  if (/scrap|scrap(e|ing)|followers|commenters|google maps reviews/.test(normalized)) {
    return {
      status: 'replaced',
      reason: 'Automated scraping or harvesting personal engagement/contact data is not used.',
      allowedPath: ['Use official APIs where permitted.', 'Use public business listings manually with source proof.', 'Use lead forms, ads, referrals, or consented event scans.'],
    };
  }
  if (/public|official|lead form|owned|consent|broker|referral|event|partner|manual/.test(normalized)) {
    return {
      status: 'allowed',
      reason: 'The source can be used when source proof, consent/legitimate public business context, and opt-out are recorded.',
      allowedPath: compliantPath,
    };
  }
  return {
    status: 'guarded',
    reason: 'Source needs manager/legal review before use.',
    allowedPath: ['Collect source proof.', 'Confirm public-business or opt-in basis.', 'Route to manager review before outreach.'],
  };
}

function buildGroups(): GlobexTargetGroup[] {
  const groupMeta: Array<Omit<GlobexTargetGroup, 'targets'>> = [
    { id: 'investment', label: 'Investment', objective: 'Attract 20M AED investment in the first 6 months.', monthlyTargetAed: 150_000 },
    { id: 'business-acquisition', label: 'Business acquisition', objective: 'Buy 4 salons/businesses in the first 3 months.' },
    { id: 'salon-booking', label: 'Salon booking', objective: 'Reach 120 daily salon clients.', monthlyTargetAed: 600_000 },
    { id: 'freelancer-network', label: 'Freelancer network', objective: 'Build a 900-person freelancer network in month 1.' },
    { id: 'bridal-contracts', label: 'Bridal contracts', objective: 'Close 5 bridal contracts daily.', monthlyTargetAed: 200_000 },
    { id: 'financial-projects', label: 'Financial projects', objective: 'Track 11 monthly revenue streams to 1M AED.', monthlyTargetAed: 1_000_000 },
  ];

  return groupMeta.map((group) => ({
    ...group,
    targets: GLOBEX_TARGETS.filter((targetItem) => targetItem.groupId === group.id),
  }));
}

export class GlobexHorizonRegistry {
  private reports = new Map<string, GlobexDailyReport>();

  getMissionPack(): GlobexMissionPack {
    return {
      name: 'Globex Horizon Industrial Sales System',
      monthlyRevenueTargetAed: MONTHLY_REVENUE_TARGET_AED,
      investmentGoalAed: INVESTMENT_GOAL_AED,
      revenueLines: [...GLOBEX_REVENUE_LINES],
      groups: buildGroups(),
      teamRoles: [...GLOBEX_TEAM_ROLES],
      dailyWorkflow: [...GLOBEX_DAILY_WORKFLOW],
      kpis: [...GLOBEX_KPIS],
      complianceRules: [
        'No fake or purchased social accounts.',
        'No scraping personal contacts, private groups, followers, commenters, or reviews for unsolicited outreach.',
        'Use official platform APIs, ads, lead forms, owned CRM, partner referrals, public business contacts, or event opt-ins.',
        'Every contact must keep source proof, consent/legal basis, response SLA, and opt-out status.',
        'Manual fallback is allowed only as a logged human task with permission-first wording.',
      ],
      ninetyDayPlan: [
        'Weeks 1-2: install, train team, test sources with limited compliant data.',
        'Weeks 3-4: start at 30% capacity and tune scripts/KPIs.',
        'Weeks 5-8: scale to 70% capacity, add approved sources, expand team.',
        'Weeks 9-12: full team, full KPI monitoring, revenue optimization.',
      ],
      deploymentChecklist: [
        'npm install',
        'npm run build',
        'set MW_ADMIN_API_KEY and MW_CREDENTIALS_KEY',
        'npm start',
        'open /entrance and enter the admin API key',
      ],
    };
  }

  listTargets(groupId?: GlobexTargetGroupId): GlobexTarget[] {
    return GLOBEX_TARGETS.filter((targetItem) => !groupId || targetItem.groupId === groupId);
  }

  getTarget(id: string): GlobexTarget | undefined {
    return GLOBEX_TARGETS.find((targetItem) => targetItem.id === id);
  }

  evaluateSource(source: string): GlobexSourceEvaluation {
    if (!source.trim()) throw new Error('source is required.');
    return evaluateSourceText(source);
  }

  recordDailyReport(input: GlobexDailyReportInput): GlobexDailyReport {
    if (!input.date) throw new Error('date is required.');
    const numbers: Array<[keyof GlobexDailyReportInput, string]> = [
      ['discoveredLeads', 'discoveredLeads'],
      ['aiQualifiedLeads', 'aiQualifiedLeads'],
      ['salonBookings', 'salonBookings'],
      ['successfulCalls', 'successfulCalls'],
      ['bridalContracts', 'bridalContracts'],
      ['freelancerInterviews', 'freelancerInterviews'],
      ['investorMeetings', 'investorMeetings'],
      ['revenueAed', 'revenueAed'],
      ['averageResponseMinutes', 'averageResponseMinutes'],
      ['customerSatisfaction', 'customerSatisfaction'],
    ];
    for (const [key, label] of numbers) {
      const value = input[key];
      if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
        throw new Error(`${label} must be a non-negative number.`);
      }
    }

    const dailyTarget = MONTHLY_REVENUE_TARGET_AED / 30;
    const report: GlobexDailyReport = {
      ...input,
      id: input.id ?? `globex-report-${this.reports.size + 1}`,
      createdAt: input.now ?? Date.now(),
      progressToDailyRevenueTarget: Math.round((input.revenueAed / dailyTarget) * 100),
      alerts: this.buildAlerts(input),
    };
    this.reports.set(report.id, report);
    return report;
  }

  listDailyReports(): GlobexDailyReport[] {
    return [...this.reports.values()];
  }

  metrics(): GlobexMetrics {
    const latest = this.listDailyReports().at(-1);
    return {
      targetCount: GLOBEX_TARGETS.length,
      monthlyRevenueTargetAed: MONTHLY_REVENUE_TARGET_AED,
      dailyRevenueTargetAed: Math.round(MONTHLY_REVENUE_TARGET_AED / 30),
      reports: this.reports.size,
      latestRevenueAed: latest?.revenueAed ?? 0,
      latestProgressToDailyRevenueTarget: latest?.progressToDailyRevenueTarget ?? 0,
      latestAlerts: latest?.alerts.length ?? 0,
      readiness: GLOBEX_TARGETS.length === 37 ? 'ready' : 'needs-input',
    };
  }

  deploymentManifest(): GlobexDeploymentManifest {
    return {
      packageName: 'globex-horizon-executable.zip',
      includes: ['dist/', 'public/', 'migrations/', 'package.json', 'package-lock.json', '.env.example', 'README.md'],
      windowsCommands: [
        'npm install',
        'npm run build',
        '$env:MW_ADMIN_API_KEY="change-me"',
        '$env:MW_CREDENTIALS_KEY="<secure-32-byte-key-or-long-secret>"',
        'npm start',
      ],
      linuxMacCommands: [
        'npm install',
        'npm run build',
        'MW_ADMIN_API_KEY=change-me MW_CREDENTIALS_KEY=$(openssl rand -hex 32) npm start',
      ],
      runtimeNotes: [
        'DATABASE_URL is optional; without it data is in-memory and reset on restart.',
        'The dashboard is served at /dashboard after the /entrance API-key handoff.',
        'Use npm run package:zip to build and create the release ZIP.',
      ],
    };
  }

  private buildAlerts(input: GlobexDailyReportInput): string[] {
    const alerts: string[] = [];
    if (input.discoveredLeads < 700) alerts.push('Discovery below 700 daily leads.');
    if (input.aiQualifiedLeads < 300) alerts.push('AI-qualified leads below 300.');
    if (input.salonBookings < 120) alerts.push('Salon bookings below 120 daily target.');
    if (input.successfulCalls < 200) alerts.push('Successful calls below 200.');
    if (input.bridalContracts < 5) alerts.push('Bridal contracts below 5.');
    if (input.freelancerInterviews < 30) alerts.push('Freelancer interviews below 30.');
    if (input.averageResponseMinutes > 5) alerts.push('Response time above 5 minutes.');
    if (input.customerSatisfaction < 4.8) alerts.push('Customer satisfaction below 4.8/5.');
    return alerts;
  }
}

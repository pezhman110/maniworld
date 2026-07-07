import {
  AudienceRoute,
  CompliancePolicy,
  CompliancePolicyRule,
  CompliancePolicyRuleKind,
  CompliancePolicyScope,
  IntakeSource,
} from '../types/domain';

/**
 * Compliance policy module.
 *
 * Every acquisition route runs in parallel with the others, but each one
 * (and, separately, how the person conducting online/in-person sessions
 * must behave) is gated by an explicit, admin-editable list of "must" and
 * "must-not" statements. The list is set once at the start, then every
 * later outreach cycle must explicitly re-confirm it - either "same as
 * before" or a revised list - before that cycle's outreach may proceed.
 * All rules and routes are data-driven: new must/must-not statements can
 * be added from the dashboard/API without a code change.
 */

const VALID_ROUTES: AudienceRoute[] = ['direct-network', 'job-posting', 'resume-intake'];
const VALID_SCOPES: CompliancePolicyScope[] = ['route', 'interview-conduct'];
const VALID_RULE_KINDS: CompliancePolicyRuleKind[] = ['must', 'must-not'];

function requireNonEmpty(value: string | undefined, field: string): string {
  if (!value || !value.trim()) throw new Error(`"${field}" is required.`);
  return value;
}

function requireValidRoute(route: AudienceRoute): void {
  if (!VALID_ROUTES.includes(route)) {
    throw new Error(`Invalid route "${route}".`);
  }
}

function requireValidScope(scope: CompliancePolicyScope): void {
  if (!VALID_SCOPES.includes(scope)) {
    throw new Error(`Invalid policy scope "${scope}".`);
  }
}

function requireValidRules(rules: CompliancePolicyRule[]): void {
  if (!rules || rules.length === 0) {
    throw new Error('At least one must/must-not rule is required.');
  }
  for (const rule of rules) {
    requireNonEmpty(rule.id, 'rule.id');
    requireNonEmpty(rule.text, 'rule.text');
    if (!VALID_RULE_KINDS.includes(rule.kind)) {
      throw new Error(`Invalid rule kind "${rule.kind}" for rule "${rule.id}".`);
    }
  }
}

export class CompliancePolicyNotFoundError extends Error {
  constructor(id: string) {
    super(`Compliance policy "${id}" not found.`);
    this.name = 'CompliancePolicyNotFoundError';
  }
}

export class CompliancePolicyRegistry {
  private policies = new Map<string, CompliancePolicy>();

  /** Defines the initial must/must-not list for a route (or its interview-conduct rules) - version 1, confirmed now. */
  define(params: {
    id: string;
    scope: CompliancePolicyScope;
    route: AudienceRoute;
    audienceProfileId?: string;
    rules: CompliancePolicyRule[];
    now?: number;
  }): CompliancePolicy {
    requireNonEmpty(params.id, 'id');
    requireValidScope(params.scope);
    requireValidRoute(params.route);
    requireValidRules(params.rules);
    if (this.policies.has(params.id)) {
      throw new Error(`A compliance policy with id "${params.id}" already exists.`);
    }
    const now = params.now ?? Date.now();
    const policy: CompliancePolicy = {
      id: params.id,
      scope: params.scope,
      route: params.route,
      audienceProfileId: params.audienceProfileId,
      rules: params.rules,
      version: 1,
      lastConfirmedAt: now,
      createdAt: now,
      active: true,
    };
    this.policies.set(policy.id, policy);
    return policy;
  }

  private mustGet(id: string): CompliancePolicy {
    const policy = this.policies.get(id);
    if (!policy) throw new CompliancePolicyNotFoundError(id);
    return policy;
  }

  /** Re-confirms the existing rule set as still in effect for the next outreach cycle, without changing it. */
  confirmSame(id: string, now: number = Date.now()): CompliancePolicy {
    const policy = this.mustGet(id);
    policy.lastConfirmedAt = now;
    return policy;
  }

  /** Re-confirms with a revised rule set: bumps the version and records the new list as confirmed now. */
  reviseRules(id: string, rules: CompliancePolicyRule[], now: number = Date.now()): CompliancePolicy {
    const policy = this.mustGet(id);
    requireValidRules(rules);
    policy.rules = rules;
    policy.version += 1;
    policy.lastConfirmedAt = now;
    return policy;
  }

  /** Adds a single must/must-not statement to an existing policy without requiring a full rule-set replace. */
  addRule(id: string, rule: CompliancePolicyRule, now: number = Date.now()): CompliancePolicy {
    const policy = this.mustGet(id);
    requireNonEmpty(rule.id, 'rule.id');
    requireNonEmpty(rule.text, 'rule.text');
    if (!VALID_RULE_KINDS.includes(rule.kind)) {
      throw new Error(`Invalid rule kind "${rule.kind}" for rule "${rule.id}".`);
    }
    if (policy.rules.some((r) => r.id === rule.id)) {
      throw new Error(`Policy "${id}" already has a rule with id "${rule.id}".`);
    }
    policy.rules = [...policy.rules, rule];
    policy.version += 1;
    policy.lastConfirmedAt = now;
    return policy;
  }

  removeRule(id: string, ruleId: string, now: number = Date.now()): CompliancePolicy {
    const policy = this.mustGet(id);
    const remaining = policy.rules.filter((r) => r.id !== ruleId);
    if (remaining.length === policy.rules.length) {
      throw new Error(`Policy "${id}" has no rule with id "${ruleId}".`);
    }
    if (remaining.length === 0) {
      throw new Error('Cannot remove the last rule from a policy; at least one must/must-not rule is required.');
    }
    policy.rules = remaining;
    policy.version += 1;
    policy.lastConfirmedAt = now;
    return policy;
  }

  /** True when this policy's rules have not been (re-)confirmed within `cycleMs` of `now` and need re-confirming. */
  needsReconfirmation(id: string, cycleMs: number, now: number = Date.now()): boolean {
    const policy = this.mustGet(id);
    return now - policy.lastConfirmedAt >= cycleMs;
  }

  get(id: string): CompliancePolicy | undefined {
    return this.policies.get(id);
  }

  remove(id: string): boolean {
    return this.policies.delete(id);
  }

  listForRoute(route: AudienceRoute, scope?: CompliancePolicyScope): CompliancePolicy[] {
    return [...this.policies.values()].filter(
      (p) => p.active && p.route === route && (!scope || p.scope === scope)
    );
  }

  list(onlyActive = true): CompliancePolicy[] {
    const all = [...this.policies.values()];
    return onlyActive ? all.filter((p) => p.active) : all;
  }
}

/**
 * Automatically determines which acquisition route a lead/candidate should
 * be worked through, based purely on how they entered the pipeline - so
 * the route (and therefore the policy and workflow applied to them) is
 * derived, not manually guessed:
 *  - found via network search -> 'direct-network'
 *  - applied to a job ad/campaign -> 'job-posting'
 *  - submitted (or had submitted) a resume/CV/other data -> 'resume-intake'
 */
export function deriveRouteFromIntakeSource(source: IntakeSource): AudienceRoute {
  switch (source) {
    case 'network-search':
      return 'direct-network';
    case 'job-application':
      return 'job-posting';
    case 'resume-submission':
      return 'resume-intake';
    default: {
      const exhaustiveCheck: never = source;
      throw new Error(`Unknown intake source "${exhaustiveCheck}".`);
    }
  }
}

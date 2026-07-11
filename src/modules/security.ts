import { AccessControlEntry, UserRole, DataRetentionPolicy } from '../types/domain';

/**
 * Security & compliance module.
 *
 * Provides simple role-based access control (RBAC) checks and data
 * retention policy lookups so personal data (leads, interaction logs,
 * session recordings) isn't kept indefinitely without a defined policy.
 */

const ROLE_ACTIONS: Record<UserRole, string[]> = {
  admin: ['*'],
  sales: ['lead:read', 'lead:write', 'booking:read', 'booking:write', 'interaction:read', 'interaction:write'],
  agent: ['lead:read', 'interaction:read', 'interaction:write'],
  viewer: ['lead:read', 'booking:read', 'interaction:read'],
};

export class AccessControlRegistry {
  private entries = new Map<string, AccessControlEntry>();

  grant(userId: string, role: UserRole): AccessControlEntry {
    const entry: AccessControlEntry = { userId, role, allowedActions: ROLE_ACTIONS[role] };
    this.entries.set(userId, entry);
    return entry;
  }

  revoke(userId: string): void {
    this.entries.delete(userId);
  }

  can(userId: string, action: string): boolean {
    const entry = this.entries.get(userId);
    if (!entry) return false;
    return entry.allowedActions.includes('*') || entry.allowedActions.includes(action);
  }

  get(userId: string): AccessControlEntry | undefined {
    return this.entries.get(userId);
  }
}

export const DEFAULT_RETENTION_POLICIES: DataRetentionPolicy[] = [
  { entity: 'lead', retentionDays: 730 },
  { entity: 'interaction', retentionDays: 365 },
  { entity: 'recording', retentionDays: 90 },
];

export function getRetentionPolicy(
  entity: DataRetentionPolicy['entity'],
  policies: DataRetentionPolicy[] = DEFAULT_RETENTION_POLICIES
): DataRetentionPolicy | undefined {
  return policies.find((p) => p.entity === entity);
}

export function isExpired(
  entity: DataRetentionPolicy['entity'],
  createdAt: number,
  now: number = Date.now(),
  policies: DataRetentionPolicy[] = DEFAULT_RETENTION_POLICIES
): boolean {
  const policy = getRetentionPolicy(entity, policies);
  if (!policy) return false;
  const ageDays = (now - createdAt) / (24 * 60 * 60 * 1000);
  return ageDays > policy.retentionDays;
}

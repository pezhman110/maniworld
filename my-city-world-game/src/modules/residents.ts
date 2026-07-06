import { Resident, ResidentKind, ResidentMood, ResidentRole } from '../types/domain';
import { SafetyRejection } from '../types/domain';

/**
 * Residents (plan block 4): the heart of the idea — people, animals, and
 * roles (driver, neighbor, grandmother, …) that live in the child's city.
 * Enforces the safety rule at the type/validation level: only a short
 * nickname is ever stored, never a full/last name, address, or other
 * precise real-world identifier.
 */
const LAST_NAME_PATTERN = /\s{1,}\S+\s+\S+/; // more than one space-separated word suggests first+last name
const ADDRESS_HINT_PATTERN = /\d{2,}|street|ave(nue)?|خیابان|کوچه|پلاک|شارع/i;

export function validateNickname(nickname: string): SafetyRejection | undefined {
  const trimmed = nickname.trim();
  if (!trimmed) {
    return { reason: 'precise-real-identifier', detail: 'Nickname must not be empty.' };
  }
  if (trimmed.split(/\s+/).length > 1) {
    return { reason: 'last-name-detected', detail: `Nickname "${nickname}" looks like a full name; use a short nickname only.` };
  }
  if (ADDRESS_HINT_PATTERN.test(trimmed) || LAST_NAME_PATTERN.test(nickname)) {
    return { reason: 'address-detected', detail: `Nickname "${nickname}" appears to contain address-like details.` };
  }
  return undefined;
}

export class ResidentRegistry {
  private residents = new Map<string, Resident>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `resident_${Date.now()}_${this.sequence}`;
  }

  add(
    cityId: string,
    kind: ResidentKind,
    nickname: string,
    avatarRef: string,
    mood: ResidentMood,
    options: { role?: ResidentRole; note?: string; locationNodeId?: string } = {},
    createdAt: number = Date.now()
  ): Resident {
    const rejection = validateNickname(nickname);
    if (rejection) {
      throw new Error(`Resident rejected (${rejection.reason}): ${rejection.detail}`);
    }
    const resident: Resident = {
      id: this.nextId(),
      cityId,
      kind,
      nickname: nickname.trim(),
      role: options.role,
      avatarRef,
      mood,
      note: options.note,
      locationNodeId: options.locationNodeId,
      createdAt,
    };
    this.residents.set(resident.id, resident);
    return resident;
  }

  updateMood(residentId: string, mood: ResidentMood): Resident {
    const resident = this.getById(residentId);
    resident.mood = mood;
    return resident;
  }

  relocate(residentId: string, locationNodeId: string | undefined): Resident {
    const resident = this.getById(residentId);
    resident.locationNodeId = locationNodeId;
    return resident;
  }

  getById(residentId: string): Resident {
    const resident = this.residents.get(residentId);
    if (!resident) {
      throw new Error(`Unknown resident id: ${residentId}`);
    }
    return resident;
  }

  forCity(cityId: string): Resident[] {
    return [...this.residents.values()].filter((resident) => resident.cityId === cityId);
  }

  hardMoodRatio(cityId: string): number {
    const residents = this.forCity(cityId);
    if (residents.length === 0) {
      return 0;
    }
    const hardCount = residents.filter((resident) => resident.mood === 'hard').length;
    return hardCount / residents.length;
  }
}

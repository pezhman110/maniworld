import { InPersonAssigneeRule, MarketType, MeetingSlot, OnlineResultRecipientRule } from '../types/domain';
import { validateNonNegativeNumber } from './validation';

/**
 * Scheduling & assignment module.
 *
 * Covers three manager-configurable workflows:
 *  1. Free/available meeting-slot capacity at each office/branch (so the
 *     manager tells the system when slots are open, instead of the system
 *     guessing).
 *  2. Who an in-person meeting at the office gets routed to by default.
 *  3. Once an online session has been run, who the result/summary gets
 *     sent to for that market.
 */

export class MeetingSlotRegistry {
  private slots = new Map<string, MeetingSlot>();
  private sequence = 0;

  register(params: { locationId: string; startsAt: number; endsAt: number; capacity: number }): MeetingSlot {
    validateNonNegativeNumber(params.capacity, 'capacity');
    if (params.endsAt <= params.startsAt) {
      throw new Error('Meeting slot "endsAt" must be after "startsAt".');
    }

    this.sequence += 1;
    const slot: MeetingSlot = {
      id: `slot_${this.sequence}`,
      locationId: params.locationId,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      capacity: params.capacity,
      bookedCount: 0,
    };
    this.slots.set(slot.id, slot);
    return slot;
  }

  /** Books one unit of capacity on a slot. Returns false if the slot is already full or missing. */
  book(slotId: string): boolean {
    const slot = this.slots.get(slotId);
    if (!slot || slot.bookedCount >= slot.capacity) return false;
    slot.bookedCount += 1;
    return true;
  }

  release(slotId: string): boolean {
    const slot = this.slots.get(slotId);
    if (!slot || slot.bookedCount <= 0) return false;
    slot.bookedCount -= 1;
    return true;
  }

  remainingCapacity(slotId: string): number {
    const slot = this.slots.get(slotId);
    if (!slot) return 0;
    return Math.max(0, slot.capacity - slot.bookedCount);
  }

  /** Slots for a location with spare capacity, within an optional time window. */
  listAvailable(locationId: string, from?: number, to?: number): MeetingSlot[] {
    return [...this.slots.values()]
      .filter((s) => s.locationId === locationId)
      .filter((s) => s.bookedCount < s.capacity)
      .filter((s) => (from === undefined || s.startsAt >= from) && (to === undefined || s.endsAt <= to))
      .sort((a, b) => a.startsAt - b.startsAt);
  }

  all(): MeetingSlot[] {
    return [...this.slots.values()];
  }
}

export class MeetingAssignmentRegistry {
  private inPersonAssignees = new Map<string, InPersonAssigneeRule>();
  private onlineResultRecipients = new Map<MarketType, OnlineResultRecipientRule>();

  setInPersonAssignee(rule: InPersonAssigneeRule): void {
    this.inPersonAssignees.set(rule.locationId, rule);
  }

  getInPersonAssignee(locationId: string): InPersonAssigneeRule | undefined {
    return this.inPersonAssignees.get(locationId);
  }

  removeInPersonAssignee(locationId: string): boolean {
    return this.inPersonAssignees.delete(locationId);
  }

  listInPersonAssignees(): InPersonAssigneeRule[] {
    return [...this.inPersonAssignees.values()];
  }

  setOnlineResultRecipient(rule: OnlineResultRecipientRule): void {
    this.onlineResultRecipients.set(rule.market, rule);
  }

  getOnlineResultRecipient(market: MarketType): OnlineResultRecipientRule | undefined {
    return this.onlineResultRecipients.get(market);
  }

  removeOnlineResultRecipient(market: MarketType): boolean {
    return this.onlineResultRecipients.delete(market);
  }

  listOnlineResultRecipients(): OnlineResultRecipientRule[] {
    return [...this.onlineResultRecipients.values()];
  }
}

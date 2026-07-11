import { BookingSlot, BookingType } from '../types/domain';

/**
 * Booking module.
 *
 * Manages hall/online-meeting/phone-call/presentation slots with conflict
 * prevention (no double-booking of the same resource) and automatic
 * confirmation.
 */

export class SlotConflictError extends Error {
  constructor(resource: string) {
    super(`Booking conflict: resource "${resource}" is already booked for the requested time range.`);
    this.name = 'SlotConflictError';
  }
}

export class BookingCalendar {
  private slots: BookingSlot[] = [];
  private sequence = 0;

  private overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
    return aStart < bEnd && bStart < aEnd;
  }

  hasConflict(resource: string, startsAt: number, endsAt: number): boolean {
    return this.slots.some(
      (slot) => slot.resource === resource && this.overlaps(slot.startsAt, slot.endsAt, startsAt, endsAt)
    );
  }

  book(params: {
    leadId: string;
    type: BookingType;
    resource: string;
    startsAt: number;
    endsAt: number;
    autoConfirm?: boolean;
  }): BookingSlot {
    const { leadId, type, resource, startsAt, endsAt, autoConfirm = true } = params;

    if (startsAt >= endsAt) {
      throw new Error('Booking start time must be before end time.');
    }

    if (this.hasConflict(resource, startsAt, endsAt)) {
      throw new SlotConflictError(resource);
    }

    this.sequence += 1;
    const slot: BookingSlot = {
      id: `booking_${this.sequence}`,
      leadId,
      type,
      startsAt,
      endsAt,
      resource,
      confirmed: autoConfirm,
    };

    this.slots.push(slot);
    return slot;
  }

  cancel(bookingId: string): boolean {
    const index = this.slots.findIndex((s) => s.id === bookingId);
    if (index === -1) return false;
    this.slots.splice(index, 1);
    return true;
  }

  confirm(bookingId: string): BookingSlot | null {
    const slot = this.slots.find((s) => s.id === bookingId);
    if (!slot) return null;
    slot.confirmed = true;
    return slot;
  }

  getByLead(leadId: string): BookingSlot[] {
    return this.slots.filter((s) => s.leadId === leadId);
  }

  getByResource(resource: string): BookingSlot[] {
    return this.slots.filter((s) => s.resource === resource);
  }

  all(): BookingSlot[] {
    return [...this.slots];
  }
}

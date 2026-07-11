import { BookingCalendar, SlotConflictError } from '../src/modules/booking';

describe('booking', () => {
  it('books a slot successfully and auto-confirms by default', () => {
    const calendar = new BookingCalendar();
    const slot = calendar.book({ leadId: 'lead_1', type: 'hall', resource: 'hall-A', startsAt: 1000, endsAt: 2000 });
    expect(slot.confirmed).toBe(true);
  });

  it('throws SlotConflictError for overlapping bookings on the same resource', () => {
    const calendar = new BookingCalendar();
    calendar.book({ leadId: 'lead_1', type: 'hall', resource: 'hall-A', startsAt: 1000, endsAt: 2000 });
    expect(() =>
      calendar.book({ leadId: 'lead_2', type: 'hall', resource: 'hall-A', startsAt: 1500, endsAt: 2500 })
    ).toThrow(SlotConflictError);
  });

  it('allows non-overlapping bookings on the same resource', () => {
    const calendar = new BookingCalendar();
    calendar.book({ leadId: 'lead_1', type: 'hall', resource: 'hall-A', startsAt: 1000, endsAt: 2000 });
    expect(() =>
      calendar.book({ leadId: 'lead_2', type: 'hall', resource: 'hall-A', startsAt: 2000, endsAt: 3000 })
    ).not.toThrow();
  });

  it('allows overlapping bookings on different resources', () => {
    const calendar = new BookingCalendar();
    calendar.book({ leadId: 'lead_1', type: 'online-meeting', resource: 'room-1', startsAt: 1000, endsAt: 2000 });
    expect(() =>
      calendar.book({ leadId: 'lead_2', type: 'online-meeting', resource: 'room-2', startsAt: 1000, endsAt: 2000 })
    ).not.toThrow();
  });

  it('rejects a booking where start >= end', () => {
    const calendar = new BookingCalendar();
    expect(() =>
      calendar.book({ leadId: 'lead_1', type: 'phone-call', resource: 'line-1', startsAt: 2000, endsAt: 1000 })
    ).toThrow(/start time must be before/);
  });

  it('cancels and confirms bookings', () => {
    const calendar = new BookingCalendar();
    const slot = calendar.book({ leadId: 'lead_1', type: 'hall', resource: 'hall-A', startsAt: 1000, endsAt: 2000, autoConfirm: false });
    expect(slot.confirmed).toBe(false);
    calendar.confirm(slot.id);
    expect(calendar.getByLead('lead_1')[0].confirmed).toBe(true);
    expect(calendar.cancel(slot.id)).toBe(true);
    expect(calendar.getByLead('lead_1')).toHaveLength(0);
  });
});

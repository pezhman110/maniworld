import { MeetingAssignmentRegistry, MeetingSlotRegistry } from '../src/modules/scheduling';

describe('scheduling', () => {
  describe('MeetingSlotRegistry', () => {
    it('registers a slot and books/releases capacity', () => {
      const registry = new MeetingSlotRegistry();
      const slot = registry.register({ locationId: 'office_1', startsAt: 1000, endsAt: 2000, capacity: 2 });

      expect(registry.remainingCapacity(slot.id)).toBe(2);
      expect(registry.book(slot.id)).toBe(true);
      expect(registry.book(slot.id)).toBe(true);
      expect(registry.remainingCapacity(slot.id)).toBe(0);
      expect(registry.book(slot.id)).toBe(false); // full

      expect(registry.release(slot.id)).toBe(true);
      expect(registry.remainingCapacity(slot.id)).toBe(1);
    });

    it('lists only slots with spare capacity for a location, within a time window', () => {
      const registry = new MeetingSlotRegistry();
      const slot1 = registry.register({ locationId: 'office_1', startsAt: 1000, endsAt: 2000, capacity: 1 });
      registry.register({ locationId: 'office_1', startsAt: 3000, endsAt: 4000, capacity: 1 });
      registry.book(slot1.id);

      const available = registry.listAvailable('office_1');
      expect(available).toHaveLength(1);
      expect(available[0].startsAt).toBe(3000);
    });

    it('rejects an invalid slot window', () => {
      const registry = new MeetingSlotRegistry();
      expect(() => registry.register({ locationId: 'office_1', startsAt: 2000, endsAt: 1000, capacity: 1 })).toThrow();
    });
  });

  describe('MeetingAssignmentRegistry', () => {
    it('assigns and retrieves who handles in-person meetings at a location', () => {
      const registry = new MeetingAssignmentRegistry();
      registry.setInPersonAssignee({ locationId: 'office_1', assigneeName: 'Sara', assigneeContact: 'sara@maniworld.com' });

      expect(registry.getInPersonAssignee('office_1')?.assigneeName).toBe('Sara');
      expect(registry.removeInPersonAssignee('office_1')).toBe(true);
      expect(registry.getInPersonAssignee('office_1')).toBeUndefined();
    });

    it('assigns and retrieves who receives online-session results for a market', () => {
      const registry = new MeetingAssignmentRegistry();
      registry.setOnlineResultRecipient({ market: 'investment', recipientName: 'Ali', recipientContact: 'ali@maniworld.com' });

      expect(registry.getOnlineResultRecipient('investment')?.recipientName).toBe('Ali');
      expect(registry.listOnlineResultRecipients()).toHaveLength(1);
    });
  });
});

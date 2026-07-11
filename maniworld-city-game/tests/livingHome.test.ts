import { LivingHomeRegistry } from '../src/modules/livingHome';

describe('LivingHomeRegistry', () => {
  it('adds exhibits and lists them for a child in chronological order', () => {
    const registry = new LivingHomeRegistry();
    registry.addExhibit({ childId: 'c1', room: 'painting-wall', title: 'My House', mediaRef: 'ref1', createdAt: 2 });
    registry.addExhibit({ childId: 'c1', room: 'robot-garage', title: 'Robot Blue', mediaRef: 'ref2', createdAt: 1 });

    const exhibits = registry.exhibitsForChild('c1');
    expect(exhibits.map((e) => e.title)).toEqual(['Robot Blue', 'My House']);
  });

  it('filters exhibits by room', () => {
    const registry = new LivingHomeRegistry();
    registry.addExhibit({ childId: 'c1', room: 'painting-wall', title: 'A', mediaRef: 'ref' });
    registry.addExhibit({ childId: 'c1', room: 'robot-garage', title: 'B', mediaRef: 'ref' });

    expect(registry.exhibitsForChildInRoom('c1', 'painting-wall')).toHaveLength(1);
  });

  it('computes room counts covering all ten rooms', () => {
    const registry = new LivingHomeRegistry();
    registry.addExhibit({ childId: 'c1', room: 'honor-board', title: 'Badge', mediaRef: 'ref' });

    const counts = registry.roomCounts('c1');
    expect(Object.keys(counts)).toHaveLength(10);
    expect(counts['honor-board']).toBe(1);
    expect(counts['city-diary']).toBe(0);
  });

  it('does not mix exhibits between children', () => {
    const registry = new LivingHomeRegistry();
    registry.addExhibit({ childId: 'c1', room: 'painting-wall', title: 'A', mediaRef: 'ref' });
    registry.addExhibit({ childId: 'c2', room: 'painting-wall', title: 'B', mediaRef: 'ref' });

    expect(registry.exhibitsForChild('c1')).toHaveLength(1);
  });
});

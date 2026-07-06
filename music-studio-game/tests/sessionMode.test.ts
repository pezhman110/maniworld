import { MusicSessionRegistry, InvalidPartAssignmentError } from '../src/modules/sessionMode';
import { SongCatalogRegistry } from '../src/modules/songCatalog';

describe('MusicSessionRegistry', () => {
  it('starts a solo session where the single participant covers every part', () => {
    const registry = new MusicSessionRegistry();
    const session = registry.startSolo({ songId: 'song-sleepy-star', participantId: 'child_1' });

    expect(session.mode).toBe('solo');
    expect(session.selectedBy).toBe('child');
    expect(session.participantIds).toEqual(['child_1']);
    expect(session.partAssignments).toHaveLength(1);
    expect(session.partAssignments[0].participantId).toBe('child_1');
  });

  it('starts a group session and round-robins parts across participants', () => {
    const registry = new MusicSessionRegistry();
    const session = registry.startGroup({
      songId: 'song-super-team', // 4 parts
      hostParticipantId: 'child_1',
      participantIds: ['child_1', 'child_2'],
    });

    expect(session.mode).toBe('group');
    expect(session.selectedBy).toBe('coach-or-teacher');
    expect(session.partAssignments).toHaveLength(4);
    expect(session.partAssignments.map((p) => p.participantId)).toEqual([
      'child_1',
      'child_2',
      'child_1',
      'child_2',
    ]);
  });

  it('rejects a group session with fewer than two participants', () => {
    const registry = new MusicSessionRegistry();
    expect(() =>
      registry.startGroup({ songId: 'song-super-team', hostParticipantId: 'child_1', participantIds: ['child_1'] })
    ).toThrow(InvalidPartAssignmentError);
  });

  it('reassigns a part to a different participant already in the session', () => {
    const registry = new MusicSessionRegistry();
    const session = registry.startGroup({
      songId: 'song-friendly-lion', // 2 parts
      hostParticipantId: 'child_1',
      participantIds: ['child_1', 'child_2'],
    });

    registry.reassignPart(session.id, 0, 'child_2');
    expect(registry.getById(session.id).partAssignments[0].participantId).toBe('child_2');
  });

  it('rejects reassigning a part to someone outside the session', () => {
    const registry = new MusicSessionRegistry();
    const session = registry.startGroup({
      songId: 'song-friendly-lion',
      hostParticipantId: 'child_1',
      participantIds: ['child_1', 'child_2'],
    });

    expect(() => registry.reassignPart(session.id, 0, 'stranger')).toThrow(InvalidPartAssignmentError);
  });

  it('marks a session completed and lists sessions per participant', () => {
    const registry = new MusicSessionRegistry(new SongCatalogRegistry());
    const session = registry.startSolo({ songId: 'song-silly-socks', participantId: 'child_9' });
    registry.markCompleted(session.id, 12345);

    expect(registry.getById(session.id).completedAt).toBe(12345);
    expect(registry.sessionsForParticipant('child_9')).toHaveLength(1);
  });
});

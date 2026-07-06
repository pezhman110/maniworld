import { MusicSessionRegistry } from '../src/modules/sessionMode';
import { VoiceRecordingRegistry, InvalidRecordingTransitionError } from '../src/modules/voiceRecording';

describe('VoiceRecordingRegistry', () => {
  it('initializes a pending recording slot for every part in a session', () => {
    const sessions = new MusicSessionRegistry();
    const session = sessions.startGroup({
      songId: 'song-friendly-lion', // 2 parts
      hostParticipantId: 'child_1',
      participantIds: ['child_1', 'child_2'],
    });

    const recordings = new VoiceRecordingRegistry();
    const slots = recordings.initializeForSession(session);

    expect(slots).toHaveLength(2);
    expect(slots.every((slot) => slot.status === 'pending')).toBe(true);
    expect(recordings.isSessionReadyToMix(session.id)).toBe(false);
  });

  it('moves a recording through recorded -> approved', () => {
    const sessions = new MusicSessionRegistry();
    const session = sessions.startSolo({ songId: 'song-sleepy-star', participantId: 'child_1' });
    const recordings = new VoiceRecordingRegistry();
    const [slot] = recordings.initializeForSession(session);

    recordings.recordTake(slot.id, 'asset://take-1');
    expect(recordings.getById(slot.id).status).toBe('recorded');

    recordings.approve(slot.id);
    expect(recordings.getById(slot.id).status).toBe('approved');
    expect(recordings.isSessionReadyToMix(session.id)).toBe(true);
  });

  it('supports rejecting a recorded take, requiring a re-record', () => {
    const sessions = new MusicSessionRegistry();
    const session = sessions.startSolo({ songId: 'song-sleepy-star', participantId: 'child_1' });
    const recordings = new VoiceRecordingRegistry();
    const [slot] = recordings.initializeForSession(session);

    recordings.recordTake(slot.id, 'asset://take-1');
    recordings.reject(slot.id);
    expect(recordings.getById(slot.id).status).toBe('rejected');
    expect(recordings.isSessionReadyToMix(session.id)).toBe(false);
  });

  it('rejects approving/rejecting a recording that has not been recorded yet', () => {
    const sessions = new MusicSessionRegistry();
    const session = sessions.startSolo({ songId: 'song-sleepy-star', participantId: 'child_1' });
    const recordings = new VoiceRecordingRegistry();
    const [slot] = recordings.initializeForSession(session);

    expect(() => recordings.approve(slot.id)).toThrow(InvalidRecordingTransitionError);
    expect(() => recordings.reject(slot.id)).toThrow(InvalidRecordingTransitionError);
  });

  it('is only ready to mix once EVERY part is approved', () => {
    const sessions = new MusicSessionRegistry();
    const session = sessions.startGroup({
      songId: 'song-friendly-lion',
      hostParticipantId: 'child_1',
      participantIds: ['child_1', 'child_2'],
    });
    const recordings = new VoiceRecordingRegistry();
    const [first, second] = recordings.initializeForSession(session);

    recordings.recordTake(first.id, 'asset://a');
    recordings.approve(first.id);
    expect(recordings.isSessionReadyToMix(session.id)).toBe(false);

    recordings.recordTake(second.id, 'asset://b');
    recordings.approve(second.id);
    expect(recordings.isSessionReadyToMix(session.id)).toBe(true);
  });
});

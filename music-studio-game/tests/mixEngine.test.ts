import { MusicSessionRegistry } from '../src/modules/sessionMode';
import { VoiceRecordingRegistry } from '../src/modules/voiceRecording';
import { MixEngine, MixNotReadyError } from '../src/modules/mixEngine';

function readySoloSetup() {
  const sessions = new MusicSessionRegistry();
  const session = sessions.startSolo({ songId: 'song-sleepy-star', participantId: 'child_1' });
  const recordings = new VoiceRecordingRegistry();
  const [slot] = recordings.initializeForSession(session);
  recordings.recordTake(slot.id, 'asset://take-1');
  recordings.approve(slot.id);
  return { session, recordings };
}

describe('MixEngine', () => {
  it('prepares a mix as not-ready when parts are still missing approval', () => {
    const sessions = new MusicSessionRegistry();
    const session = sessions.startSolo({ songId: 'song-sleepy-star', participantId: 'child_1' });
    const recordings = new VoiceRecordingRegistry();
    recordings.initializeForSession(session);

    const mix = new MixEngine(recordings);
    const output = mix.prepare(session.id);
    expect(output.status).toBe('not-ready');
    expect(output.includedRecordingIds).toHaveLength(0);
  });

  it('prepares a mix as ready-to-mix once every part is approved', () => {
    const { session, recordings } = readySoloSetup();
    const mix = new MixEngine(recordings);
    const output = mix.prepare(session.id);

    expect(output.status).toBe('ready-to-mix');
    expect(output.includedRecordingIds).toHaveLength(1);
  });

  it('finalizes a ready mix with the final audio asset reference', () => {
    const { session, recordings } = readySoloSetup();
    const mix = new MixEngine(recordings);
    const output = mix.prepare(session.id);

    const finalized = mix.finalizeMix(output.id, 'asset://final-mix');
    expect(finalized.status).toBe('mixed');
    expect(finalized.finalAudioAssetRef).toBe('asset://final-mix');
    expect(mix.outputsForSession(session.id)).toHaveLength(1);
  });

  it('refuses to finalize a mix that was never ready', () => {
    const sessions = new MusicSessionRegistry();
    const session = sessions.startSolo({ songId: 'song-sleepy-star', participantId: 'child_1' });
    const recordings = new VoiceRecordingRegistry();
    recordings.initializeForSession(session);

    const mix = new MixEngine(recordings);
    const output = mix.prepare(session.id);
    expect(() => mix.finalizeMix(output.id, 'asset://final-mix')).toThrow(MixNotReadyError);
  });
});

import { MusicSessionRegistry } from '../src/modules/sessionMode';
import { VoiceRecordingRegistry } from '../src/modules/voiceRecording';
import { MixEngine } from '../src/modules/mixEngine';
import { VideoRecapService, RecapRequiresMixedOutputError } from '../src/modules/videoRecap';

function fullyMixedSoloSetup() {
  const sessions = new MusicSessionRegistry();
  const session = sessions.startSolo({ songId: 'song-sleepy-star', participantId: 'child_1' });
  const recordings = new VoiceRecordingRegistry();
  const [slot] = recordings.initializeForSession(session);
  recordings.recordTake(slot.id, 'asset://take-1');
  recordings.approve(slot.id);

  const mix = new MixEngine(recordings);
  const output = mix.prepare(session.id);
  const finalized = mix.finalizeMix(output.id, 'asset://final-mix');

  return { session, finalized };
}

describe('VideoRecapService', () => {
  it('refuses to generate a recap for a mix that is not yet mixed', () => {
    const sessions = new MusicSessionRegistry();
    const session = sessions.startSolo({ songId: 'song-sleepy-star', participantId: 'child_1' });
    const recordings = new VoiceRecordingRegistry();
    recordings.initializeForSession(session);
    const mix = new MixEngine(recordings);
    const output = mix.prepare(session.id);

    const recapService = new VideoRecapService();
    expect(() => recapService.generate(session, output)).toThrow(RecapRequiresMixedOutputError);
  });

  it('generates a recap referencing the session participants once mixed', () => {
    const { session, finalized } = fullyMixedSoloSetup();
    const recapService = new VideoRecapService();
    const recap = recapService.generate(session, finalized);

    expect(recap.sessionId).toBe(session.id);
    expect(recap.mixOutputId).toBe(finalized.id);
    expect(recap.participantIds).toEqual(['child_1']);
    expect(recapService.isRendered(recap.id)).toBe(false);
  });

  it('attaches the rendered video asset reference once available', () => {
    const { session, finalized } = fullyMixedSoloSetup();
    const recapService = new VideoRecapService();
    const recap = recapService.generate(session, finalized);

    recapService.attachRenderedAsset(recap.id, 'asset://recap-video');
    expect(recapService.isRendered(recap.id)).toBe(true);
    expect(recapService.recapsForSession(session.id)).toHaveLength(1);
  });
});

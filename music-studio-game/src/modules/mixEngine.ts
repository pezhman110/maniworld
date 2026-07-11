import { MixOutput } from '../types/domain';
import { VoiceRecordingRegistry } from './voiceRecording';

/**
 * Mix engine module.
 *
 * Models the "combine all approved part recordings into one final track"
 * step. The actual audio mixing happens in an external audio service; this
 * module owns the readiness check (every part approved) and the resulting
 * `MixOutput` record referencing the final asset once that external service
 * reports back.
 */
export class MixNotReadyError extends Error {
  constructor(sessionId: string) {
    super(`Session ${sessionId} is not ready to mix — not every part has an approved recording yet.`);
    this.name = 'MixNotReadyError';
  }
}

export class UnknownMixOutputError extends Error {
  constructor(mixOutputId: string) {
    super(`Unknown mix output id: ${mixOutputId}`);
    this.name = 'UnknownMixOutputError';
  }
}

export class MixEngine {
  private outputs = new Map<string, MixOutput>();
  private sequence = 0;

  constructor(private recordings: VoiceRecordingRegistry) {}

  private nextId(): string {
    this.sequence += 1;
    return `mix_${Date.now()}_${this.sequence}`;
  }

  /** Creates a mix output placeholder, in "ready-to-mix" or "not-ready" state depending on recordings. */
  prepare(sessionId: string): MixOutput {
    const sessionRecordings = this.recordings.recordingsForSession(sessionId);
    const ready = this.recordings.isSessionReadyToMix(sessionId);
    const output: MixOutput = {
      id: this.nextId(),
      sessionId,
      status: ready ? 'ready-to-mix' : 'not-ready',
      includedRecordingIds: sessionRecordings
        .filter((recording) => recording.status === 'approved')
        .map((recording) => recording.id),
    };
    this.outputs.set(output.id, output);
    return output;
  }

  /**
   * Finalizes the mix once the external audio service returns the mixed
   * asset reference. Throws if the mix wasn't in "ready-to-mix" state
   * (i.e. `prepare` was never called or some part still isn't approved).
   */
  finalizeMix(mixOutputId: string, finalAudioAssetRef: string, mixedAt: number = Date.now()): MixOutput {
    const output = this.getById(mixOutputId);
    if (output.status !== 'ready-to-mix') {
      throw new MixNotReadyError(output.sessionId);
    }
    output.status = 'mixed';
    output.finalAudioAssetRef = finalAudioAssetRef;
    output.mixedAt = mixedAt;
    return output;
  }

  getById(mixOutputId: string): MixOutput {
    const output = this.outputs.get(mixOutputId);
    if (!output) {
      throw new UnknownMixOutputError(mixOutputId);
    }
    return output;
  }

  outputsForSession(sessionId: string): MixOutput[] {
    return [...this.outputs.values()].filter((output) => output.sessionId === sessionId);
  }
}

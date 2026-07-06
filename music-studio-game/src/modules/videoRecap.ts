import { MixOutput, MusicSession, VideoRecap } from '../types/domain';

/**
 * Video recap module.
 *
 * Once a session's mix is finalized, this generates the record for an
 * automatic "behind the scenes" recap video — the participants who built
 * the song plus the final result — ready to feed into the viral-share loop.
 * Rendering the actual video is an external video-render service's job; this
 * module only creates/tracks the recap record and its readiness.
 */
export class RecapRequiresMixedOutputError extends Error {
  constructor(mixOutputId: string) {
    super(`Mix output ${mixOutputId} must be "mixed" before a recap video can be generated.`);
    this.name = 'RecapRequiresMixedOutputError';
  }
}

export class UnknownVideoRecapError extends Error {
  constructor(videoRecapId: string) {
    super(`Unknown video recap id: ${videoRecapId}`);
    this.name = 'UnknownVideoRecapError';
  }
}

export class VideoRecapService {
  private recaps = new Map<string, VideoRecap>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `recap_${Date.now()}_${this.sequence}`;
  }

  /** Creates the recap record for a finished session + its finalized mix. */
  generate(session: MusicSession, mixOutput: MixOutput, generatedAt: number = Date.now()): VideoRecap {
    if (mixOutput.status !== 'mixed') {
      throw new RecapRequiresMixedOutputError(mixOutput.id);
    }
    const recap: VideoRecap = {
      id: this.nextId(),
      sessionId: session.id,
      mixOutputId: mixOutput.id,
      participantIds: [...session.participantIds],
      generatedAt,
    };
    this.recaps.set(recap.id, recap);
    return recap;
  }

  /** Attaches the rendered video asset reference once the external render service reports back. */
  attachRenderedAsset(videoRecapId: string, videoAssetRef: string): VideoRecap {
    const recap = this.getById(videoRecapId);
    recap.videoAssetRef = videoAssetRef;
    return recap;
  }

  getById(videoRecapId: string): VideoRecap {
    const recap = this.recaps.get(videoRecapId);
    if (!recap) {
      throw new UnknownVideoRecapError(videoRecapId);
    }
    return recap;
  }

  recapsForSession(sessionId: string): VideoRecap[] {
    return [...this.recaps.values()].filter((recap) => recap.sessionId === sessionId);
  }

  isRendered(videoRecapId: string): boolean {
    return Boolean(this.getById(videoRecapId).videoAssetRef);
  }
}

import { MEDIA_FORMAT_SPECS, MediaArtifact, MediaFormatId, MediaFormatSpec } from '../types/domain';

/**
 * Media Outputs (plan block 9, recording + export): the fixed set of
 * destination-matched export formats (story 9:16/15s, short 9:16/60s, long
 * 16:9/<=3min). Real MediaRecorder + PIP + ffmpeg.wasm capture/encoding is
 * out of scope (external browser/runtime capability) — this module only
 * tracks which format was requested and whether the file is ready.
 */
export function getFormatSpec(formatId: MediaFormatId): MediaFormatSpec {
  const spec = MEDIA_FORMAT_SPECS.find((candidate) => candidate.id === formatId);
  if (!spec) {
    throw new Error(`Unknown media format id: ${formatId}`);
  }
  return spec;
}

export class MediaArtifactRegistry {
  private artifacts = new Map<string, MediaArtifact>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `media_${Date.now()}_${this.sequence}`;
  }

  queue(cityId: string, formatId: MediaFormatId, createdAt: number = Date.now()): MediaArtifact {
    getFormatSpec(formatId); // validates the format id
    const artifact: MediaArtifact = {
      id: this.nextId(),
      cityId,
      formatId,
      status: 'queued',
      createdAt,
    };
    this.artifacts.set(artifact.id, artifact);
    return artifact;
  }

  markReady(artifactId: string, fileRef: string): MediaArtifact {
    const artifact = this.getById(artifactId);
    artifact.status = 'ready';
    artifact.fileRef = fileRef;
    return artifact;
  }

  getById(artifactId: string): MediaArtifact {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) {
      throw new Error(`Unknown media artifact id: ${artifactId}`);
    }
    return artifact;
  }

  forCity(cityId: string): MediaArtifact[] {
    return [...this.artifacts.values()].filter((artifact) => artifact.cityId === cityId);
  }
}

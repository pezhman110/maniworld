import { getFormatSpec, MediaArtifactRegistry } from '../src/modules/mediaOutputs';

describe('mediaOutputs', () => {
  it('exposes the three destination-matched formats', () => {
    expect(getFormatSpec('story-9x16-15s').maxDurationSeconds).toBe(15);
    expect(getFormatSpec('short-9x16-60s').maxDurationSeconds).toBe(60);
    expect(getFormatSpec('long-16x9-180s').maxDurationSeconds).toBe(180);
  });

  it('queues a media artifact and marks it ready with a file reference', () => {
    const registry = new MediaArtifactRegistry();
    const artifact = registry.queue('city_1', 'short-9x16-60s');
    expect(artifact.status).toBe('queued');
    registry.markReady(artifact.id, 'file_ref_1');
    expect(registry.getById(artifact.id).status).toBe('ready');
    expect(registry.getById(artifact.id).fileRef).toBe('file_ref_1');
  });

  it('rejects an unknown format id', () => {
    expect(() => getFormatSpec('unknown' as never)).toThrow();
  });
});

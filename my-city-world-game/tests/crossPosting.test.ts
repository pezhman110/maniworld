import { CrossPostRegistry } from '../src/modules/crossPosting';

describe('CrossPostRegistry', () => {
  it('queues destinations with an official API as queued-official-api', () => {
    const registry = new CrossPostRegistry();
    const request = registry.enqueue('media_1', 'manigram');
    expect(request.status).toBe('queued-official-api');
    expect(request.usesOfficialShareApi).toBe(true);
  });

  it('queues destinations without an official organic-content API as manual fallback', () => {
    const registry = new CrossPostRegistry();
    const request = registry.enqueue('media_1', 'tiktok');
    expect(request.status).toBe('queued-manual-fallback');
    expect(request.usesOfficialShareApi).toBe(false);
  });

  it('marks a request as posted', () => {
    const registry = new CrossPostRegistry();
    const request = registry.enqueue('media_1', 'instagram');
    registry.markPosted(request.id);
    expect(registry.getById(request.id).status).toBe('posted');
  });

  it('falls back to manual queueing on failure for official-API destinations', () => {
    const registry = new CrossPostRegistry();
    const request = registry.enqueue('media_1', 'youtube');
    registry.markFailed(request.id);
    expect(registry.getById(request.id).status).toBe('queued-manual-fallback');
  });
});

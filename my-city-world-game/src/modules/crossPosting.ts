import { CrossPostDestination, CrossPostRequest, CrossPostStatus } from '../types/domain';

/**
 * Cross Posting (plan block 9): queues a ready media artifact for
 * distribution to the app's own social surfaces (`/manigram`, the public
 * `/city` gallery) and to external platforms (IG/TikTok/YouTube), always
 * through each destination's *official* share sheet/API — official-API
 * first, manual fallback otherwise. Per this repo's compliance
 * convention, this module never performs scripted/automated posting that
 * would violate a platform's Terms of Service; every entry must be driven
 * by a real user action through an official API or share sheet.
 */
const OFFICIAL_API_DESTINATIONS: ReadonlySet<CrossPostDestination> = new Set(['manigram', 'public-city', 'instagram', 'youtube']);

export class CrossPostRegistry {
  private requests = new Map<string, CrossPostRequest>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `crosspost_${Date.now()}_${this.sequence}`;
  }

  enqueue(mediaArtifactId: string, destination: CrossPostDestination, createdAt: number = Date.now()): CrossPostRequest {
    const usesOfficialShareApi = OFFICIAL_API_DESTINATIONS.has(destination);
    const status: CrossPostStatus = usesOfficialShareApi ? 'queued-official-api' : 'queued-manual-fallback';
    const request: CrossPostRequest = {
      id: this.nextId(),
      mediaArtifactId,
      destination,
      status,
      usesOfficialShareApi,
      createdAt,
      updatedAt: createdAt,
    };
    this.requests.set(request.id, request);
    return request;
  }

  markPosted(requestId: string, updatedAt: number = Date.now()): CrossPostRequest {
    const request = this.getById(requestId);
    request.status = 'posted';
    request.updatedAt = updatedAt;
    return request;
  }

  markFailed(requestId: string, updatedAt: number = Date.now()): CrossPostRequest {
    const request = this.getById(requestId);
    request.status = request.usesOfficialShareApi ? 'queued-manual-fallback' : 'failed';
    request.updatedAt = updatedAt;
    return request;
  }

  getById(requestId: string): CrossPostRequest {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Unknown cross-post request id: ${requestId}`);
    }
    return request;
  }

  forMediaArtifact(mediaArtifactId: string): CrossPostRequest[] {
    return [...this.requests.values()].filter((request) => request.mediaArtifactId === mediaArtifactId);
  }
}

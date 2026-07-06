import { ContentItem, ContentPlatform } from '../types/domain';

/**
 * Social publisher.
 *
 * Attempts to publish a content item's caption to one platform using that
 * platform's *official* content-publishing API for owned business/creator
 * accounts (Meta Graph API for Instagram/Facebook, the LinkedIn UGC Posts
 * API, the TikTok Content Posting API). Snapchat has no public API for
 * organic content publishing, so it is always routed straight to manual
 * fallback.
 *
 * Whenever a platform can't be reached (missing/invalid credentials,
 * network failure, or an unsupported platform like Snapchat), the caller
 * should route the item to the manual-fallback queue instead of failing
 * silently — see `ContentPlanRegistry.listFallbackQueue` and
 * `attemptPublish` below, which always resolves (never throws) with either
 * a `published` or `manual-fallback` outcome so the caller can decide what
 * to show the content team.
 */

export interface PublishResult {
  status: 'published' | 'manual-fallback';
  message: string;
}

export type SocialPublisher = (
  platform: ContentPlatform,
  credentialFields: Record<string, string> | undefined,
  item: Pick<ContentItem, 'caption'>
) => Promise<PublishResult>;

export function createSocialPublisher(fetchImpl: typeof fetch = fetch): SocialPublisher {
  return async (platform, credentialFields, item) => {
    if (platform === 'snapchat') {
      return {
        status: 'manual-fallback',
        message: 'Snapchat has no public API for organic content publishing; post this manually.',
      };
    }
    if (!credentialFields) {
      return {
        status: 'manual-fallback',
        message: `No stored "${platform}" credentials; post this manually and connect the account first.`,
      };
    }
    try {
      switch (platform) {
        case 'instagram':
        case 'facebook': {
          const igUserId = credentialFields.igUserId ?? credentialFields.pageId;
          const accessToken = credentialFields.accessToken;
          if (!igUserId || !accessToken) {
            return {
              status: 'manual-fallback',
              message: `Missing ${platform === 'instagram' ? 'igUserId' : 'pageId'}/accessToken credential fields.`,
            };
          }
          const response = await fetchImpl(
            `https://graph.facebook.com/v19.0/${igUserId}/media?caption=${encodeURIComponent(
              item.caption
            )}&access_token=${encodeURIComponent(accessToken)}`,
            { method: 'POST' }
          );
          if (!response.ok) {
            return {
              status: 'manual-fallback',
              message: `Meta Graph API publish failed with status ${response.status}; post this manually.`,
            };
          }
          return { status: 'published', message: 'Published via Meta Graph API.' };
        }
        case 'linkedin': {
          const accessToken = credentialFields.accessToken;
          const authorUrn = credentialFields.authorUrn;
          if (!accessToken || !authorUrn) {
            return { status: 'manual-fallback', message: 'Missing accessToken/authorUrn credential fields.' };
          }
          const response = await fetchImpl('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              author: authorUrn,
              lifecycleState: 'PUBLISHED',
              specificContent: {
                'com.linkedin.ugc.ShareContent': {
                  shareCommentary: { text: item.caption },
                  shareMediaCategory: 'NONE',
                },
              },
            }),
          });
          if (!response.ok) {
            return {
              status: 'manual-fallback',
              message: `LinkedIn UGC Posts API failed with status ${response.status}; post this manually.`,
            };
          }
          return { status: 'published', message: 'Published via LinkedIn UGC Posts API.' };
        }
        case 'tiktok': {
          const accessToken = credentialFields.accessToken;
          if (!accessToken) {
            return { status: 'manual-fallback', message: 'Missing accessToken credential field.' };
          }
          const response = await fetchImpl('https://open.tiktokapis.com/v2/post/publish/content/init/', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_info: { title: item.caption } }),
          });
          if (!response.ok) {
            return {
              status: 'manual-fallback',
              message: `TikTok Content Posting API failed with status ${response.status}; post this manually.`,
            };
          }
          return { status: 'published', message: 'Published via TikTok Content Posting API.' };
        }
        default:
          return { status: 'manual-fallback', message: `Unsupported platform "${platform}".` };
      }
    } catch (err) {
      return {
        status: 'manual-fallback',
        message: `Could not reach ${platform}'s API (${
          err instanceof Error ? err.message : String(err)
        }); post this manually.`,
      };
    }
  };
}

/**
 * Publishing the "website" destination never involves a third-party network
 * call; the site already renders whatever's in `WebsiteIntegrationRegistry`
 * plus the content queue, so this is always a local success.
 */
export function publishToWebsite(): PublishResult {
  return { status: 'published', message: 'Queued for the company website content feed.' };
}

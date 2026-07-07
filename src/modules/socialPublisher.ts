import { ContentItem, ContentPlatform, InstagramCompanyAd } from '../types/domain';

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

export interface InstagramAdPublishResult {
  status: 'submitted' | 'manual-fallback';
  message: string;
  metaCampaignId?: string;
  metaAdSetId?: string;
  metaCreativeId?: string;
  metaAdId?: string;
}

export type SocialPublisher = (
  platform: ContentPlatform,
  credentialFields: Record<string, string> | undefined,
  item: Pick<ContentItem, 'caption'>
) => Promise<PublishResult>;

export type InstagramAdPublisher = (
  credentialFields: Record<string, string> | undefined,
  ad: InstagramCompanyAd
) => Promise<InstagramAdPublishResult>;

const META_GRAPH_VERSION = 'v19.0';

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
            `https://graph.facebook.com/${META_GRAPH_VERSION}/${igUserId}/media?caption=${encodeURIComponent(
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

          function metaAdObjective(objective: InstagramCompanyAd['objective']): string {
            switch (objective) {
              case 'leads':
                return 'OUTCOME_LEADS';
              case 'messages':
                return 'OUTCOME_ENGAGEMENT';
              case 'awareness':
                return 'OUTCOME_AWARENESS';
              case 'traffic':
              default:
                return 'OUTCOME_TRAFFIC';
            }
          }

          function optimizationGoal(objective: InstagramCompanyAd['objective']): string {
            switch (objective) {
              case 'leads':
                return 'LEAD_GENERATION';
              case 'messages':
                return 'CONVERSATIONS';
              case 'awareness':
                return 'REACH';
              case 'traffic':
              default:
                return 'LINK_CLICKS';
            }
          }

          function buildTargeting(ad: InstagramCompanyAd): Record<string, unknown> {
            const geoLocations = ad.targetLocations.length
              ? { countries: ad.targetLocations.map((location) => location.toUpperCase()) }
              : { countries: ['AE'] };
            return {
              publisher_platforms: ['instagram'],
              instagram_positions: ['stream', 'story', 'reels'],
              geo_locations: geoLocations,
              flexible_spec: ad.targetInterests.length
                ? [{ interests: ad.targetInterests.map((interest, index) => ({ id: String(index + 1), name: interest })) }]
                : undefined,
            };
          }

          async function metaPost(
            fetchImpl: typeof fetch,
            path: string,
            accessToken: string,
            params: Record<string, string>
          ): Promise<{ ok: true; id: string } | { ok: false; status: number }> {
            const body = new URLSearchParams({ ...params, access_token: accessToken });
            const response = await fetchImpl(`https://graph.facebook.com/${META_GRAPH_VERSION}/${path}`, {
              method: 'POST',
              body,
            });
            if (!response.ok) return { ok: false, status: response.status };
            const payload = (await response.json().catch(() => ({}))) as { id?: string };
            return { ok: true, id: payload.id ?? '' };
          }

          /**
           * Creates a paused Instagram-only ad through Meta Marketing API for a company-owned account.
           * Required credentials: accessToken, adAccountId (with or without act_ prefix),
           * pageId, instagramActorId. Missing credentials or API failures route the ad to
           * manual fallback instead of automating browser logins or unsupported actions.
           */
          export function createInstagramAdPublisher(fetchImpl: typeof fetch = fetch): InstagramAdPublisher {
            return async (credentialFields, ad) => {
              if (!credentialFields) {
                return {
                  status: 'manual-fallback',
                  message: 'No stored Instagram credentials; launch this ad manually in Meta Ads Manager.',
                };
              }
              const accessToken = credentialFields.accessToken;
              const adAccountId = credentialFields.adAccountId;
              const pageId = credentialFields.pageId;
              const instagramActorId = credentialFields.instagramActorId ?? credentialFields.igUserId;
              if (!accessToken || !adAccountId || !pageId || !instagramActorId) {
                return {
                  status: 'manual-fallback',
                  message: 'Missing accessToken/adAccountId/pageId/instagramActorId credential fields.',
                };
              }

              const accountPath = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
              try {
                const campaign = await metaPost(fetchImpl, `${accountPath}/campaigns`, accessToken, {
                  name: `${ad.companyName} Instagram Ad - ${ad.id}`,
                  objective: metaAdObjective(ad.objective),
                  status: 'PAUSED',
                  special_ad_categories: '[]',
                });
                if (!campaign.ok) {
                  return {
                    status: 'manual-fallback',
                    message: `Meta Marketing API campaign creation failed with status ${campaign.status}; launch this manually.`,
                  };
                }

                const adSet = await metaPost(fetchImpl, `${accountPath}/adsets`, accessToken, {
                  name: `${ad.companyName} Instagram Ad Set - ${ad.id}`,
                  campaign_id: campaign.id,
                  daily_budget: String(ad.dailyBudgetMinor),
                  billing_event: 'IMPRESSIONS',
                  optimization_goal: optimizationGoal(ad.objective),
                  bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
                  currency: ad.currency,
                  targeting: JSON.stringify(buildTargeting(ad)),
                  status: 'PAUSED',
                });
                if (!adSet.ok) {
                  return {
                    status: 'manual-fallback',
                    message: `Meta Marketing API ad set creation failed with status ${adSet.status}; launch this manually.`,
                    metaCampaignId: campaign.id,
                  };
                }

                const creative = await metaPost(fetchImpl, `${accountPath}/adcreatives`, accessToken, {
                  name: `${ad.companyName} Instagram Creative - ${ad.id}`,
                  object_story_spec: JSON.stringify({
                    page_id: pageId,
                    instagram_actor_id: instagramActorId,
                    link_data: {
                      message: ad.caption,
                      link: ad.landingUrl,
                      picture: ad.mediaUrl,
                      call_to_action: {
                        type: ad.callToAction,
                        value: { link: ad.landingUrl },
                      },
                    },
                  }),
                });
                if (!creative.ok) {
                  return {
                    status: 'manual-fallback',
                    message: `Meta Marketing API creative creation failed with status ${creative.status}; launch this manually.`,
                    metaCampaignId: campaign.id,
                    metaAdSetId: adSet.id,
                  };
                }

                const submittedAd = await metaPost(fetchImpl, `${accountPath}/ads`, accessToken, {
                  name: `${ad.companyName} Instagram Ad - ${ad.id}`,
                  adset_id: adSet.id,
                  creative: JSON.stringify({ creative_id: creative.id }),
                  status: 'PAUSED',
                });
                if (!submittedAd.ok) {
                  return {
                    status: 'manual-fallback',
                    message: `Meta Marketing API ad creation failed with status ${submittedAd.status}; launch this manually.`,
                    metaCampaignId: campaign.id,
                    metaAdSetId: adSet.id,
                    metaCreativeId: creative.id,
                  };
                }

                return {
                  status: 'submitted',
                  message: 'Instagram ad created in Meta Ads Manager as PAUSED for final human review.',
                  metaCampaignId: campaign.id,
                  metaAdSetId: adSet.id,
                  metaCreativeId: creative.id,
                  metaAdId: submittedAd.id,
                };
              } catch (err) {
                return {
                  status: 'manual-fallback',
                  message: `Could not reach Meta Marketing API (${
                    err instanceof Error ? err.message : String(err)
                  }); launch this manually.`,
                };
              }
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

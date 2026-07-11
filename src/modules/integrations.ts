import { MarketType, WebsiteIntegrationConfig } from '../types/domain';

/**
 * Website & pricing integration module.
 *
 * Lets a manager link each market to its live website and price list so
 * the dashboard can surface (and optionally auto-sync) current pricing
 * instead of it living only on the public site.
 */

export class WebsiteIntegrationRegistry {
  private configs = new Map<MarketType, WebsiteIntegrationConfig>();

  set(config: WebsiteIntegrationConfig): WebsiteIntegrationConfig {
    if (!/^https?:\/\//i.test(config.websiteUrl)) {
      throw new Error(`"websiteUrl" must be a valid http(s) URL, got "${config.websiteUrl}".`);
    }
    if (config.priceListUrl && !/^https?:\/\//i.test(config.priceListUrl)) {
      throw new Error(`"priceListUrl" must be a valid http(s) URL, got "${config.priceListUrl}".`);
    }
    this.configs.set(config.market, config);
    return config;
  }

  get(market: MarketType): WebsiteIntegrationConfig | undefined {
    return this.configs.get(market);
  }

  remove(market: MarketType): boolean {
    return this.configs.delete(market);
  }

  all(): WebsiteIntegrationConfig[] {
    return [...this.configs.values()];
  }
}

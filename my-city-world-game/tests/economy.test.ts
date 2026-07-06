import { ShopRegistry, WalletRegistry } from '../src/modules/economy';

describe('economy', () => {
  it('earns and spends coins, tracking the balance', () => {
    const wallet = new WalletRegistry();
    wallet.earn('city_1', 100, 'built-zone');
    wallet.spend('city_1', 40, 'shop:hat');
    expect(wallet.balanceOf('city_1')).toBe(60);
  });

  it('rejects spending more than the current balance', () => {
    const wallet = new WalletRegistry();
    wallet.earn('city_1', 10, 'reward');
    expect(() => wallet.spend('city_1', 20, 'shop:car')).toThrow();
  });

  it('rejects non-positive earn/spend amounts', () => {
    const wallet = new WalletRegistry();
    expect(() => wallet.earn('city_1', 0, 'reward')).toThrow();
    expect(() => wallet.spend('city_1', -5, 'shop:x')).toThrow();
  });

  it('records a shop purchase linked to a resident, deducting from the wallet', () => {
    const wallet = new WalletRegistry();
    const shop = new ShopRegistry();
    wallet.earn('city_1', 100, 'reward');
    const purchase = shop.purchase('city_1', 'Bicycle', 30, wallet, { linkedResidentId: 'resident_1' });
    expect(purchase.linkedResidentId).toBe('resident_1');
    expect(wallet.balanceOf('city_1')).toBe(70);
    expect(shop.forCity('city_1')).toHaveLength(1);
  });
});

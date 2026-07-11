import { ShopPurchase, Wallet, WalletTransaction } from '../types/domain';

/**
 * Economy (extra request): a simple wallet/allowance and shop-purchase
 * ledger so a child can earn coins for city activity and spend them on
 * items tied to residents/buildings — modeled purely as a ledger, with no
 * real payment processing (that would be an unrelated, out-of-scope
 * integration).
 */
export class WalletRegistry {
  private wallets = new Map<string, Wallet>();
  private transactions: WalletTransaction[] = [];
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `wallet_tx_${Date.now()}_${this.sequence}`;
  }

  private ensureWallet(cityId: string): Wallet {
    let wallet = this.wallets.get(cityId);
    if (!wallet) {
      wallet = { cityId, balance: 0 };
      this.wallets.set(cityId, wallet);
    }
    return wallet;
  }

  earn(cityId: string, amount: number, reason: string, createdAt: number = Date.now()): WalletTransaction {
    if (amount <= 0) {
      throw new Error('Earned amount must be positive.');
    }
    const wallet = this.ensureWallet(cityId);
    wallet.balance += amount;
    const transaction: WalletTransaction = { id: this.nextId(), cityId, amount, kind: 'earn', reason, createdAt };
    this.transactions.push(transaction);
    return transaction;
  }

  spend(cityId: string, amount: number, reason: string, createdAt: number = Date.now()): WalletTransaction {
    if (amount <= 0) {
      throw new Error('Spend amount must be positive.');
    }
    const wallet = this.ensureWallet(cityId);
    if (wallet.balance < amount) {
      throw new Error(`Insufficient balance: wallet has ${wallet.balance}, tried to spend ${amount}.`);
    }
    wallet.balance -= amount;
    const transaction: WalletTransaction = { id: this.nextId(), cityId, amount, kind: 'spend', reason, createdAt };
    this.transactions.push(transaction);
    return transaction;
  }

  balanceOf(cityId: string): number {
    return this.ensureWallet(cityId).balance;
  }

  transactionsFor(cityId: string): WalletTransaction[] {
    return this.transactions.filter((transaction) => transaction.cityId === cityId);
  }
}

export class ShopRegistry {
  private purchases: ShopPurchase[] = [];
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `purchase_${Date.now()}_${this.sequence}`;
  }

  purchase(
    cityId: string,
    itemLabel: string,
    cost: number,
    wallet: WalletRegistry,
    options: { linkedResidentId?: string; linkedBuildingId?: string } = {},
    purchasedAt: number = Date.now()
  ): ShopPurchase {
    wallet.spend(cityId, cost, `shop:${itemLabel}`, purchasedAt);
    const purchase: ShopPurchase = {
      id: this.nextId(),
      cityId,
      itemLabel,
      cost,
      linkedResidentId: options.linkedResidentId,
      linkedBuildingId: options.linkedBuildingId,
      purchasedAt,
    };
    this.purchases.push(purchase);
    return purchase;
  }

  forCity(cityId: string): ShopPurchase[] {
    return this.purchases.filter((purchase) => purchase.cityId === cityId);
  }
}

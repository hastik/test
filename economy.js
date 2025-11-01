const DEFAULT_COST_GROWTH = 1.15;
const DEFAULT_CLICK_VALUE = 1;

export class Economy {
  constructor({ buildings, upgrades, costGrowth = DEFAULT_COST_GROWTH, baseClickValue = DEFAULT_CLICK_VALUE }) {
    this.costGrowth = costGrowth;
    this.baseClickValue = baseClickValue;
    this.buildingData = buildings;
    this.buildingMap = new Map(buildings.map((b) => [b.id, b]));
    this.upgradeData = upgrades;
    this.upgradeMap = new Map(upgrades.map((u) => [u.id, u]));
    this.buildings = Object.fromEntries(buildings.map((b) => [b.id, 0]));
    this.purchasedUpgrades = new Set();
    this.resources = 0;
    this.resetDerived();
  }

  resetDerived() {
    this.globalMult = this.clickMult = 1;
    this.buildingMults = {};
    this.costMods = {};
  }

  recalcModifiers() {
    this.resetDerived();
    for (const id of this.purchasedUpgrades) this.applyEffect(this.upgradeMap.get(id)?.effect);
  }

  applyEffect(effect) {
    if (!effect) return;
    if (Array.isArray(effect)) return effect.forEach((entry) => this.applyEffect(entry));
    const { type, target, value } = effect;
    if (type === "mult") {
      if (target === "global") this.globalMult *= value;
      else if (target === "click") this.clickMult *= value;
      else if (target) this.buildingMults[target] = (this.buildingMults[target] ?? 1) * value;
    } else if (type === "discount" && target) {
      this.costMods[target] = (this.costMods[target] ?? 1) * value;
    }
  }

  get resourcesAmount() {
    return this.resources;
  }

  add(amount) {
    this.resources += amount;
  }

  spend(amount) {
    if (this.resources < amount) return false;
    this.resources -= amount;
    return true;
  }

  click() {
    const gain = this.baseClickValue * this.clickMult;
    this.add(gain);
    return gain;
  }

  buildingCount(id) {
    return this.buildings[id] ?? 0;
  }

  buildingCost(id) {
    const data = this.buildingMap.get(id);
    if (!data) return Infinity;
    const growth = Math.pow(this.costGrowth, this.buildingCount(id));
    return Math.ceil(data.baseCost * growth * (this.costMods[id] ?? 1));
  }

  buildingProduction(id) {
    const data = this.buildingMap.get(id);
    const count = this.buildingCount(id);
    if (!data || !count) return 0;
    return count * data.baseRate * (this.buildingMults[id] ?? 1) * this.globalMult;
  }

  buyBuilding(id) {
    const cost = this.buildingCost(id);
    if (!this.spend(cost)) return false;
    this.buildings[id] = this.buildingCount(id) + 1;
    return true;
  }

  buyUpgrade(id) {
    if (this.purchasedUpgrades.has(id)) return false;
    const upgrade = this.upgradeMap.get(id);
    if (!upgrade || !this.spend(upgrade.cost)) return false;
    this.purchasedUpgrades.add(id);
    this.applyEffect(upgrade.effect);
    return true;
  }

  clickPower() {
    return this.baseClickValue * this.clickMult;
  }

  productionRate() {
    return this.buildingData.reduce((total, b) => total + this.buildingProduction(b.id), 0);
  }

  applyOffline(seconds) {
    if (seconds <= 0) return 0;
    const gain = this.productionRate() * seconds;
    if (gain > 0) this.add(gain);
    return gain;
  }

  buildingState(id) {
    const data = this.buildingMap.get(id);
    if (!data) return null;
    const nextCost = this.buildingCost(id);
    return {
      id,
      name: data.name,
      description: data.description,
      owned: this.buildingCount(id),
      nextCost,
      production: this.buildingProduction(id),
      canAfford: this.resources >= nextCost
    };
  }

  upgradeState(id) {
    const data = this.upgradeMap.get(id);
    if (!data) return null;
    const purchased = this.purchasedUpgrades.has(id);
    return {
      id,
      name: data.name,
      description: data.description,
      cost: data.cost,
      purchased,
      canAfford: !purchased && this.resources >= data.cost
    };
  }

  snapshot() {
    return {
      resources: { credits: this.resources },
      buildings: { ...this.buildings },
      upgrades: Object.fromEntries([...this.purchasedUpgrades].map((id) => [id, true]))
    };
  }

  hydrate(snapshot) {
    if (!snapshot) return { elapsed: 0, offlineGain: 0 };
    const stored = snapshot.resources?.credits ?? snapshot.resources?.money ?? 0;
    this.resources = Number.isFinite(stored) ? stored : 0;
    for (const building of this.buildingData) {
      const saved = snapshot.buildings?.[building.id] ?? 0;
      this.buildings[building.id] = Number.isFinite(saved) ? saved : 0;
    }
    this.purchasedUpgrades = new Set();
    if (snapshot.upgrades) {
      for (const [id, owned] of Object.entries(snapshot.upgrades)) {
        if (owned && this.upgradeMap.has(id)) this.purchasedUpgrades.add(id);
      }
    }
    this.recalcModifiers();
    const elapsed = snapshot.time ? Math.max(0, (Date.now() - snapshot.time) / 1000) : 0;
    return { elapsed, offlineGain: this.applyOffline(elapsed) };
  }
}

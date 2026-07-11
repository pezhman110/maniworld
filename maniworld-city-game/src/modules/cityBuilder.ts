import { Building, BuildingType, City, ResourceType } from '../types/domain';

/**
 * City Builder module — the core game loop: build, spend resources, watch
 * the city react (health/green percentage), aligned with the plan's
 * "City Emotions" concept (city reacts emotionally to resource state).
 */
const BUILDING_COSTS: Record<BuildingType, Partial<Record<ResourceType, number>>> = {
  house: { wood: 10 },
  park: { water: 5, wood: 5 },
  library: { wood: 15 },
  school: { wood: 20, energy: 5 },
  'power-plant': { energy: 0, wood: 20 },
  'recycling-station': { wood: 10, energy: 5 },
  'friendship-tower': { wood: 25, 'kindness-points': 5 },
  'festival-square': { wood: 15, energy: 5 },
  garden: { water: 10, 'kindness-points': 2 },
};

export class InsufficientResourcesError extends Error {
  constructor(cityId: string, resource: ResourceType) {
    super(`City ${cityId} does not have enough ${resource} for this building.`);
    this.name = 'InsufficientResourcesError';
  }
}

export class CityRegistry {
  private cities = new Map<string, City>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `city_${Date.now()}_${this.sequence}`;
  }

  private nextBuildingId(): string {
    this.sequence += 1;
    return `building_${Date.now()}_${this.sequence}`;
  }

  createCity(input: { childId: string; name: string; createdAt?: number }): City {
    const city: City = {
      id: this.nextId(),
      childId: input.childId,
      name: input.name,
      resources: { water: 20, energy: 20, wood: 20, 'kindness-points': 0 },
      buildings: [],
      greenPercentage: 0,
      createdAt: input.createdAt ?? Date.now(),
    };
    this.cities.set(city.id, city);
    return city;
  }

  getById(cityId: string): City {
    const city = this.cities.get(cityId);
    if (!city) {
      throw new Error(`Unknown city id: ${cityId}`);
    }
    return city;
  }

  addResources(cityId: string, delta: Partial<Record<ResourceType, number>>): City {
    const city = this.getById(cityId);
    for (const [resource, amount] of Object.entries(delta) as [ResourceType, number][]) {
      city.resources[resource] = Math.max(0, city.resources[resource] + amount);
    }
    return city;
  }

  /** Builds a building, deducting its resource cost. Throws if resources are insufficient. */
  build(cityId: string, type: BuildingType, builtAt: number = Date.now()): Building {
    const city = this.getById(cityId);
    const cost = BUILDING_COSTS[type];
    for (const [resource, amount] of Object.entries(cost) as [ResourceType, number][]) {
      if (city.resources[resource] < amount) {
        throw new InsufficientResourcesError(cityId, resource);
      }
    }
    for (const [resource, amount] of Object.entries(cost) as [ResourceType, number][]) {
      city.resources[resource] -= amount;
    }

    const building: Building = { id: this.nextBuildingId(), type, builtAt, health: 100 };
    city.buildings.push(building);
    this.recomputeGreenPercentage(city);
    return building;
  }

  /** City Emotions: buildings wither if water/energy run out, thrive when resources are healthy. */
  applyEmotionTick(cityId: string): City {
    const city = this.getById(cityId);
    const isThriving = city.resources.water > 0 && city.resources.energy > 0;
    for (const building of city.buildings) {
      building.health = Math.max(0, Math.min(100, building.health + (isThriving ? 5 : -10)));
    }
    this.recomputeGreenPercentage(city);
    return city;
  }

  private recomputeGreenPercentage(city: City): void {
    if (city.buildings.length === 0) {
      city.greenPercentage = 0;
      return;
    }
    const totalHealth = city.buildings.reduce((sum, building) => sum + building.health, 0);
    city.greenPercentage = Math.round(totalHealth / city.buildings.length);
  }
}

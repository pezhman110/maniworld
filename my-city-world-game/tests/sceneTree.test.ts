import { SceneTreeRegistry } from '../src/modules/sceneTree';

describe('SceneTreeRegistry', () => {
  it('builds an unlimited nested tree: city -> zone -> building -> floor -> room -> item', () => {
    const registry = new SceneTreeRegistry();
    const city = registry.createRootCity('My City');
    const zone = registry.addChild(city.id, 'zone', 'Villa neighborhood next to a mall and pool');
    const building = registry.addChild(zone.id, 'building', 'Two-floor villa');
    const floor = registry.addChild(building.id, 'floor', 'Second floor');
    const room = registry.addChild(floor.id, 'room', 'My bedroom');
    const item = registry.placeItem(room.id, 'Bed', { row: 0, col: 0 });

    expect(item.kind).toBe('item');
    const { children } = registry.drillInto(room.id);
    expect(children).toHaveLength(1);
    expect(children[0].id).toBe(item.id);
  });

  it('rejects creating a node under the wrong parent kind', () => {
    const registry = new SceneTreeRegistry();
    const city = registry.createRootCity('My City');
    expect(() => registry.addChild(city.id, 'room', 'Oops')).toThrow();
  });

  it('rejects placing items outside the 8x8 grid', () => {
    const registry = new SceneTreeRegistry();
    const city = registry.createRootCity('City');
    const zone = registry.addChild(city.id, 'zone', 'Zone');
    const building = registry.addChild(zone.id, 'building', 'Building');
    const floor = registry.addChild(building.id, 'floor', 'Floor');
    const room = registry.addChild(floor.id, 'room', 'Room');
    expect(() => registry.placeItem(room.id, 'Item', { row: 8, col: 0 })).toThrow();
    expect(() => registry.placeItem(room.id, 'Item', { row: -1, col: 0 })).toThrow();
  });

  it('rejects placing two items on the same grid cell', () => {
    const registry = new SceneTreeRegistry();
    const city = registry.createRootCity('City');
    const zone = registry.addChild(city.id, 'zone', 'Zone');
    const building = registry.addChild(zone.id, 'building', 'Building');
    const floor = registry.addChild(building.id, 'floor', 'Floor');
    const room = registry.addChild(floor.id, 'room', 'Room');
    registry.placeItem(room.id, 'Bed', { row: 1, col: 1 });
    expect(() => registry.placeItem(room.id, 'Desk', { row: 1, col: 1 })).toThrow();
  });

  it('removes a node and all of its descendants', () => {
    const registry = new SceneTreeRegistry();
    const city = registry.createRootCity('City');
    const zone = registry.addChild(city.id, 'zone', 'Zone');
    const building = registry.addChild(zone.id, 'building', 'Building');
    registry.removeNode(zone.id);
    expect(() => registry.getById(zone.id)).toThrow();
    expect(() => registry.getById(building.id)).toThrow();
    expect(registry.getById(city.id).childIds).toHaveLength(0);
  });

  it('allows drilling down through many levels without any depth ceiling', () => {
    const registry = new SceneTreeRegistry();
    let current = registry.createRootCity('City');
    const kinds: Array<'zone' | 'building' | 'floor' | 'room'> = ['zone', 'building', 'floor', 'room'];
    kinds.forEach((kind) => {
      current = registry.addChild(current.id, kind, `${kind} label`);
    });
    for (let i = 0; i < 8; i += 1) {
      registry.placeItem(current.id, `Item ${i}`, { row: 0, col: i });
    }
    expect(registry.drillInto(current.id).children).toHaveLength(8);
  });
});

import { GridPosition, SCENE_GRID_SIZE, SceneNode, SceneNodeKind } from '../types/domain';

const ALLOWED_PARENT_KIND: Record<SceneNodeKind, SceneNodeKind | undefined> = {
  city: undefined,
  zone: 'city',
  building: 'zone',
  floor: 'building',
  room: 'floor',
  item: 'room',
};

/**
 * Scene Tree (plan block 2): the unlimited, nested location drill-down —
 * City -> Zone -> Building -> Floor -> Room -> 8x8 grid of Items — with no
 * depth ceiling. A child can keep drilling down ("go inside", "go to my
 * room", "put a bed here") forever; nothing here artificially stops them.
 */
export class SceneTreeRegistry {
  private nodes = new Map<string, SceneNode>();
  private sequence = 0;

  private nextId(kind: SceneNodeKind): string {
    this.sequence += 1;
    return `${kind}_${Date.now()}_${this.sequence}`;
  }

  createRootCity(label: string, createdAt: number = Date.now()): SceneNode {
    const node: SceneNode = {
      id: this.nextId('city'),
      kind: 'city',
      label,
      childIds: [],
      createdAt,
    };
    this.nodes.set(node.id, node);
    return node;
  }

  /** Adds a child node under any existing node, validating the kind hierarchy but never a depth cap. */
  addChild(parentId: string, kind: SceneNodeKind, label: string, createdAt: number = Date.now()): SceneNode {
    const parent = this.getById(parentId);
    const expectedParentKind = ALLOWED_PARENT_KIND[kind];
    if (expectedParentKind !== parent.kind) {
      throw new Error(`A '${kind}' node must be created under a '${expectedParentKind}' node, not '${parent.kind}'.`);
    }
    const node: SceneNode = {
      id: this.nextId(kind),
      kind,
      label,
      parentId,
      childIds: [],
      createdAt,
    };
    this.nodes.set(node.id, node);
    parent.childIds.push(node.id);
    return node;
  }

  /** Places an 'item' node on its parent room's 8x8 grid. */
  placeItem(roomId: string, label: string, position: GridPosition, createdAt: number = Date.now()): SceneNode {
    this.assertInsideGrid(position);
    const room = this.getById(roomId);
    if (room.kind !== 'room') {
      throw new Error('Items can only be placed inside a room node.');
    }
    const occupied = room.childIds
      .map((id) => this.getById(id))
      .some((child) => child.gridPosition && child.gridPosition.row === position.row && child.gridPosition.col === position.col);
    if (occupied) {
      throw new Error(`Grid cell (${position.row}, ${position.col}) is already occupied.`);
    }
    const item: SceneNode = {
      id: this.nextId('item'),
      kind: 'item',
      label,
      parentId: roomId,
      childIds: [],
      gridPosition: position,
      createdAt,
    };
    this.nodes.set(item.id, item);
    room.childIds.push(item.id);
    return item;
  }

  moveItem(itemId: string, position: GridPosition): SceneNode {
    this.assertInsideGrid(position);
    const item = this.getById(itemId);
    if (item.kind !== 'item') {
      throw new Error('Only item nodes can be moved on the grid.');
    }
    item.gridPosition = position;
    return item;
  }

  removeNode(nodeId: string): void {
    const node = this.getById(nodeId);
    // Remove all descendants first (unbounded tree, so this recurses fully).
    [...node.childIds].forEach((childId) => this.removeNode(childId));
    if (node.parentId) {
      const parent = this.getById(node.parentId);
      parent.childIds = parent.childIds.filter((id) => id !== nodeId);
    }
    this.nodes.delete(nodeId);
  }

  attachSticker(nodeId: string, stickerId: string): SceneNode {
    const node = this.getById(nodeId);
    node.stickerId = stickerId;
    return node;
  }

  /** Drills into a node, returning it plus its direct children — the "go inside" interaction. */
  drillInto(nodeId: string): { node: SceneNode; children: SceneNode[] } {
    const node = this.getById(nodeId);
    return { node, children: node.childIds.map((id) => this.getById(id)) };
  }

  getById(nodeId: string): SceneNode {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Unknown scene node id: ${nodeId}`);
    }
    return node;
  }

  private assertInsideGrid(position: GridPosition): void {
    if (position.row < 0 || position.row >= SCENE_GRID_SIZE || position.col < 0 || position.col >= SCENE_GRID_SIZE) {
      throw new Error(`Grid position out of bounds: (${position.row}, ${position.col}). Grid is ${SCENE_GRID_SIZE}x${SCENE_GRID_SIZE}.`);
    }
  }

  allNodes(): SceneNode[] {
    return [...this.nodes.values()];
  }
}

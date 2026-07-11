import { LivingHomeExhibit, LivingHomeRoom } from '../types/domain';

/**
 * My Living Home module.
 *
 * Every child has a personal home where every creative output they produce
 * elsewhere in ManiWorld (paintings, storybooks, city videos, music, robots,
 * inventions, kindness-garden entries, honor-board badges, diary pages,
 * weekly albums) is stored and made visible. This is the "home/profile as
 * the center of experience" piece the plan calls out as missing from a
 * pure city-builder: parents don't just see a game level, they see a whole
 * creative home their child built.
 */
export class LivingHomeRegistry {
  private exhibits = new Map<string, LivingHomeExhibit>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `exhibit_${Date.now()}_${this.sequence}`;
  }

  addExhibit(input: {
    childId: string;
    room: LivingHomeRoom;
    title: string;
    mediaRef: string;
    createdAt?: number;
  }): LivingHomeExhibit {
    const exhibit: LivingHomeExhibit = {
      id: this.nextId(),
      childId: input.childId,
      room: input.room,
      title: input.title,
      mediaRef: input.mediaRef,
      createdAt: input.createdAt ?? Date.now(),
    };
    this.exhibits.set(exhibit.id, exhibit);
    return exhibit;
  }

  getById(exhibitId: string): LivingHomeExhibit | undefined {
    return this.exhibits.get(exhibitId);
  }

  exhibitsForChild(childId: string): LivingHomeExhibit[] {
    return [...this.exhibits.values()]
      .filter((exhibit) => exhibit.childId === childId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  exhibitsForChildInRoom(childId: string, room: LivingHomeRoom): LivingHomeExhibit[] {
    return this.exhibitsForChild(childId).filter((exhibit) => exhibit.room === room);
  }

  /** Snapshot of how many exhibits are in every room, for a home "overview" screen. */
  roomCounts(childId: string): Record<LivingHomeRoom, number> {
    const rooms: LivingHomeRoom[] = [
      'painting-wall',
      'storybook-shelf',
      'city-tv',
      'music-piano',
      'robot-garage',
      'invention-room',
      'kindness-garden',
      'honor-board',
      'city-diary',
      'weekly-album',
    ];
    const counts = {} as Record<LivingHomeRoom, number>;
    for (const room of rooms) {
      counts[room] = this.exhibitsForChildInRoom(childId, room).length;
    }
    return counts;
  }
}

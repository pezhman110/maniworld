import { MusicSession, PartAssignment, SessionMode, SongSelector } from '../types/domain';
import { SongCatalogRegistry } from './songCatalog';

/**
 * Session mode module.
 *
 * Owns the "solo vs group" decision and, for group sessions, the
 * part-assignment bookkeeping (who sings/plays which part). Solo sessions
 * always have exactly one participant covering every part; group sessions
 * split parts across the participant list.
 */
export class InvalidPartAssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPartAssignmentError';
  }
}

export class MusicSessionRegistry {
  private sessions = new Map<string, MusicSession>();
  private sequence = 0;

  constructor(private songs: SongCatalogRegistry = new SongCatalogRegistry()) {}

  private nextId(): string {
    this.sequence += 1;
    return `session_${Date.now()}_${this.sequence}`;
  }

  /** Starts a solo session: one participant, the song picked by their own interest search. */
  startSolo(input: { songId: string; participantId: string }): MusicSession {
    const song = this.songs.getById(input.songId);
    const session: MusicSession = {
      id: this.nextId(),
      songId: song.id,
      mode: 'solo',
      selectedBy: 'child',
      hostParticipantId: input.participantId,
      participantIds: [input.participantId],
      partAssignments: Array.from({ length: song.partCount }, (_, partIndex) => ({
        partIndex,
        label: `Part ${partIndex + 1}`,
        participantId: input.participantId,
      })),
      createdAt: Date.now(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Starts a group session: multiple participants, song chosen by a
   * coach/teacher or system suggestion (not a single child's interest).
   * Parts are distributed round-robin so every participant gets at least
   * one part when there are more parts than people (or vice versa).
   */
  startGroup(input: {
    songId: string;
    hostParticipantId: string;
    participantIds: string[];
    selectedBy?: Extract<SongSelector, 'coach-or-teacher' | 'system-suggested'>;
    partLabels?: string[];
  }): MusicSession {
    if (input.participantIds.length < 2) {
      throw new InvalidPartAssignmentError('Group sessions require at least two participants.');
    }
    const song = this.songs.getById(input.songId);
    const partAssignments: PartAssignment[] = Array.from({ length: song.partCount }, (_, partIndex) => ({
      partIndex,
      label: input.partLabels?.[partIndex] ?? `Part ${partIndex + 1}`,
      participantId: input.participantIds[partIndex % input.participantIds.length],
    }));

    const session: MusicSession = {
      id: this.nextId(),
      songId: song.id,
      mode: 'group' as SessionMode,
      selectedBy: input.selectedBy ?? 'coach-or-teacher',
      hostParticipantId: input.hostParticipantId,
      participantIds: [...input.participantIds],
      partAssignments,
      createdAt: Date.now(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  /** Reassigns a single part to a different participant already in the session. */
  reassignPart(sessionId: string, partIndex: number, participantId: string): MusicSession {
    const session = this.getById(sessionId);
    if (!session.participantIds.includes(participantId)) {
      throw new InvalidPartAssignmentError(`Participant ${participantId} is not part of session ${sessionId}.`);
    }
    const assignment = session.partAssignments.find((part) => part.partIndex === partIndex);
    if (!assignment) {
      throw new InvalidPartAssignmentError(`Session ${sessionId} has no part index ${partIndex}.`);
    }
    assignment.participantId = participantId;
    return session;
  }

  markCompleted(sessionId: string, completedAt: number = Date.now()): MusicSession {
    const session = this.getById(sessionId);
    session.completedAt = completedAt;
    return session;
  }

  getById(sessionId: string): MusicSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Unknown session id: ${sessionId}`);
    }
    return session;
  }

  sessionsForParticipant(participantId: string): MusicSession[] {
    return [...this.sessions.values()].filter((session) => session.participantIds.includes(participantId));
  }
}

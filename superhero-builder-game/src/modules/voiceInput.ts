import { VoiceNote, VoiceNoteStage } from '../types/domain';

/**
 * Voice input module.
 *
 * Some kids in the 6-9 range can't type comfortably yet, so every text
 * input step (character description, revision requests, power/tool/habitat
 * descriptions) can instead be captured as a voice note. Mirrors the
 * `pending -> recorded -> approved` cycle used by
 * `music-studio-game/src/modules/voiceRecording.ts`; this module only
 * tracks state and an opaque reference to the audio asset — actual audio
 * capture/storage is an external service.
 */
export class UnknownVoiceNoteError extends Error {
  constructor(voiceNoteId: string) {
    super(`Unknown voice note id: ${voiceNoteId}`);
    this.name = 'UnknownVoiceNoteError';
  }
}

export class InvalidVoiceNoteTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidVoiceNoteTransitionError';
  }
}

export class VoiceInputRegistry {
  private notes = new Map<string, VoiceNote>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `voicenote_${Date.now()}_${this.sequence}`;
  }

  requestNote(ownerId: string, stage: VoiceNoteStage): VoiceNote {
    const note: VoiceNote = { id: this.nextId(), ownerId, stage, status: 'pending' };
    this.notes.set(note.id, note);
    return note;
  }

  recordNote(voiceNoteId: string, audioAssetRef: string, recordedAt: number = Date.now()): VoiceNote {
    const note = this.getById(voiceNoteId);
    note.status = 'recorded';
    note.audioAssetRef = audioAssetRef;
    note.recordedAt = recordedAt;
    note.approvedAt = undefined;
    return note;
  }

  approve(voiceNoteId: string, approvedAt: number = Date.now()): VoiceNote {
    const note = this.getById(voiceNoteId);
    if (note.status !== 'recorded') {
      throw new InvalidVoiceNoteTransitionError(
        `Voice note ${voiceNoteId} must be "recorded" before it can be approved (was "${note.status}").`
      );
    }
    note.status = 'approved';
    note.approvedAt = approvedAt;
    return note;
  }

  getById(voiceNoteId: string): VoiceNote {
    const note = this.notes.get(voiceNoteId);
    if (!note) {
      throw new UnknownVoiceNoteError(voiceNoteId);
    }
    return note;
  }

  notesForOwner(ownerId: string): VoiceNote[] {
    return [...this.notes.values()].filter((note) => note.ownerId === ownerId);
  }
}

import { VoiceRecording } from '../types/domain';
import { MusicSession } from '../types/domain';

/**
 * Voice recording module.
 *
 * Tracks the per-part recording state machine:
 *   pending -> recorded -> approved (ready to include in the mix)
 *                       \-> rejected (needs a re-record)
 *
 * This module only models state + the (opaque) asset reference returned by
 * whatever external recording/storage service actually captures the audio —
 * it does not perform audio capture itself (see the scope note in
 * `types/domain.ts`).
 */
export class UnknownRecordingError extends Error {
  constructor(recordingId: string) {
    super(`Unknown voice recording id: ${recordingId}`);
    this.name = 'UnknownRecordingError';
  }
}

export class InvalidRecordingTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRecordingTransitionError';
  }
}

export class VoiceRecordingRegistry {
  private recordings = new Map<string, VoiceRecording>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `recording_${Date.now()}_${this.sequence}`;
  }

  /** Creates the pending recording slots for every part assignment in a session. */
  initializeForSession(session: MusicSession): VoiceRecording[] {
    return session.partAssignments.map((assignment) => {
      const recording: VoiceRecording = {
        id: this.nextId(),
        sessionId: session.id,
        participantId: assignment.participantId,
        partIndex: assignment.partIndex,
        status: 'pending',
      };
      this.recordings.set(recording.id, recording);
      return recording;
    });
  }

  /** Marks a part as recorded, attaching the (opaque) audio asset reference. */
  recordTake(recordingId: string, audioAssetRef: string, recordedAt: number = Date.now()): VoiceRecording {
    const recording = this.getById(recordingId);
    recording.status = 'recorded';
    recording.audioAssetRef = audioAssetRef;
    recording.recordedAt = recordedAt;
    recording.approvedAt = undefined;
    return recording;
  }

  approve(recordingId: string, approvedAt: number = Date.now()): VoiceRecording {
    const recording = this.getById(recordingId);
    if (recording.status !== 'recorded') {
      throw new InvalidRecordingTransitionError(
        `Recording ${recordingId} must be in "recorded" state before it can be approved (was "${recording.status}").`
      );
    }
    recording.status = 'approved';
    recording.approvedAt = approvedAt;
    return recording;
  }

  reject(recordingId: string): VoiceRecording {
    const recording = this.getById(recordingId);
    if (recording.status !== 'recorded') {
      throw new InvalidRecordingTransitionError(
        `Recording ${recordingId} must be in "recorded" state before it can be rejected (was "${recording.status}").`
      );
    }
    recording.status = 'rejected';
    return recording;
  }

  getById(recordingId: string): VoiceRecording {
    const recording = this.recordings.get(recordingId);
    if (!recording) {
      throw new UnknownRecordingError(recordingId);
    }
    return recording;
  }

  recordingsForSession(sessionId: string): VoiceRecording[] {
    return [...this.recordings.values()].filter((recording) => recording.sessionId === sessionId);
  }

  /** True once every part in the session has an approved recording (ready to mix). */
  isSessionReadyToMix(sessionId: string): boolean {
    const sessionRecordings = this.recordingsForSession(sessionId);
    return sessionRecordings.length > 0 && sessionRecordings.every((recording) => recording.status === 'approved');
  }
}

import { VoiceInputRegistry, InvalidVoiceNoteTransitionError } from '../src/modules/voiceInput';

describe('VoiceInputRegistry', () => {
  it('requests a pending voice note for a given stage', () => {
    const registry = new VoiceInputRegistry();
    const note = registry.requestNote('child_1', 'character-description');
    expect(note.status).toBe('pending');
    expect(note.stage).toBe('character-description');
  });

  it('moves a note through recorded -> approved', () => {
    const registry = new VoiceInputRegistry();
    const note = registry.requestNote('child_1', 'power-description');

    registry.recordNote(note.id, 'asset://voice-1');
    expect(registry.getById(note.id).status).toBe('recorded');

    registry.approve(note.id);
    expect(registry.getById(note.id).status).toBe('approved');
  });

  it('rejects approving a note that has not been recorded yet', () => {
    const registry = new VoiceInputRegistry();
    const note = registry.requestNote('child_1', 'tool-description');
    expect(() => registry.approve(note.id)).toThrow(InvalidVoiceNoteTransitionError);
  });

  it('lists all notes for an owner across stages', () => {
    const registry = new VoiceInputRegistry();
    registry.requestNote('child_1', 'character-description');
    registry.requestNote('child_1', 'habitat-description');
    registry.requestNote('child_2', 'revision-request');

    expect(registry.notesForOwner('child_1')).toHaveLength(2);
  });
});

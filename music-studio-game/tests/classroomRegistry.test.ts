import { ClassroomRegistry } from '../src/modules/classroomRegistry';
import { MusicSessionRegistry } from '../src/modules/sessionMode';

describe('ClassroomRegistry', () => {
  it('creates a classroom and adds students', () => {
    const classrooms = new ClassroomRegistry();
    const classroom = classrooms.createClassroom({ name: 'Room 4B', teacherId: 'teacher_1' });
    classrooms.addStudent(classroom.id, 'child_1');
    classrooms.addStudent(classroom.id, 'child_2');
    classrooms.addStudent(classroom.id, 'child_1'); // duplicate, should not double-add

    expect(classrooms.getById(classroom.id).studentParticipantIds).toEqual(['child_1', 'child_2']);
  });

  it('assigns a group session as a classroom project', () => {
    const classrooms = new ClassroomRegistry();
    const classroom = classrooms.createClassroom({ name: 'Room 4B', teacherId: 'teacher_1' });
    const sessions = new MusicSessionRegistry();
    const session = sessions.startGroup({
      songId: 'song-super-team',
      hostParticipantId: 'teacher_1',
      participantIds: ['child_1', 'child_2'],
    });

    classrooms.assignProject(classroom.id, session);
    expect(classrooms.projectsForClassroom(classroom.id)).toHaveLength(1);
    expect(classrooms.projectsForClassroom(classroom.id)[0].sessionId).toBe(session.id);
  });

  it('throws for an unknown classroom id', () => {
    const classrooms = new ClassroomRegistry();
    expect(() => classrooms.getById('nope')).toThrow('Unknown classroom id');
  });
});

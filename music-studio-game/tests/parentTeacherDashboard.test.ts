import { DashboardService } from '../src/modules/parentTeacherDashboard';
import { MusicSessionRegistry } from '../src/modules/sessionMode';
import { ClassroomRegistry } from '../src/modules/classroomRegistry';
import { GroupChallengeRegistry } from '../src/modules/viralShare';

describe('DashboardService', () => {
  it('builds a parent report counting only completed sessions', () => {
    const sessions = new MusicSessionRegistry();
    const dashboard = new DashboardService(sessions);

    const session1 = sessions.startSolo({ songId: 'song-sleepy-star', participantId: 'child_1' });
    sessions.startSolo({ songId: 'song-silly-socks', participantId: 'child_1' }); // left incomplete
    sessions.markCompleted(session1.id, 1000);

    const report = dashboard.buildParentReport('child_1', new Date(2000));
    expect(report.sessionsCompleted).toBe(1);
    expect(report.songsCompleted).toEqual(['song-sleepy-star']);
    expect(report.lastSessionAt).toBe(1000);
  });

  it('builds a teacher report counting distinct students with completed classroom projects', () => {
    const sessions = new MusicSessionRegistry();
    const classrooms = new ClassroomRegistry();
    const challenges = new GroupChallengeRegistry();
    const dashboard = new DashboardService(sessions, classrooms, challenges);

    const classroom = classrooms.createClassroom({ name: 'Room 4B', teacherId: 'teacher_1' });
    classrooms.addStudent(classroom.id, 'child_1');
    classrooms.addStudent(classroom.id, 'child_2');
    classrooms.addStudent(classroom.id, 'child_3');

    const session = sessions.startGroup({
      songId: 'song-super-team',
      hostParticipantId: 'teacher_1',
      participantIds: ['child_1', 'child_2'],
    });
    classrooms.assignProject(classroom.id, session);
    sessions.markCompleted(session.id);

    const challenge = challenges.create({
      title: 'Class Challenge',
      createdByParentOrTeacherId: 'teacher_1',
      memberThreshold: 1,
    });
    challenges.join(challenge.id, 'child_1');

    const report = dashboard.buildTeacherReport(classroom.id);
    expect(report.totalStudents).toBe(3);
    expect(report.studentsWithCompletedSessions).toBe(2);
    expect(report.activeGroupChallenges).toBe(1);
  });
});

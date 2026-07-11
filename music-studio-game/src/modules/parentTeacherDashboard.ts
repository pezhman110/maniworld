import { ParticipantProgressReport, TeacherClassroomReport } from '../types/domain';
import { MusicSessionRegistry } from './sessionMode';
import { ClassroomRegistry } from './classroomRegistry';
import { GroupChallengeRegistry } from './viralShare';

/**
 * Parent/teacher dashboard module.
 *
 * Rolls up raw session data into the two progress views the plan calls for:
 * a parent-facing per-child report, and a teacher-facing per-classroom
 * report — mirroring the `DashboardService` pattern in
 * `social-skills-game/src/modules/dashboard.ts`.
 */
export class DashboardService {
  constructor(
    private sessions: MusicSessionRegistry,
    private classrooms: ClassroomRegistry = new ClassroomRegistry(),
    private challenges: GroupChallengeRegistry = new GroupChallengeRegistry()
  ) {}

  buildParentReport(participantId: string, asOf: Date = new Date()): ParticipantProgressReport {
    const participantSessions = this.sessions.sessionsForParticipant(participantId);
    const completedSessions = participantSessions.filter((session) => session.completedAt !== undefined);
    const lastSessionAt = completedSessions.reduce<number | undefined>((latest, session) => {
      if (session.completedAt === undefined) return latest;
      return latest === undefined || session.completedAt > latest ? session.completedAt : latest;
    }, undefined);

    return {
      participantId,
      generatedAt: asOf.getTime(),
      sessionsCompleted: completedSessions.length,
      songsCompleted: completedSessions.map((session) => session.songId),
      lastSessionAt,
    };
  }

  buildTeacherReport(classroomId: string, asOf: Date = new Date()): TeacherClassroomReport {
    const classroom = this.classrooms.getById(classroomId);
    const projects = this.classrooms.projectsForClassroom(classroomId);

    const completedProjectSessions = projects
      .map((project) => {
        try {
          return this.sessions.getById(project.sessionId);
        } catch {
          return undefined;
        }
      })
      .filter(
        (session): session is NonNullable<typeof session> => session !== undefined && session.completedAt !== undefined
      );

    const studentsWithCompletedSessions = new Set(
      completedProjectSessions.flatMap((session) => session.participantIds)
    ).size;

    // Group challenges aren't scoped to a classroom in the domain model
    // (they're created by a parent/teacher and joined by participant id),
    // so "active for this classroom" means activated challenges created by
    // this classroom's teacher.
    const activeGroupChallenges = this.challenges
      .list()
      .filter(
        (challenge) => challenge.createdByParentOrTeacherId === classroom.teacherId && this.challenges.isActivated(challenge.id)
      ).length;

    return {
      classroomId,
      generatedAt: asOf.getTime(),
      totalStudents: classroom.studentParticipantIds.length,
      studentsWithCompletedSessions,
      activeGroupChallenges,
    };
  }
}

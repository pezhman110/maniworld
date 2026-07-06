import { Classroom, ClassroomProject, MusicSession } from '../types/domain';

/**
 * Classroom module (school-mode differentiator).
 *
 * Home mode uses individual participant invites; school mode instead groups
 * students under a teacher-owned classroom and assigns group sessions as
 * classroom projects, so a teacher can run the same solo/group music-making
 * flow for an entire class without per-child invite codes.
 */
export class ClassroomRegistry {
  private classrooms = new Map<string, Classroom>();
  private projects = new Map<string, ClassroomProject>();
  private classroomSequence = 0;
  private projectSequence = 0;

  private nextClassroomId(): string {
    this.classroomSequence += 1;
    return `classroom_${Date.now()}_${this.classroomSequence}`;
  }

  private nextProjectId(): string {
    this.projectSequence += 1;
    return `project_${Date.now()}_${this.projectSequence}`;
  }

  createClassroom(input: { name: string; teacherId: string }): Classroom {
    const classroom: Classroom = {
      id: this.nextClassroomId(),
      name: input.name,
      teacherId: input.teacherId,
      studentParticipantIds: [],
      createdAt: Date.now(),
    };
    this.classrooms.set(classroom.id, classroom);
    return classroom;
  }

  addStudent(classroomId: string, participantId: string): Classroom {
    const classroom = this.getById(classroomId);
    if (!classroom.studentParticipantIds.includes(participantId)) {
      classroom.studentParticipantIds.push(participantId);
    }
    return classroom;
  }

  /** Assigns a (usually group) session as a classroom project. */
  assignProject(classroomId: string, session: MusicSession, assignedAt: number = Date.now()): ClassroomProject {
    this.getById(classroomId);
    const project: ClassroomProject = {
      id: this.nextProjectId(),
      classroomId,
      sessionId: session.id,
      assignedAt,
    };
    this.projects.set(project.id, project);
    return project;
  }

  getById(classroomId: string): Classroom {
    const classroom = this.classrooms.get(classroomId);
    if (!classroom) {
      throw new Error(`Unknown classroom id: ${classroomId}`);
    }
    return classroom;
  }

  projectsForClassroom(classroomId: string): ClassroomProject[] {
    return [...this.projects.values()].filter((project) => project.classroomId === classroomId);
  }
}

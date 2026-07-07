import {
  AIInterviewPersona,
  AIPersonaApprovalStatus,
  AudienceRoute,
  Project,
  ProjectRouteState,
} from '../types/domain';

/**
 * Project (step 0) module.
 *
 * This is the very first step of the whole pipeline: an external
 * person (the client/manager placing the request) enters the project's
 * information and names it (e.g. "Freelancer"). As soon as the project is
 * created, all three acquisition routes exist for it - direct network
 * search, job posting + landing page, and resume intake - each starting
 * inactive until explicitly switched on so nothing runs silently.
 *
 * A fully independent module: it only stores string ids
 * (`audienceProfileId`, plan ids, etc. set by the caller) and does not
 * import from `presentationCampaigns.ts` or `prospectOutreach.ts`, matching
 * the existing pattern of independent modules combined at the router layer.
 */

export const ALL_AUDIENCE_ROUTES: AudienceRoute[] = ['direct-network', 'job-posting', 'resume-intake'];

function defaultRoutes(): ProjectRouteState[] {
  return ALL_AUDIENCE_ROUTES.map((route) => ({ route, active: false }));
}

export class ProjectNotFoundError extends Error {
  constructor(id: string) {
    super(`Project "${id}" not found.`);
    this.name = 'ProjectNotFoundError';
  }
}

export class InvalidRouteError extends Error {
  constructor(route: string) {
    super(`Invalid acquisition route "${route}".`);
    this.name = 'InvalidRouteError';
  }
}

let projectIdSeq = 0;
function nextProjectId(): string {
  projectIdSeq += 1;
  return `project_${Date.now()}_${projectIdSeq}`;
}

/**
 * Registry of client-defined projects: step 0 of the pipeline. Every
 * project is created with all three acquisition routes present (but
 * inactive), so the "three parallel paths" the client asked for are always
 * visible from the moment the project is named.
 */
export class ProjectRegistry {
  private projects = new Map<string, Project>();

  /** Step 0: the external client enters the project's info and names it. */
  create(params: { id?: string; name: string; goals?: string[]; createdBy: string; now?: number }): Project {
    if (!params.name.trim()) throw new Error('"name" is required.');
    if (!params.createdBy.trim()) throw new Error('"createdBy" is required.');

    const id = params.id ?? nextProjectId();
    if (this.projects.has(id)) {
      throw new Error(`A project with id "${id}" already exists.`);
    }

    const project: Project = {
      id,
      name: params.name.trim(),
      goals: params.goals ? [...params.goals] : [],
      createdBy: params.createdBy.trim(),
      routes: defaultRoutes(),
      createdAt: params.now ?? Date.now(),
      active: true,
    };
    this.projects.set(id, project);
    return project;
  }

  get(id: string): Project | undefined {
    return this.projects.get(id);
  }

  private mustGet(id: string): Project {
    const project = this.projects.get(id);
    if (!project) throw new ProjectNotFoundError(id);
    return project;
  }

  /** Links this project to the `AudienceProfile` group created for it (e.g. from Mission Control). */
  linkAudienceProfile(id: string, audienceProfileId: string): Project {
    const project = this.mustGet(id);
    project.audienceProfileId = audienceProfileId;
    return project;
  }

  updateGoals(id: string, goals: string[]): Project {
    const project = this.mustGet(id);
    project.goals = [...goals];
    return project;
  }

  /** Switches on one of the project's three acquisition routes. */
  activateRoute(id: string, route: AudienceRoute, now: number = Date.now()): Project {
    const project = this.mustGet(id);
    const state = project.routes.find((r) => r.route === route);
    if (!state) throw new InvalidRouteError(route);
    state.active = true;
    state.activatedAt = now;
    return project;
  }

  deactivateRoute(id: string, route: AudienceRoute): Project {
    const project = this.mustGet(id);
    const state = project.routes.find((r) => r.route === route);
    if (!state) throw new InvalidRouteError(route);
    state.active = false;
    return project;
  }

  listActiveRoutes(id: string): ProjectRouteState[] {
    const project = this.mustGet(id);
    return project.routes.filter((r) => r.active);
  }

  all(onlyActive = false): Project[] {
    return [...this.projects.values()].filter((p) => !onlyActive || p.active);
  }
}

export class AIPersonaNotFoundError extends Error {
  constructor(id: string) {
    super(`AI persona "${id}" not found.`);
    this.name = 'AIPersonaNotFoundError';
  }
}

export class AIPersonaNotApprovedError extends Error {
  constructor(id: string, status: AIPersonaApprovalStatus) {
    super(`AI persona "${id}" is not approved by a manager yet (status: "${status}").`);
    this.name = 'AIPersonaNotApprovedError';
  }
}

let personaIdSeq = 0;
function nextPersonaId(): string {
  personaIdSeq += 1;
  return `persona_${Date.now()}_${personaIdSeq}`;
}

/**
 * Registry of AI personas that could host an online interview/consultation
 * on a project's behalf. Answers the client's requirement: "بنا به اهداف
 * پروژه مشخص شده با چه هوش مصنوعی این فرد صحبت میکند پس باید از مدیر ...
 * اجازه ساخت گرفته بشه" - a persona always starts as
 * 'pending-manager-approval' and can never be used in a live session until
 * a manager explicitly approves it.
 */
export class AIPersonaRegistry {
  private personas = new Map<string, AIInterviewPersona>();

  /** Requests a new AI persona, aligned to the project's goals. Always starts pending manager approval. */
  request(params: {
    id?: string;
    projectId: string;
    name: string;
    purpose: string;
    instructions: string;
    requestedBy: string;
    now?: number;
  }): AIInterviewPersona {
    if (!params.projectId.trim()) throw new Error('"projectId" is required.');
    if (!params.name.trim()) throw new Error('"name" is required.');
    if (!params.purpose.trim()) throw new Error('"purpose" is required.');
    if (!params.instructions.trim()) throw new Error('"instructions" is required.');
    if (!params.requestedBy.trim()) throw new Error('"requestedBy" is required.');

    const id = params.id ?? nextPersonaId();
    if (this.personas.has(id)) {
      throw new Error(`An AI persona with id "${id}" already exists.`);
    }

    const persona: AIInterviewPersona = {
      id,
      projectId: params.projectId,
      name: params.name.trim(),
      purpose: params.purpose.trim(),
      instructions: params.instructions.trim(),
      requestedBy: params.requestedBy.trim(),
      approvalStatus: 'pending-manager-approval',
      createdAt: params.now ?? Date.now(),
    };
    this.personas.set(id, persona);
    return persona;
  }

  get(id: string): AIInterviewPersona | undefined {
    return this.personas.get(id);
  }

  private mustGet(id: string): AIInterviewPersona {
    const persona = this.personas.get(id);
    if (!persona) throw new AIPersonaNotFoundError(id);
    return persona;
  }

  /** A manager approves or rejects a requested persona; it can never move directly to "used" without this. */
  decide(id: string, decision: 'approved' | 'rejected', decidedBy: string, now: number = Date.now()): AIInterviewPersona {
    const persona = this.mustGet(id);
    if (persona.approvalStatus !== 'pending-manager-approval') {
      throw new Error(`AI persona "${id}" has already been decided ("${persona.approvalStatus}").`);
    }
    if (!decidedBy.trim()) throw new Error('"decidedBy" is required.');
    persona.approvalStatus = decision;
    persona.approvedBy = decidedBy.trim();
    persona.decidedAt = now;
    return persona;
  }

  /** Throws unless the given persona exists and has been approved by a manager - the hard gate before use in a live session. */
  assertApproved(id: string): AIInterviewPersona {
    const persona = this.mustGet(id);
    if (persona.approvalStatus !== 'approved') {
      throw new AIPersonaNotApprovedError(id, persona.approvalStatus);
    }
    return persona;
  }

  listByProject(projectId: string): AIInterviewPersona[] {
    return [...this.personas.values()].filter((p) => p.projectId === projectId);
  }

  listPendingApproval(): AIInterviewPersona[] {
    return [...this.personas.values()].filter((p) => p.approvalStatus === 'pending-manager-approval');
  }

  all(): AIInterviewPersona[] {
    return [...this.personas.values()];
  }
}

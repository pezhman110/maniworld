import {
  VideoSessionPlan,
  VideoSessionAssignment,
  VideoSessionRole,
  SessionScenarioStep,
  SessionChecklistItem,
} from '../types/domain';

/**
 * Video/in-person session module.
 *
 * This directly answers the user's key question: "برای ارتباط تصویری و
 * ویدیویی، شخصی که قرار است صحبت کند مشخص شده؟" (For video/visual
 * communication, is it determined who will speak?)
 *
 * Previously this was NOT specified anywhere in the pipeline. This module
 * makes it explicit by requiring a named "primary-presenter" role assignment
 * before a video session plan can be considered ready, alongside a backup
 * presenter and a quality observer, a standard session scenario
 * (Opening -> Discovery -> Offer -> Next Step), and a pre/during/post
 * checklist including recording consent.
 */

export class MissingPresenterError extends Error {
  constructor() {
    super('A video session plan requires exactly one "primary-presenter" to be assigned before it is ready.');
    this.name = 'MissingPresenterError';
  }
}

const DEFAULT_SCENARIO: SessionScenarioStep[] = ['opening', 'discovery', 'offer', 'next-step'];

function defaultChecklist(): SessionChecklistItem[] {
  return [
    { phase: 'pre', label: 'Confirm primary presenter and backup are assigned', done: false },
    { phase: 'pre', label: 'Verify meeting link / hall setup and test audio-video', done: false },
    { phase: 'pre', label: 'Review lead profile, score, and prior interaction log', done: false },
    { phase: 'pre', label: 'Obtain recording consent from the attendee', done: false },
    { phase: 'during', label: 'Opening: introduce presenter and agenda', done: false },
    { phase: 'during', label: 'Discovery: ask needs/qualification questions', done: false },
    { phase: 'during', label: 'Offer: present relevant offer/package', done: false },
    { phase: 'during', label: 'Next step: agree on concrete follow-up action', done: false },
    { phase: 'post', label: 'Log outcome and update funnel stage', done: false },
    { phase: 'post', label: 'Send recap message with next steps', done: false },
    { phase: 'post', label: 'File session recording per data retention policy', done: false },
  ];
}

export function createVideoSessionPlan(
  bookingId: string,
  assignments: VideoSessionAssignment[],
  recordingConsentGiven: boolean = false
): VideoSessionPlan {
  return {
    bookingId,
    assignments,
    scenario: [...DEFAULT_SCENARIO],
    checklist: defaultChecklist(),
    recordingConsentGiven,
  };
}

/** Ensures a plan has exactly one primary presenter explicitly named - the gap called out by the user. */
export function assertPresenterAssigned(plan: VideoSessionPlan): void {
  const primaryPresenters = plan.assignments.filter((a) => a.role === 'primary-presenter');
  if (primaryPresenters.length !== 1) {
    throw new MissingPresenterError();
  }
}

export function getAssignmentByRole(
  plan: VideoSessionPlan,
  role: VideoSessionRole
): VideoSessionAssignment | undefined {
  return plan.assignments.find((a) => a.role === role);
}

export function markChecklistItemDone(plan: VideoSessionPlan, label: string): VideoSessionPlan {
  const checklist = plan.checklist.map((item) =>
    item.label === label ? { ...item, done: true } : item
  );
  return { ...plan, checklist };
}

/** A session is fully ready only when the presenter is assigned, consent is given, and all pre-phase items are done. */
export function isSessionReady(plan: VideoSessionPlan): boolean {
  const hasPresenter = plan.assignments.some((a) => a.role === 'primary-presenter');
  const preItemsDone = plan.checklist.filter((c) => c.phase === 'pre').every((c) => c.done);
  return hasPresenter && plan.recordingConsentGiven && preItemsDone;
}

import {
  createVideoSessionPlan,
  assertPresenterAssigned,
  MissingPresenterError,
  getAssignmentByRole,
  markChecklistItemDone,
  isSessionReady,
} from '../src/modules/videoSession';

describe('videoSession', () => {
  it('throws MissingPresenterError when no primary-presenter is assigned', () => {
    const plan = createVideoSessionPlan('booking_1', [
      { bookingId: 'booking_1', personName: 'Ali', role: 'quality-observer' },
    ]);
    expect(() => assertPresenterAssigned(plan)).toThrow(MissingPresenterError);
  });

  it('passes when exactly one primary-presenter is assigned', () => {
    const plan = createVideoSessionPlan('booking_1', [
      { bookingId: 'booking_1', personName: 'Ali', role: 'primary-presenter' },
      { bookingId: 'booking_1', personName: 'Sara', role: 'backup-presenter' },
    ]);
    expect(() => assertPresenterAssigned(plan)).not.toThrow();
    expect(getAssignmentByRole(plan, 'primary-presenter')?.personName).toBe('Ali');
  });

  it('includes the standard opening/discovery/offer/next-step scenario', () => {
    const plan = createVideoSessionPlan('booking_1', []);
    expect(plan.scenario).toEqual(['opening', 'discovery', 'offer', 'next-step']);
  });

  it('is not ready until presenter, consent, and all pre-checklist items are done', () => {
    let plan = createVideoSessionPlan('booking_1', [
      { bookingId: 'booking_1', personName: 'Ali', role: 'primary-presenter' },
    ], false);
    expect(isSessionReady(plan)).toBe(false);

    plan = { ...plan, recordingConsentGiven: true };
    expect(isSessionReady(plan)).toBe(false); // pre-checklist not done yet

    for (const item of plan.checklist.filter((c) => c.phase === 'pre')) {
      plan = markChecklistItemDone(plan, item.label);
    }
    expect(isSessionReady(plan)).toBe(true);
  });
});

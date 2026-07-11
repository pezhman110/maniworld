import { createPage, goBack } from '../src/modules/backNavigation';

describe('backNavigation', () => {
  it('creates a root page without back support', () => {
    const root = createPage('mycity-home');
    expect(root.supportsBack).toBe(false);
  });

  it('creates a nested page with back support', () => {
    const page = createPage('mycity-room', 'mycity-building');
    expect(page.supportsBack).toBe(true);
  });

  it('resolves the parent page when going back', () => {
    const parent = createPage('mycity-building');
    const page = createPage('mycity-room', 'mycity-building');
    const resolved = goBack(page, () => parent);
    expect(resolved).toBe(parent);
  });

  it('returns undefined when a root page has no back target', () => {
    const root = createPage('mycity-home');
    expect(goBack(root, () => root)).toBeUndefined();
  });
});

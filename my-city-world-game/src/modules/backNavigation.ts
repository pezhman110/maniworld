import { BackNavigable } from '../types/domain';

/**
 * Back Navigation (plan block 10): every page-level model in "My Living
 * City" carries this marker so a real router/UI layer can always render a
 * back action — required on all pages per the platform-wide navigation
 * rule.
 */
export function createPage(pageId: string, parentPageId?: string): BackNavigable {
  return {
    pageId,
    parentPageId,
    supportsBack: parentPageId !== undefined,
  };
}

export function goBack(page: BackNavigable, resolveParent: (parentPageId: string) => BackNavigable): BackNavigable | undefined {
  if (!page.supportsBack || !page.parentPageId) {
    return undefined;
  }
  return resolveParent(page.parentPageId);
}

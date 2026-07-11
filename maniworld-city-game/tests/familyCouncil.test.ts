import { DuplicateVoteError, FamilyCouncilRegistry, InvalidOptionError } from '../src/modules/familyCouncil';

describe('FamilyCouncilRegistry', () => {
  it('creates a proposal with a QR code and options', () => {
    const registry = new FamilyCouncilRegistry();
    const proposal = registry.createProposal({ cityId: 'city1', question: 'Park or library?', options: ['Park', 'Library'] });
    expect(proposal.qrCode).toMatch(/^MW-FC-/);
    expect(proposal.votes).toHaveLength(0);
  });

  it('allows one vote per family role, including sibling and grandparent', () => {
    const registry = new FamilyCouncilRegistry();
    const proposal = registry.createProposal({ cityId: 'city1', question: 'Park or library?', options: ['Park', 'Library'] });

    registry.vote(proposal.id, 'parent', 'Library');
    registry.vote(proposal.id, 'sibling', 'Park');
    registry.vote(proposal.id, 'grandparent', 'Library');

    expect(proposal.votes).toHaveLength(3);
  });

  it('rejects a duplicate vote from the same role', () => {
    const registry = new FamilyCouncilRegistry();
    const proposal = registry.createProposal({ cityId: 'city1', question: 'Park or library?', options: ['Park', 'Library'] });
    registry.vote(proposal.id, 'parent', 'Library');
    expect(() => registry.vote(proposal.id, 'parent', 'Park')).toThrow(DuplicateVoteError);
  });

  it('rejects a vote for an option not on the proposal', () => {
    const registry = new FamilyCouncilRegistry();
    const proposal = registry.createProposal({ cityId: 'city1', question: 'Park or library?', options: ['Park', 'Library'] });
    expect(() => registry.vote(proposal.id, 'parent', 'Zoo')).toThrow(InvalidOptionError);
  });

  it('decides the winning option by majority', () => {
    const registry = new FamilyCouncilRegistry();
    const proposal = registry.createProposal({ cityId: 'city1', question: 'Park or library?', options: ['Park', 'Library'] });
    registry.vote(proposal.id, 'parent', 'Library');
    registry.vote(proposal.id, 'sibling', 'Library');
    registry.vote(proposal.id, 'grandparent', 'Park');

    const decided = registry.decide(proposal.id);
    expect(decided.decidedOption).toBe('Library');
    expect(decided.decidedAt).toBeDefined();
  });

  it('requires at least two options', () => {
    const registry = new FamilyCouncilRegistry();
    expect(() => registry.createProposal({ cityId: 'city1', question: 'Only one?', options: ['Park'] })).toThrow();
  });
});

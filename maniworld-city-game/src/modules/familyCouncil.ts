import { FamilyCouncilProposal, FamilyRole } from '../types/domain';

/**
 * Family Council module, including Sibling/Grandparent Mode.
 *
 * When a child faces a city decision ("build a park or a library?"), the app
 * generates a QR code the child shows to family members. Any family role
 * (parent, sibling, grandparent) can cast exactly one vote — siblings and
 * grandparents are intentionally limited to voting/cheering only, never
 * chat or account administration, so the wider family circle can join the
 * viral loop without opening any open-ended child-to-adult messaging.
 */
export class DuplicateVoteError extends Error {
  constructor(role: FamilyRole) {
    super(`This ${role} already voted on this proposal.`);
    this.name = 'DuplicateVoteError';
  }
}

export class InvalidOptionError extends Error {
  constructor(option: string) {
    super(`"${option}" is not one of the proposal's options.`);
    this.name = 'InvalidOptionError';
  }
}

function randomQrPayload(): string {
  return `MW-FC-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

export class FamilyCouncilRegistry {
  private proposals = new Map<string, FamilyCouncilProposal>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `proposal_${Date.now()}_${this.sequence}`;
  }

  createProposal(input: { cityId: string; question: string; options: string[]; createdAt?: number }): FamilyCouncilProposal {
    if (input.options.length < 2) {
      throw new Error('A family council proposal needs at least two options.');
    }
    const proposal: FamilyCouncilProposal = {
      id: this.nextId(),
      cityId: input.cityId,
      question: input.question,
      options: input.options,
      votes: [],
      qrCode: randomQrPayload(),
      createdAt: input.createdAt ?? Date.now(),
    };
    this.proposals.set(proposal.id, proposal);
    return proposal;
  }

  getById(proposalId: string): FamilyCouncilProposal {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Unknown family council proposal id: ${proposalId}`);
    }
    return proposal;
  }

  /** Casts one vote per family role per proposal (a family "seat", not per-person, keeps this simple and abuse-resistant). */
  vote(proposalId: string, role: FamilyRole, option: string): FamilyCouncilProposal {
    const proposal = this.getById(proposalId);
    if (!proposal.options.includes(option)) {
      throw new InvalidOptionError(option);
    }
    if (proposal.votes.some((vote) => vote.role === role)) {
      throw new DuplicateVoteError(role);
    }
    proposal.votes.push({ role, option });
    return proposal;
  }

  /** Tallies votes and locks in the winning option (ties resolve to the first-proposed option). */
  decide(proposalId: string, decidedAt: number = Date.now()): FamilyCouncilProposal {
    const proposal = this.getById(proposalId);
    const tally = new Map<string, number>();
    for (const option of proposal.options) {
      tally.set(option, 0);
    }
    for (const vote of proposal.votes) {
      tally.set(vote.option, (tally.get(vote.option) ?? 0) + 1);
    }

    let winner = proposal.options[0];
    let winnerVotes = -1;
    for (const option of proposal.options) {
      const count = tally.get(option) ?? 0;
      if (count > winnerVotes) {
        winner = option;
        winnerVotes = count;
      }
    }

    proposal.decidedOption = winner;
    proposal.decidedAt = decidedAt;
    return proposal;
  }

  proposalsForCity(cityId: string): FamilyCouncilProposal[] {
    return [...this.proposals.values()].filter((proposal) => proposal.cityId === cityId);
  }
}

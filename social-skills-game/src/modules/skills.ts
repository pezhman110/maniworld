import { Skill, AgeBandId } from '../types/domain';
import { AgeBandRegistry } from './ageBands';

/**
 * Skill registry module.
 *
 * Skills are seeded per age band as requested:
 *  - kids-6-9: the baseline social-skill list (greeting, active listening,
 *    sharing/turn-taking, emotional expression, help, apology, empathy,
 *    friendship-building, frustration management, group rules).
 *  - Older bands ADD more (and harder) skills on top; they never replace
 *    the earlier ones, since the whole point is skills accumulate with age.
 */
export const DEFAULT_SKILLS: Skill[] = [
  // --- kids-6-9: baseline social skills -------------------------------------------------
  {
    id: 'greet-and-introduce',
    ageBandId: 'kids-6-9',
    category: 'greeting-and-introduction',
    title: 'Saying Hello & Introducing Yourself',
    description: 'Confidently greet someone new and say your name with a smile.',
  },
  {
    id: 'active-listening',
    ageBandId: 'kids-6-9',
    category: 'active-listening',
    title: 'Active Listening (Waiting Your Turn to Talk)',
    description: 'Look, listen, and wait for a pause before speaking.',
  },
  {
    id: 'sharing-turn-taking',
    ageBandId: 'kids-6-9',
    category: 'sharing-and-turn-taking',
    title: 'Sharing & Taking Turns in Group Play',
    description: 'Offer to share a toy or game and take fair turns.',
  },
  {
    id: 'emotional-expression',
    ageBandId: 'kids-6-9',
    category: 'emotional-expression',
    title: 'Expressing Feelings in Words',
    description: 'Say "I feel happy/sad/angry because..." instead of acting out.',
  },
  {
    id: 'help-seeking-and-helping',
    ageBandId: 'kids-6-9',
    category: 'help-seeking-and-helping',
    title: 'Asking for Help & Helping Others',
    description: 'Ask an adult or friend for help, and offer help when someone needs it.',
  },
  {
    id: 'apology-and-accountability',
    ageBandId: 'kids-6-9',
    category: 'apology-and-accountability',
    title: 'Saying Sorry & Owning Mistakes',
    description: 'Recognize a mistake, say a genuine sorry, and try to make it right.',
  },
  {
    id: 'simple-empathy',
    ageBandId: 'kids-6-9',
    category: 'empathy',
    title: 'Simple Empathy (Reading Faces & Tone)',
    description: 'Notice how a friend feels from their face or voice and respond kindly.',
  },
  {
    id: 'friendship-building',
    ageBandId: 'kids-6-9',
    category: 'friendship-building',
    title: 'Making Friends & Inviting Others to Play',
    description: 'Invite someone to join a game and introduce them to the group.',
  },
  {
    id: 'frustration-management',
    ageBandId: 'kids-6-9',
    category: 'frustration-management',
    title: 'Handling Losing a Game Gracefully',
    description: 'Take a breath, congratulate the winner, and try again next time.',
  },
  {
    id: 'group-rules',
    ageBandId: 'kids-6-9',
    category: 'group-rules',
    title: 'Following Simple Group Rules',
    description: 'Wait in line, take your turn, and follow shared group rules.',
  },

  // --- tweens-10-12: adds conflict, negotiation, teamwork, peer pressure, bullying awareness
  {
    id: 'verbal-conflict-resolution',
    ageBandId: 'tweens-10-12',
    category: 'conflict-resolution',
    title: 'Resolving Disagreements with Words',
    description: 'Talk through a disagreement calmly instead of escalating it.',
  },
  {
    id: 'simple-negotiation',
    ageBandId: 'tweens-10-12',
    category: 'negotiation',
    title: 'Simple Negotiation',
    description: 'Find a fair compromise both sides can agree to.',
  },
  {
    id: 'project-teamwork',
    ageBandId: 'tweens-10-12',
    category: 'teamwork',
    title: 'Teamwork on a Shared Project',
    description: 'Split tasks fairly and support teammates to finish a group project.',
  },
  {
    id: 'peer-pressure-management',
    ageBandId: 'tweens-10-12',
    category: 'peer-pressure-management',
    title: 'Managing Peer Pressure',
    description: 'Say no confidently to something uncomfortable, even if friends push back.',
  },
  {
    id: 'bullying-awareness',
    ageBandId: 'tweens-10-12',
    category: 'bullying-awareness',
    title: 'Recognizing & Reporting Bullying',
    description: 'Spot bullying behavior and tell a trusted adult about it.',
  },

  // --- teens-13-15: adds digital communication, boundaries, complex emotions, leadership
  {
    id: 'digital-communication',
    ageBandId: 'teens-13-15',
    category: 'digital-communication',
    title: 'Communicating Well Online',
    description: 'Message respectfully and think before posting or reacting online.',
  },
  {
    id: 'healthy-boundaries',
    ageBandId: 'teens-13-15',
    category: 'healthy-boundaries',
    title: 'Setting Healthy Boundaries',
    description: 'Say what you are and are not okay with, and respect others’ boundaries too.',
  },
  {
    id: 'complex-emotion-regulation',
    ageBandId: 'teens-13-15',
    category: 'complex-emotion-regulation',
    title: 'Managing Complex Emotions',
    description: 'Recognize and cope with jealousy, social anxiety, and other layered feelings.',
  },
  {
    id: 'small-group-leadership',
    ageBandId: 'teens-13-15',
    category: 'small-group-leadership',
    title: 'Leading a Small Group',
    description: 'Organize a small group, delegate fairly, and keep everyone included.',
  },

  // --- young-adult-16-plus: adds interview/presentation, advanced EQ, team conflict, cross-cultural
  {
    id: 'interview-and-presentation',
    ageBandId: 'young-adult-16-plus',
    category: 'interview-and-presentation',
    title: 'Interview & Presentation Skills',
    description: 'Present yourself and your ideas clearly and confidently.',
  },
  {
    id: 'advanced-emotional-intelligence',
    ageBandId: 'young-adult-16-plus',
    category: 'advanced-emotional-intelligence',
    title: 'Advanced Emotional Intelligence',
    description: 'Read subtle social cues and respond with tact in high-stakes situations.',
  },
  {
    id: 'team-conflict-management',
    ageBandId: 'young-adult-16-plus',
    category: 'team-conflict-management',
    title: 'Managing Conflict in a Team',
    description: 'Mediate disagreements within a team toward a constructive outcome.',
  },
  {
    id: 'cross-cultural-communication',
    ageBandId: 'young-adult-16-plus',
    category: 'cross-cultural-communication',
    title: 'Cross-Cultural Communication',
    description: 'Communicate respectfully and effectively across cultural differences.',
  },
];

/**
 * Registry exposing skills per band, and the cumulative set of skills
 * unlocked "so far" for a given band (own band + every earlier band).
 */
export class SkillRegistry {
  private skills: Skill[];

  constructor(skills: Skill[] = DEFAULT_SKILLS, private ageBands: AgeBandRegistry = new AgeBandRegistry()) {
    this.skills = [...skills];
  }

  all(): Skill[] {
    return [...this.skills];
  }

  forBand(bandId: AgeBandId): Skill[] {
    return this.skills.filter((skill) => skill.ageBandId === bandId);
  }

  /** Cumulative skill list: the given band's skills PLUS every earlier band's skills. */
  cumulativeForBand(bandId: AgeBandId): Skill[] {
    const bands = this.ageBands.bandsUpTo(bandId);
    const bandIds = new Set(bands.map((band) => band.id));
    return this.skills.filter((skill) => bandIds.has(skill.ageBandId));
  }

  getById(skillId: string): Skill | undefined {
    return this.skills.find((skill) => skill.id === skillId);
  }
}

import { InterviewQuestion } from '../fsm/types';

export const SEED_QUESTION_BANK: InterviewQuestion[] = [
  {
    id: 'NODE-001',
    skill: 'Node.js',
    difficulty: 2,
    type: 'technical',
    text: 'Could you explain how the Node.js Event Loop handles microtasks versus macrotasks during execution?',
  },
  {
    id: 'NODE-002',
    skill: 'Node.js',
    difficulty: 3,
    type: 'practical',
    text: 'How would you diagnose and resolve an active memory leak in a production Node.js service?',
  },
  {
    id: 'PG-001',
    skill: 'PostgreSQL',
    difficulty: 2,
    type: 'technical',
    text: 'What is the difference between B-Tree and Hash indexes in PostgreSQL, and when would you use a composite index?',
  },
  {
    id: 'PG-002',
    skill: 'PostgreSQL',
    difficulty: 3,
    type: 'practical',
    text: 'Explain how Multi-Version Concurrency Control (MVCC) works in PostgreSQL to handle concurrent read and write operations.',
  },
  {
    id: 'SYS-001',
    skill: 'System Design',
    difficulty: 2,
    type: 'technical',
    text: 'What strategies would you use to prevent a cache stampede or thundering herd problem in a distributed system?',
  },
  {
    id: 'SYS-002',
    skill: 'System Design',
    difficulty: 3,
    type: 'practical',
    text: 'How do you approach database connection pooling and connection management under heavy concurrent API traffic?',
  },
  {
    id: 'JS-001',
    skill: 'JavaScript',
    difficulty: 1,
    type: 'technical',
    text: 'What is the difference between var, let, and const declarations in JavaScript regarding scoping and hoisting?',
  },
  {
    id: 'REACT-001',
    skill: 'React',
    difficulty: 2,
    type: 'technical',
    text: 'How does React Reconciliation and the Virtual DOM diffing algorithm optimize DOM updates?',
  },
];

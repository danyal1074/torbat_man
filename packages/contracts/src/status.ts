import type { RequestStatus } from './enums';

/**
 * Staff-driven transitions of the request state machine.
 * Citizen-driven transitions are expressed separately below so the API can
 * enforce *who* may move a request, not only *where* it may go.
 */
export const STAFF_TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  submitted: ['triaged', 'assigned', 'in_progress', 'rejected'],
  triaged: ['assigned', 'in_progress', 'rejected'],
  assigned: ['in_progress', 'waiting_for_citizen', 'resolved', 'rejected'],
  in_progress: ['waiting_for_citizen', 'resolved', 'rejected'],
  waiting_for_citizen: ['in_progress', 'resolved', 'closed'],
  resolved: ['closed', 'in_progress'],
  closed: [],
  rejected: [],
  reopened: ['triaged', 'assigned', 'in_progress', 'rejected'],
};

/** Statuses from which the citizen may reopen (object to a rejection or an unsatisfying resolution). */
export const CITIZEN_REOPENABLE: readonly RequestStatus[] = ['resolved', 'rejected'];

/** Status from which the citizen may rate the result (closure remains a staff action). */
export const CITIZEN_RATEABLE: readonly RequestStatus[] = ['resolved'];

/** Statuses in which the citizen may add a public message. */
export const CITIZEN_CAN_COMMENT: readonly RequestStatus[] = [
  'submitted',
  'triaged',
  'assigned',
  'in_progress',
  'waiting_for_citizen',
  'reopened',
];

/** Statuses that require a reason when a staff member moves a request into them. */
export const REASON_REQUIRED: readonly RequestStatus[] = ['rejected', 'waiting_for_citizen', 'resolved', 'closed'];

export function canStaffTransition(from: RequestStatus, to: RequestStatus): boolean {
  return STAFF_TRANSITIONS[from].includes(to);
}

export function isTerminal(status: RequestStatus): boolean {
  return STAFF_TRANSITIONS[status].length === 0 && !CITIZEN_REOPENABLE.includes(status);
}

/** Ordered milestones used for the citizen-facing progress indicator. */
export const PROGRESS_STEPS: readonly { key: string; label: string; statuses: readonly RequestStatus[] }[] = [
  { key: 'submitted', label: 'ثبت', statuses: ['submitted'] },
  { key: 'review', label: 'بررسی', statuses: ['triaged', 'reopened'] },
  { key: 'work', label: 'رسیدگی', statuses: ['assigned', 'in_progress', 'waiting_for_citizen'] },
  { key: 'done', label: 'نتیجه', statuses: ['resolved', 'closed', 'rejected'] },
];

export function progressIndex(status: RequestStatus): number {
  return PROGRESS_STEPS.findIndex((s) => s.statuses.includes(status));
}

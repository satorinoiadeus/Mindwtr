import type { Project, Task } from '@mindwtr/core';

export type ThingsList = 'inbox' | 'today' | 'upcoming' | 'anytime' | 'someday' | 'logbook' | 'trash';

const pad = (n: number) => String(n).padStart(2, '0');

export function localDayKey(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** YYYY-MM-DD in local time for a date-only or datetime ISO string. */
export function dayKeyOf(iso?: string): string | undefined {
    if (!iso) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? undefined : localDayKey(d);
}

/** "This Evening" = startTime has a time component at/after eveningHour. */
export function isEvening(task: Task, eveningHour = 18): boolean {
    const s = task.startTime;
    if (!s || s.length <= 10) return false;
    const d = new Date(s);
    return !Number.isNaN(d.getTime()) && d.getHours() >= eveningHour;
}

type ProjectMap = ReadonlyMap<string, Project>;

const byOrder = (a: Task, b: Task) =>
    (a.order ?? a.orderNum ?? Number.MAX_SAFE_INTEGER) - (b.order ?? b.orderNum ?? Number.MAX_SAFE_INTEGER) ||
    a.createdAt.localeCompare(b.createdAt);

const isLive = (t: Task) => !t.deletedAt && !t.purgedAt;

function projectOf(t: Task, projects: ProjectMap) {
    return t.projectId ? projects.get(t.projectId) : undefined;
}

/** Open task that is not parked by status or by a someday/archived project. */
function isActive(t: Task, projects: ProjectMap): boolean {
    if (!isLive(t) || t.archivedAt || t.cancelledAt) return false;
    if (t.status !== 'next' && t.status !== 'waiting') return false;
    const p = projectOf(t, projects);
    return !(p && (p.status === 'someday' || p.status === 'archived' || p.deletedAt));
}

export function selectInbox(tasks: readonly Task[]): Task[] {
    return tasks.filter((t) => isLive(t) && t.status === 'inbox').sort(byOrder);
}

export function selectToday(tasks: readonly Task[], projects: ProjectMap, now = new Date()) {
    const today = localDayKey(now);
    const due = tasks.filter((t) => {
        if (!isActive(t, projects)) return false;
        const start = dayKeyOf(t.startTime);
        const deadline = dayKeyOf(t.dueDate);
        return (start !== undefined && start <= today) || (start === undefined && deadline !== undefined && deadline <= today);
    });
    return {
        morning: due.filter((t) => !isEvening(t)).sort(byOrder),
        evening: due.filter((t) => isEvening(t)).sort(byOrder),
    };
}

export function selectUpcoming(tasks: readonly Task[], projects: ProjectMap, now = new Date()) {
    const today = localDayKey(now);
    const groups = new Map<string, Task[]>();
    for (const t of tasks) {
        if (!isActive(t, projects)) continue;
        const start = dayKeyOf(t.startTime);
        if (start === undefined || start <= today) continue;
        groups.set(start, [...(groups.get(start) ?? []), t]);
    }
    return [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, items]) => ({ day, items: items.sort(byOrder) }));
}

export function selectAnytime(tasks: readonly Task[], projects: ProjectMap, now = new Date()): Task[] {
    const today = localDayKey(now);
    return tasks
        .filter((t) => {
            if (!isActive(t, projects)) return false;
            const start = dayKeyOf(t.startTime);
            return start === undefined || start <= today;
        })
        .sort(byOrder);
}

export function selectSomeday(tasks: readonly Task[], projects: ProjectMap): Task[] {
    return tasks
        .filter((t) => {
            if (!isLive(t) || t.archivedAt || t.cancelledAt) return false;
            if (t.status === 'someday') return true;
            const p = projectOf(t, projects);
            return !!p && p.status === 'someday' && (t.status === 'next' || t.status === 'waiting');
        })
        .sort(byOrder);
}

export function selectLogbook(tasks: readonly Task[]): Task[] {
    return tasks
        .filter((t) => isLive(t) && t.status === 'done')
        .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt));
}

export function selectTrash(tasks: readonly Task[]): Task[] {
    return tasks
        .filter((t) => !!t.deletedAt && !t.purgedAt)
        .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));
}

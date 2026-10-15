import { describe, expect, it } from 'vitest';
import type { Project, Task } from '@mindwtr/core';
import { selectInbox, selectToday, selectUpcoming, selectAnytime, selectLogbook, selectTrash } from './selectors';

const now = new Date(2026, 9, 15, 12, 0, 0);
const mk = (o: Partial<Task>): Task => ({
    id: o.id ?? 'x', title: 't', status: 'next', tags: [], contexts: [],
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...o,
});
const noProjects = new Map<string, Project>();

describe('things selectors', () => {
    it('inbox', () => {
        expect(selectInbox([mk({ id: 'a', status: 'inbox' }), mk({ id: 'b' })]).map((t) => t.id)).toEqual(['a']);
    });
    it('today splits morning and evening, includes due-today', () => {
        const r = selectToday([
            mk({ id: 'm', startTime: '2026-10-15' }),
            mk({ id: 'e', startTime: new Date(2026, 9, 15, 19, 0).toISOString() }),
            mk({ id: 'd', dueDate: '2026-10-14' }),
            mk({ id: 'f', startTime: '2026-10-16' }),
        ], noProjects, now);
        expect(r.morning.map((t) => t.id).sort()).toEqual(['d', 'm']);
        expect(r.evening.map((t) => t.id)).toEqual(['e']);
    });
    it('upcoming groups future days', () => {
        const r = selectUpcoming([mk({ id: 'f', startTime: '2026-10-16' }), mk({ id: 'g', startTime: '2026-10-20' })], noProjects, now);
        expect(r.map((g) => g.day)).toEqual(['2026-10-16', '2026-10-20']);
    });
    it('anytime excludes future-dated', () => {
        expect(selectAnytime([mk({ id: 'a' }), mk({ id: 'b', startTime: '2026-10-16' })], noProjects, now).map((t) => t.id)).toEqual(['a']);
    });
    it('logbook and trash', () => {
        expect(selectLogbook([mk({ id: 'd', status: 'done', completedAt: '2026-10-01T00:00:00Z' })]).length).toBe(1);
        expect(selectTrash([mk({ id: 'x', deletedAt: '2026-10-01T00:00:00Z' })]).length).toBe(1);
    });
});

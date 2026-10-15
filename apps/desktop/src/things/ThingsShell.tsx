import { useMemo, useState } from 'react';
import { useTaskStore, type Task } from '@mindwtr/core';
import {
    selectAnytime, selectInbox, selectLogbook, selectSomeday, selectToday, selectTrash, selectUpcoming,
    localDayKey, type ThingsList,
} from './selectors';

const LISTS: { id: ThingsList; label: string }[] = [
    { id: 'inbox', label: 'Inbox' },
    { id: 'today', label: 'Today' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'anytime', label: 'Anytime' },
    { id: 'someday', label: 'Someday' },
    { id: 'logbook', label: 'Logbook' },
    { id: 'trash', label: 'Trash' },
];

type Selection = { kind: 'list'; id: ThingsList } | { kind: 'project'; id: string };

function Row({ task }: { task: Task }) {
    const done = task.checklist?.filter((c) => c.isCompleted).length ?? 0;
    const total = task.checklist?.length ?? 0;
    const store = () => useTaskStore.getState();
    const trashed = !!task.deletedAt;
    const finished = task.status === 'done';
    return (
        <li className="group flex items-start gap-3 py-1.5">
            {trashed ? (
                <button className="mt-0.5 text-xs underline opacity-70" onClick={() => void store().restoreTask(task.id)}>Restore</button>
            ) : (
                <button
                    aria-label={finished ? 'Mark as not done' : 'Complete'}
                    className={`mt-1 h-4 w-4 shrink-0 rounded-full border border-current ${finished ? 'bg-current opacity-60' : 'opacity-60 hover:opacity-100'}`}
                    onClick={() => void store().moveTask(task.id, finished ? 'next' : 'done')}
                />
            )}
            <div className="min-w-0 flex-1">
                <div className={`truncate ${finished ? 'line-through opacity-50' : ''}`}>{task.title}</div>
                <div className="flex gap-2 text-xs opacity-60">
                    {total > 0 && <span>{done}/{total}</span>}
                    {task.dueDate && <span>Due {task.dueDate.slice(0, 10)}</span>}
                    {task.tags.map((t) => <span key={t}>#{t.replace(/^#/, '')}</span>)}
                </div>
            </div>
            {!trashed && (
                <button aria-label="Delete" className="text-xs opacity-0 group-hover:opacity-60" onClick={() => void store().deleteTask(task.id)}>Delete</button>
            )}
        </li>
    );
}

function Block({ title, tasks }: { title?: string; tasks: Task[] }) {
    if (tasks.length === 0) return null;
    return (
        <section className="mb-6">
            {title && <h3 className="mb-1 text-sm font-semibold opacity-70">{title}</h3>}
            <ul>{tasks.map((t) => <Row key={t.id} task={t} />)}</ul>
        </section>
    );
}

export function ThingsShell() {
    const tasks = useTaskStore((s) => s._allTasks);
    const projects = useTaskStore((s) => s._allProjects);
    const sections = useTaskStore((s) => s._allSections);
    const areas = useTaskStore((s) => s._allAreas);
    const [sel, setSel] = useState<Selection>({ kind: 'list', id: 'inbox' });

    const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
    const liveAreas = useMemo(() => areas.filter((a) => !a.deletedAt).sort((a, b) => a.order - b.order), [areas]);
    const liveProjects = useMemo(
        () => projects.filter((p) => !p.deletedAt && p.status !== 'archived').sort((a, b) => a.order - b.order),
        [projects],
    );

    const body = useMemo(() => {
        if (sel.kind === 'project') {
            const own = tasks.filter((t) => t.projectId === sel.id && !t.deletedAt && t.status !== 'done');
            const heads = sections.filter((s) => s.projectId === sel.id && !s.deletedAt).sort((a, b) => a.order - b.order);
            return (
                <>
                    <Block tasks={own.filter((t) => !t.sectionId || !heads.some((h) => h.id === t.sectionId))} />
                    {heads.map((h) => <Block key={h.id} title={h.title} tasks={own.filter((t) => t.sectionId === h.id)} />)}
                </>
            );
        }
        switch (sel.id) {
            case 'inbox': return <Block tasks={selectInbox(tasks)} />;
            case 'today': { const r = selectToday(tasks, projectMap); return <><Block tasks={r.morning} /><Block title="This Evening" tasks={r.evening} /></>; }
            case 'upcoming': return <>{selectUpcoming(tasks, projectMap).map((g) => <Block key={g.day} title={g.day} tasks={g.items} />)}</>;
            case 'anytime': return <Block tasks={selectAnytime(tasks, projectMap)} />;
            case 'someday': return <Block tasks={selectSomeday(tasks, projectMap)} />;
            case 'logbook': return <Block tasks={selectLogbook(tasks)} />;
            case 'trash': return <Block tasks={selectTrash(tasks)} />;
        }
    }, [sel, tasks, sections, projectMap]);

    const title = sel.kind === 'list' ? LISTS.find((l) => l.id === sel.id)?.label : projectMap.get(sel.id)?.title;
    const btn = (active: boolean) =>
        `block w-full rounded-md px-3 py-1.5 text-left text-sm ${active ? 'bg-black/10 dark:bg-white/15 font-medium' : 'hover:bg-black/5 dark:hover:bg-white/10'}`;

    return (
        <div className="flex h-screen">
            <nav className="w-60 shrink-0 overflow-y-auto border-r border-black/10 p-3 dark:border-white/10">
                {LISTS.map((l) => (
                    <button key={l.id} className={btn(sel.kind === 'list' && sel.id === l.id)} onClick={() => setSel({ kind: 'list', id: l.id })}>{l.label}</button>
                ))}
                {liveAreas.map((a) => (
                    <div key={a.id} className="mt-4">
                        <div className="px-3 text-xs font-semibold uppercase opacity-50">{a.name}</div>
                        {liveProjects.filter((p) => p.areaId === a.id).map((p) => (
                            <button key={p.id} className={btn(sel.kind === 'project' && sel.id === p.id)} onClick={() => setSel({ kind: 'project', id: p.id })}>{p.title}</button>
                        ))}
                    </div>
                ))}
                {liveProjects.some((p) => !p.areaId) && (
                    <div className="mt-4">
                        {liveProjects.filter((p) => !p.areaId).map((p) => (
                            <button key={p.id} className={btn(sel.kind === 'project' && sel.id === p.id)} onClick={() => setSel({ kind: 'project', id: p.id })}>{p.title}</button>
                        ))}
                    </div>
                )}
            </nav>
            <main className="flex-1 overflow-y-auto p-8">
                <h1 className="mb-6 text-2xl font-bold">{title}</h1>
                <QuickEntry sel={sel} />
                {body}
            </main>
        </div>
    );
}

function dayOffset(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return localDayKey(d);
}

function QuickEntry({ sel }: { sel: Selection }) {
    const [text, setText] = useState('');
    if (sel.kind === 'list' && (sel.id === 'logbook' || sel.id === 'trash')) return null;
    const submit = () => {
        const title = text.trim();
        if (!title) return;
        let props: Partial<Task> = { status: 'next' };
        if (sel.kind === 'project') props = { status: 'next', projectId: sel.id };
        else if (sel.id === 'inbox') props = { status: 'inbox' };
        else if (sel.id === 'today') props = { status: 'next', startTime: dayOffset(0) };
        else if (sel.id === 'upcoming') props = { status: 'next', startTime: dayOffset(1) };
        else if (sel.id === 'someday') props = { status: 'someday' };
        void useTaskStore.getState().addTask(title, props);
        setText('');
    };
    return (
        <input
            className="mb-6 w-full rounded-md border border-black/10 bg-transparent px-3 py-2 text-sm outline-none dark:border-white/20"
            placeholder="New To-Do"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        />
    );
}

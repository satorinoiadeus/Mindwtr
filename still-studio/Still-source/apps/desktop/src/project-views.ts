import type { Task } from "./domain";

/** Still keeps the original heading field as the board lane: no data migration. */
export const DEFAULT_LANES = ["To do", "In progress", "Waiting"] as const;
export type SortMode = "position" | "date" | "priority" | "title";

export function boardLane(task: Pick<Task, "heading">): string {
    return task.heading.trim() || "To do";
}

export function boardColumns(tasks: readonly Pick<Task, "heading">[]): string[] {
    const columns: string[] = [...DEFAULT_LANES];
    for (const task of tasks) {
        const lane = boardLane(task);
        if (!columns.includes(lane)) columns.push(lane);
    }
    return columns;
}

const priorityRank = { high: 0, none: 1, low: 2 } as const;

export function filterAndSortTasks(
    tasks: readonly Task[],
    search: string,
    priority: string,
    sort: SortMode,
): Task[] {
    const needle = search.trim().toLocaleLowerCase();
    return tasks
        .filter((t) => (priority === "all" || t.priority === priority) &&
            (!needle || `${t.title} ${t.notes} ${t.tags.join(" ")} ${t.heading}`.toLocaleLowerCase().includes(needle)))
        .sort((a, b) => {
            if (sort === "title") return a.title.localeCompare(b.title) || a.order - b.order;
            if (sort === "date") return (a.scheduled ?? "9999-12-31").localeCompare(b.scheduled ?? "9999-12-31") || a.order - b.order;
            if (sort === "priority") return priorityRank[a.priority] - priorityRank[b.priority] || a.order - b.order;
            return a.order - b.order;
        });
}

export function calendarCells(year: number, month: number): (string | null)[] {
    const first = new Date(year, month, 1, 12);
    const start = (first.getDay() + 6) % 7; // Monday first
    const count = new Date(year, month + 1, 0, 12).getDate();
    const cells: (string | null)[] = Array(start).fill(null);
    for (let day = 1; day <= count; day++) {
        cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}

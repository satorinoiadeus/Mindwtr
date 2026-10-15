import { useEffect } from 'react';
import { useTaskStore } from '@mindwtr/core';
import { ThingsShell } from './ThingsShell';

export function ThingsApp() {
    const fetchData = useTaskStore((s) => s.fetchData);
    useEffect(() => { void fetchData(); }, [fetchData]);
    return <ThingsShell />;
}

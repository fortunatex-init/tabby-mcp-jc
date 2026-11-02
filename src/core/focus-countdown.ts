export class FocusCountdown {
    readonly totalMs: number;
    private storedMs: number;
    private runningSince: number | null = null;

    constructor(totalMs: number) {
        this.totalMs = totalMs;
        this.storedMs = totalMs;
    }

    get running(): boolean {
        return this.runningSince !== null;
    }

    remainingAt(now: number): number {
        if (this.runningSince === null) {
            return this.storedMs;
        }
        return Math.max(0, this.storedMs - (now - this.runningSince));
    }

    focus(now: number): void {
        if (this.runningSince !== null || this.storedMs <= 0) {
            return;
        }
        this.runningSince = now;
    }

    blur(now: number): void {
        if (this.runningSince === null) {
            return;
        }
        this.storedMs = this.remainingAt(now);
        this.runningSince = null;
    }
}

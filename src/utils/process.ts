import { spawn } from "child_process";
import { WriteStream } from "fs";

export const execute = (command: string, env: Record<string, string> = {}) =>
    new Promise<number>((resolve, reject) => {
        const [path, ...args] = command.split(" ");
        const child = spawn(path, args, {
            env: {
                FORCE_COLOR: "true",
                ...process.env,
                ...env,
            },
            shell: true,
        });
        child.stdout?.on("data", data => process.stdout.write(data));
        child.stderr?.on("data", data => reject(data.toString()));
        child.on("exit", (code: number) => {
            resolve(code);
        });
    });

export const executeBackground = (command: string, stream?: WriteStream, onInterrupt?: (args?: unknown[]) => void) => {
    const [path, ...args] = command.split(" ");
    const child = spawn(path, args, {
        shell: true,
        detached: true,
    });
    child.stdout?.on("data", data => stream?.write(data) || process.stdout.write(data));
    child.stdout?.on("error", error => stream?.write(error) || process.stdout.write(error.stack || ""));
    child.stderr?.on("data", data => stream?.write(data) || process.stdout.write(data));
    child.stderr?.on("error", error => stream?.write(error) || process.stderr.write(error.stack || ""));
    [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach(interrupt => {
        process.on(interrupt, (...args: unknown[]) => {
            child.kill();
            if (interrupt !== "exit") {
                onInterrupt?.(args);
            }
        });
    });
};

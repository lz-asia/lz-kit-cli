import { spawn } from "child_process";
import { WriteStream } from "fs";

export const execute = (command: string, env: Record<string, string> = {}) =>
    new Promise<number>(resolve => {
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
        child.stderr?.on("data", data => process.stderr.write(data));
        child.on("exit", (code: number) => {
            resolve(code);
        });
    });

export const executeBackground = (command: string, stream?: WriteStream) => {
    const [path, ...args] = command.split(" ");
    const child = spawn(path, args, {
        shell: true,
        detached: true,
    });
    child.stdout?.on("data", data => stream?.write(data) || process.stdout.write(data));
    child.stderr?.on("data", data => stream?.write(data) || process.stderr.write(data));
    [`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach(eventType => {
        process.on(eventType, () => {
            child.kill();
        });
    });
};

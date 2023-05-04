import c from "ansi-colors";

export const logSuccess = (message: string, withNewLine = false) => {
    console.log(c.green("✔ ") + message);
    if (withNewLine) {
        console.log();
    }
};

export const logInfo = (message: string, withNewLine = false) => {
    console.log(c.blue("⛭ ") + message);
    if (withNewLine) {
        console.log();
    }
};

export const logFailure = (message: string, withNewLine = false) => {
    console.log(c.red("✖ ") + message);
    if (withNewLine) {
        console.log();
    }
};

export const logStack = (e: unknown) => {
    logFailure((e as Error).message);
    console.trace(e);
};

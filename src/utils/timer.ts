import loading, { Loading } from "loading-cli";

let start = 0;
let loader: Loading;
let timer: NodeJS.Timer;

const elapsed = () => {
    const elapsed = Date.now() - start;
    const hh = Math.floor(elapsed / 1000 / 3600);
    const mm = Math.floor(((elapsed / 1000) % 3600) / 60);
    const ss = Math.floor((elapsed / 1000) % 60);
    const format = (n: number) => n.toString().padStart(2, "0");
    return `${format(hh)}:${format(mm)}:${format(ss)}`;
};

export const startTimer = (text: string) => {
    if (loader) {
        loader.stop();
    }
    if (timer) {
        clearInterval(timer);
    }
    start = Date.now();
    loader = loading(text).start();
    timer = setInterval(() => {
        loader.text = text + " - " + elapsed();
    }, 1000);
};

export const stopTimer = (text: string, success = true) => {
    if (loader) {
        if (success) {
            loader.succeed(text + " - " + elapsed());
        } else {
            loader.fail(text + " - " + elapsed());
        }
    }
    if (timer) {
        clearInterval(timer);
    }
};

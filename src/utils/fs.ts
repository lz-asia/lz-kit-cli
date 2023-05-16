import fs from "fs";

export const createWriteStream = (path: string, name: string) => {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path, { recursive: true });
    }
    const file = path + "/" + name;
    fs.openSync(file, "w");
    const stream = fs.createWriteStream(file);
    return { file, stream };
};

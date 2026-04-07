import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

function getArg(name, fallback) {
    const prefix = `--${name}=`;
    const arg = process.argv.find((item) => item.startsWith(prefix));
    if (!arg) {
        return fallback;
    }
    return arg.slice(prefix.length);
}

function getPnpmCommand() {
    return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd: rootDir,
            stdio: "inherit",
            shell: false,
            ...options,
        });

        child.on("error", reject);
        child.on("exit", (code) => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`));
        });
    });
}

async function isServerReady() {
    try {
        const response = await fetch("http://localhost:3005", {
            method: "GET",
            redirect: "manual",
            signal: AbortSignal.timeout(1500),
        });
        return response.status > 0;
    } catch {
        return false;
    }
}

async function waitForServer(timeoutMs = 90000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
        if (await isServerReady()) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error("Timed out waiting for demo server on http://localhost:3005");
}

function terminateServer(child) {
    if (!child || child.killed) {
        return;
    }

    if (process.platform === "win32") {
        const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
            stdio: "ignore",
            shell: false,
        });
        killer.on("error", () => {
            child.kill();
        });
        return;
    }

    child.kill("SIGTERM");
}

function startServer(mode) {
    const pnpm = getPnpmCommand();
    const args =
        mode === "dev"
            ? ["--filter", "demo", "dev"]
            : ["--filter", "demo", "exec", "next", "start", "-p", "3005"];

    return spawn(pnpm, args, {
        cwd: rootDir,
        stdio: "inherit",
        shell: false,
    });
}

async function main() {
    const mode = getArg("mode", "build");
    const skipGeneration = process.env.SKEL_SKIP_GENERATION === "1" || process.env.SKEL_SKIP_GENERATION === "true";

    if (skipGeneration) {
        console.log("Skipping skeleton generation because SKEL_SKIP_GENERATION is set.");
        return;
    }

    const pnpm = getPnpmCommand();
    const alreadyRunning = await isServerReady();
    let server;

    try {
        if (!alreadyRunning) {
            console.log(`Starting demo server in ${mode} mode for skeleton capture...`);
            server = startServer(mode);
            await waitForServer();
        } else {
            console.log("Detected demo server on http://localhost:3005. Reusing existing server.");
        }

        console.log("Running skeleton capture generation...");
        await runCommand(pnpm, ["capture:demo"]);
        console.log("Skeleton generation complete.");
    } finally {
        if (server) {
            console.log("Stopping demo server...");
            terminateServer(server);
        }
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});

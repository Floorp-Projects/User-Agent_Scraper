import http from "http";
import child_process from "child_process";
import net from "net";

const serverPortMin = 32768;
const serverPortMax = 60999;
let serverPort;
while (true) {
    serverPort = Math.floor(Math.random() * ((serverPortMax - serverPortMin) + 1)) + serverPortMin;
    const isPortFree = await new Promise((resolve, reject) => {
        const tester = net.createServer()
            .once("error", function(e) {
                if (e.code !== "EADDRINUSE" && e.code !== "EACCES") reject(e);
                resolve(false);
            })
            .once("listening", function() {
                tester.once("close", function() {
                    resolve(true);
                })
                .close();
            })
            .listen(serverPort, "127.0.0.1");
    });
    if (isPortFree) break;
}

const userAgent = new Promise((resolve, reject) => {
    const timeout = setTimeout(function() {
        reject("Waited for a request from the browser, but it was never requested.");
    }, 30000);
    let sockets = [], nextSocketId = 0;
    const server = http.createServer(function(request, response) {
        response.writeHead(
            request.method === "GET" ? 200 : 405,
            {"Content-Type": "text/plain"}
        );
        response.end("");
        clearTimeout(timeout);
        this.close(function() {
            resolve(request.headers["user-agent"]);
        });
        for (let socketId of Object.keys(sockets)) {
            try {
                sockets[socketId].destroy();
            } catch (e) {}
        }
    }).listen(serverPort, "127.0.0.1");
    server.on("connection", function(socket) {
        const socketId = nextSocketId++;
        sockets[socketId] = socket;
        socket.on("close", function() {
            delete sockets[socketId];
        });
    });
});

const browserProcess = child_process.execFile(
    process.argv[2],
    [`http://127.0.0.1:${serverPort}`],
    {
        env: {
            "MOZ_AUTOMATION": "1",
        },
    },
);

console.log(await userAgent);

browserProcess.kill();
process.exit();

import http from "http";
import child_process from "child_process";

const serverPortMin = 32768;
const serverPortMax = 60999;
const serverPort = Math.floor(Math.random() * ((serverPortMax - serverPortMin) + 1)) + serverPortMin;

const userAgent = new Promise(resolve => {
    let sockets = [], nextSocketId = 0;
    const server = http.createServer(function(request, response) {
        response.writeHead(
            request.method === "GET" ? 200 : 405,
            {"Content-Type": "text/plain"}
        );
        response.end("");
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
    [`http://localhost:${serverPort}`]
);

console.log(await userAgent);

browserProcess.kill();
process.exit();

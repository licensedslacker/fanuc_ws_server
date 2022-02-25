const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const axios = require("axios");

const PORT = process.env.PORT || 3000;

let connections = [];

app.use("/", (req, res, next) => {
    console.log("Root requets");
    next();
});

io.on("connection", (socket) => {
    console.log(`${socket.id} connected`)
    connections[socket.id] = socket;

    socket.on("disconnect", (reason) => {
        delete connections[socket.id];
        console.log(`${socket.id} disconnected: ${reason}`)
    });
});

const BroadcastJoinValues = (joint_values) => {
    for (let id in connections) {
        connections[id].emit("joint_values", joint_values);
    }
};

const GetJointValues = () => {
    return axios
        .get("https://fanuc-robot-http-server.herokuapp.com/")
        .then((robot_res) => {
            const regexp = "Joint   [1-6]: *(-?.*)";
            let joint_values = [];
            let matches = robot_res.data.matchAll(regexp);
            let count = 0;
            for (const match of matches) {
                count++;
                if (count > 6) break;
                const value = parseFloat(match[1]);
                joint_values.push(value);
            }
            // console.log(joint_values);

            return joint_values;
        });
};

const MainLoop = () => {
    GetJointValues().then((value) => {
        BroadcastJoinValues(value)
        // console.log(value)
        MainLoop();
    });
};

MainLoop();

server.listen(PORT);
console.log(`Listening port ${PORT}`)
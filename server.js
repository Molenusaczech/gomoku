const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });
const http = require('http');
const fs = require('fs');
const { start } = require('repl');
let mainSocket = null;
let games = {};
let users = {};

const hostname = "10.0.1.19";
const port = 8000;

const server = http.createServer((req, res) => {

    if (req.url == "/main.js") {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/javascript');
        let js = fs.readFileSync("client/main.js", "utf8");
        res.end(js);
        return;
    }

    if (req.url == "/style.css") {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/css');
        let css = fs.readFileSync("client/style.css", "utf8");
        res.end(css);
        return;
    }

    if (req.url == "/") {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        let html = fs.readFileSync("client/client.html", "utf8");
        res.end(html);
    };
});

function invertPlayer(player) {
    if (player == 1) {
        return 2;
    } else {
        return 1;
    }
}

function startGame(id) {

    games[id]["status"] = "swap1";
    if (games[id]["startingPlayer"] == null) {
        games[id]["startingPlayer"] = Math.floor(Math.random()) + 1;
    } else {

        if (games[id]["startingPlayer"] == 1) {
            games[id]["startingPlayer"] = 2;
        }

        if (games[id]["startingPlayer"] == 2) {
            games[id]["startingPlayer"] = 1;
        }

    }
    games[id]["player1Symbol"] = null;
    games[id]["player2Symbol"] = null;
    games[id]["player1Time"] = games[id]["tempo"];
    games[id]["player2Time"] = games[id]["tempo"];
    games[id]["playerTurn"] = games[id]["startingPlayer"];
    games[id]["turnStartTime"] = Date.now();
    games[id]["board"] = [
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    ]

    games[id]["spectators"].forEach(function (spectator) {
        users[spectator].send(JSON.stringify(
            {
                "type": "gameUpdated",
                "data": games[id]
            }));
    });

}

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

wss.on('connection', function connection(ws) {
    console.log("Client Connected");
    ws.on('message', function (message) {
        message = JSON.parse(message + "");
        let action = message.type;
        let data = message.data;
        console.log("action: " + action);
        console.log(data);

        if (action == "auth") {
            console.log("Authenticating user");
            users[data.username] = ws;
            console.log(users);
            ws.send(JSON.stringify({ type: "auth", data: { "games": games } }));
            return;
        }

        if (ws != users[data.username]) {
            console.log("User not authenticated");
            return;
        }

        if (action == "create") {
            console.log("Creating Game");
            let game = {
                id: Math.random().toString(36).substr(2, 9),
                player1: null,
                player2: null,
                startingPlayer: null,
                player1Symbol: null,
                playerTurn: 0,
                player2Symbol: null,
                startingPlayer: null,
                admin: data.username,
                tempo: 90,
                fisher: 0,
                spectators: [ data.username ],
                status: "waiting",
                board: [
                    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
                    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
                    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
                    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
                    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
                    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
                    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
                    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
                    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
                    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
                    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
                    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
                    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
                    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
                    ["", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
                ]
            };
            games[game.id] = game;
            ws.send(JSON.stringify(game));

            ws.send(JSON.stringify(
                {
                    "type": "gameJoined",
                    "data": game
                }));

            wss.broadcast(JSON.stringify({
                type: "gameCreated",
                game: game
            }));
        }

        if (action == "join") {
            console.log("Joining Game");

            if (games[data.id] == null) {
                console.log("Game not found");
                return;
            }

            if (!games[data.id]["spectators"].includes(data.username)) {
                games[data.id]["spectators"].push(data.username);
            }
            //console.log(games[data.id]);
            ws.send(JSON.stringify(
                {
                    "type": "gameJoined",
                    "data": games[data.id]
                }));

            games[data.id]["spectators"].forEach(function (spectator) {
                users[spectator].send(JSON.stringify(
                    {
                        "type": "gameUpdated",
                        "data": games[data.id]
                    }));
            });

        }

        if (action == "leave") {

            console.log("Leaving Game");
            console.log(games[data.id]["spectators"])
            let index = games[data.id]["spectators"].indexOf(data.username);
            if (index > -1) {
                games[data.id]["spectators"].splice(index, 1);
            }

            ws.send(JSON.stringify({
                "type": "gameLeft",
                "data": games[data.id]
            }));

            games[data.id]["spectators"].forEach(function (spectator) {
                users[spectator].send(JSON.stringify(
                    {
                        "type": "gameUpdated",
                        "data": games[data.id]
                    }));
            });

        }

        if (action == "sit") {
            console.log("Sitting at Game");
            if (games[data.id] == null) {
                console.log("Game not found");
                return;
            }
            if (!games[data.id]["spectators"].includes(data.username)) {
                games[data.id]["spectators"].push(data.username);
            }
            if (data.slot == 1 && games[data.id]["player1"] == null && games[data.id]["player2"] != data.username) {
                games[data.id]["player1"] = data.username;
                console.log("Player 1 set");
            }

            if (data.slot == 2 && games[data.id]["player2"] == null && games[data.id]["player1"] != data.username) {
                games[data.id]["player2"] = data.username;
                console.log("Player 2 set");
            }

            games[data.id]["spectators"].forEach(function (spectator) {
                users[spectator].send(JSON.stringify(
                    {
                        "type": "gameUpdated",
                        "data": games[data.id]
                    }));
            });


        }

        if (action == "unsit") {
            console.log("Unsitting at Game");

            if (games[data.id] == null) {
                console.log("Game not found");
                return;
            }

            if (games[data.id]["player1"] == data.username) {
                games[data.id]["player1"] = null;
                console.log("Player 1 unset");
            }

            if (games[data.id]["player2"] == data.username) {
                games[data.id]["player2"] = null;
                console.log("Player 2 unset");
            }

            games[data.id]["spectators"].forEach(function (spectator) {
                users[spectator].send(JSON.stringify(
                    {
                        "type": "gameUpdated",
                        "data": games[data.id]
                    }));
            });

        }

        if (action == "start") {
            console.log("Starting Game");

            if (games[data.id] == null) {
                console.log("Game not found");
                return;
            }

            if (games[data.id]["player1"] == null || games[data.id]["player2"] == null) {
                console.log("Not enough players");
                return;
            }

            if (games[data.id]["status"] == "waiting") {

                if (games[data.id]["player1"] == data.username) {
                    games[data.id]["status"] = "start1";
                } else if (games[data.id]["player2"] == data.username) {
                    games[data.id]["status"] = "start2";
                } else {
                    console.log("Not a player");
                    return;
                }

                games[data.id]["spectators"].forEach(function (spectator) {
                    users[spectator].send(JSON.stringify(
                        {
                            "type": "gameUpdated",
                            "data": games[data.id]
                        }));
                });
            } else if (games[data.id]["status"] == "start1") {
                if (games[data.id]["player2"] == data.username) {
                    startGame(data.id);
                }
            } else if (games[data.id]["status"] == "start2") {
                if (games[data.id]["player1"] == data.username) {
                    startGame(data.id);
                }
            }
        }

        if (action == "place") {

            if (games[data.id] == null) {
                console.log("Game not found");
                return;
            }

            if (games[data.id]["board"][data.x][data.y] != "") {
                console.log("Invalid move");
                return;
            }

            let player = null;
            if (games[data.id]["player1"] == data.username) {
                player = 1;
            } else if (games[data.id]["player2"] == data.username) {
                player = 2;
            } else {
                console.log("Not a player");
                return;
            }

            console.log("Placing " + data.x + "" + data.y + " for player " + player);
            
            if (player == games[data.id]["startingPlayer"]) {
                console.log("valid swap");
                if (games[data.id]["status"] == "swap1") {
                    games[data.id]["board"][data.x][data.y] = "x";
                    games[data.id]["status"] = "swap2";
                    games[data.id]["turnStartTime"] = Date.now();
                } else if (games[data.id]["status"] == "swap2") {
                    games[data.id]["board"][data.x][data.y] = "o";
                    games[data.id]["status"] = "swap3";
                    games[data.id]["turnStartTime"] = Date.now();
                }
                else if (games[data.id]["status"] == "swap3") {
                    games[data.id]["board"][data.x][data.y] = "x";
                    games[data.id]["status"] = "swap4";
                    games[data.id]["playerTurn"] = invertPlayer(games[data.id]["startingPlayer"]);
                    games[data.id]["turnStartTime"] = Date.now();
                }
            } else {
                if (games[data.id]["status"] == "swap4") {
                    games[data.id]["board"][data.x][data.y] = "o";
                    games[data.id]["status"] = "swap5";
                    games[data.id]["turnStartTime"] = Date.now();
                } else if (games[data.id]["status"] == "swap5") {
                    games[data.id]["board"][data.x][data.y] = "x";
                    games[data.id]["status"] = "choose";
                    games[data.id]["playerTurn"] = games[data.id]["startingPlayer"];
                    games[data.id]["turnStartTime"] = Date.now();
                }

            }

            if (games[data.id]["status"] == "turn1" && player == 1) {
                games[data.id]["board"][data.x][data.y] = games[data.id]["player1Symbol"];
                games[data.id]["status"] = "turn2";
                games[data.id]["playerTurn"] = 2;
                //add time from fisher
                games[data.id]["player1Time"] = Number(games[data.id]["fisher"]) + Number(games[data.id]["player1Time"]);
                games[data.id]["turnStartTime"] = Date.now();
            }

            if (games[data.id]["status"] == "turn2" && player == 2) {
                games[data.id]["board"][data.x][data.y] = games[data.id]["player2Symbol"];
                games[data.id]["status"] = "turn1";
                games[data.id]["playerTurn"] = 1;
                //add time from fisher
                games[data.id]["player2Time"] = Number(games[data.id]["fisher"]) + Number(games[data.id]["player2Time"]);
                games[data.id]["turnStartTime"] = Date.now();
            }

            // check for win

            let win = "";

            let xCount = 0;
            let oCount = 0;
            // check rows
            for (let x = 0; x < 14; x++) {
                for (let y = 0; y < 14; y++) {
                    if (games[data.id]["board"][x][y] == "x") {
                        xCount++;
                    } else {
                        if (xCount == 5) {
                            win = "x";
                        }
                        xCount = 0;
                    }
                    if (games[data.id]["board"][x][y] == "o") {
                        oCount++;
                    } else {
                        if (oCount == 5) {
                            win = "o";
                        }
                        oCount = 0;
                    }
                }
                xCount = 0;
                oCount = 0;
            }

            // check columns

            xCount = 0;
            oCount = 0;

            for (let y = 0; y < 14; y++) {
                for (let x = 0; x < 14; x++) {
                    if (games[data.id]["board"][x][y] == "x") {
                        xCount++;
                    } else {
                        if (xCount == 5) {
                            win = "x";
                        }
                        xCount = 0;
                    }
                    if (games[data.id]["board"][x][y] == "o") {
                        oCount++;
                    } else {
                        if (oCount == 5) {
                            win = "o";
                        }
                        oCount = 0;
                    }
                }
                xCount = 0;
                oCount = 0;
            }

            // check diagonal 1

            for (let x = -14; x < 14; x++) {
                for (let y = 0; y < 14; y++) {
                    if (!games[data.id]["board"][x+y]) {
                        
                        if (xCount == 5) {
                            win = "x";
                        }

                        if (oCount == 5) {
                            win = "o";
                        }

                        continue;
                        
                    }

                    if (!games[data.id]["board"][x+y][y]) {

                        if (xCount == 5) {
                            win = "x";
                        }

                        if (oCount == 5) {
                            win = "o";
                        }

                        continue;
                    }

                    let symbol = games[data.id]["board"][x+y][y] || "";
                    //console.log(symbol);
                    symbol ??= "";
                    if (symbol == "x") {
                        xCount++;
                    } else {
                        if (xCount == 5) {
                            win = "x";
                        }
                        xCount = 0;
                    }
                    if (symbol == "o") {
                        oCount++;
                    } else {
                        if (oCount == 5) {
                            win = "o";
                        }
                        oCount = 0;
                    }
                }
                //console.log("new line")
                xCount = 0;
                oCount = 0;
            }

            // check diagonal 2

            for (let x = 29; x > 0; x--) {
                for (let y = 0; y < 14; y++) {
                    if (!games[data.id]["board"][x-y]) {
                        
                        if (xCount == 5) {
                            win = "x";
                        }

                        if (oCount == 5) {
                            win = "o";
                        }

                        continue;
                        
                    }

                    if (!games[data.id]["board"][x-y][y]) {

                        if (xCount == 5) {
                            win = "x";
                        }

                        if (oCount == 5) {
                            win = "o";
                        }

                        continue;
                    }

                    let symbol = games[data.id]["board"][x-y][y] || "";
                    //console.log(symbol);
                    symbol ??= "";
                    if (symbol == "x") {
                        xCount++;
                    } else {
                        if (xCount == 5) {
                            win = "x";
                        }
                        xCount = 0;
                    }
                    if (symbol == "o") {
                        oCount++;
                    } else {
                        if (oCount == 5) {
                            win = "o";
                        }
                        oCount = 0;
                    }
                }
                //console.log("new line")
                xCount = 0;
                oCount = 0;
            }

            // final check

            if (win == "x") {
                console.log("X wins");
                games[data.id]["playerTurn"] = null;
                if (games[data.id]["player1Symbol"] == "x") {
                    games[data.id]["status"] = "waiting";
                    games[data.id]["winner"] = 1;
                } else {
                    games[data.id]["status"] = "waiting";
                    games[data.id]["winner"] = 2;
                }
            } else if (win == "o") {
                console.log("O wins");
                games[data.id]["playerTurn"] = null;
                if (games[data.id]["player1Symbol"] == "o") {
                    games[data.id]["status"] = "waiting";
                    games[data.id]["winner"] = 1;
                } else {
                    games[data.id]["status"] = "waiting";
                    games[data.id]["winner"] = 2;
                }
            }

            games[data.id]["spectators"].forEach(function (spectator) {
                users[spectator].send(JSON.stringify(
                    {
                        "type": "gameUpdated",
                        "data": games[data.id]
                    }));
            });


        }

        if (action == "pick") {
            if (games[data.id] == null) {
                console.log("Game not found");
                return;
            }

            let player = null;
            if (games[data.id]["player1"] == data.username) {
                player = 1;
            } else if (games[data.id]["player2"] == data.username) {
                player = 2;
            } else {
                console.log("Not a player");
                return;
            }

            if (games[data.id]["status"] == "swap4") {
                if (player == games[data.id]["startingPlayer"]) {
                    console.log("Wrong player");
                    return;
                }

                games[data.id]["turnStartTime"] = Date.now();

                if (data.symbol == "x") {
                    
                    if (games[data.id]["startingPlayer"] == 1) {
                        games[data.id]["status"] = "turn1";
                        games[data.id]["player1Symbol"] = "o";
                        games[data.id]["playerTurn"] = 1;
                        games[data.id]["player2Symbol"] = "x";
                    } else {
                        games[data.id]["status"] = "turn2";
                        games[data.id]["player1Symbol"] = "x";
                        games[data.id]["player2Symbol"] = "o";
                        games[data.id]["playerTurn"] = 2;
                    }

                } else if (data.symbol == "o") {
                    if (games[data.id]["startingPlayer"] == 1) {
                        games[data.id]["status"] = "turn2";
                        games[data.id]["player1Symbol"] = "x";
                        games[data.id]["player2Symbol"] = "o";
                        games[data.id]["playerTurn"] = 2;
                    } else {
                        games[data.id]["status"] = "turn1";
                        games[data.id]["player1Symbol"] = "o";
                        games[data.id]["player2Symbol"] = "x";
                        games[data.id]["playerTurn"] = 1;
                    }
                }

            } else if (games[data.id]["status"] == "choose") {
                if (player != games[data.id]["startingPlayer"]) {
                    console.log("Wrong player");
                    return;
                }

                games[data.id]["turnStartTime"] = Date.now();

                if (data.symbol == "x") {
                    if (games[data.id]["startingPlayer"] == 1) {
                        games[data.id]["status"] = "turn2";
                        games[data.id]["player1Symbol"] = "x";
                        games[data.id]["player2Symbol"] = "o";
                        games[data.id]["playerTurn"] = 2;
                    } else {
                        games[data.id]["status"] = "turn1";
                        games[data.id]["player1Symbol"] = "o";
                        games[data.id]["player2Symbol"] = "x";
                        games[data.id]["playerTurn"] = 1;
                    }
                } else if (data.symbol == "o") {
                    if (games[data.id]["startingPlayer"] == 1) {
                        games[data.id]["status"] = "turn1";
                        games[data.id]["player1Symbol"] = "o";
                        games[data.id]["player2Symbol"] = "x";
                        games[data.id]["playerTurn"] = 1;
                    } else {
                        games[data.id]["status"] = "turn2";
                        games[data.id]["player1Symbol"] = "x";
                        games[data.id]["player2Symbol"] = "o";
                        games[data.id]["playerTurn"] = 2;
                    }
                }
            }

            games[data.id]["spectators"].forEach(function (spectator) {
                users[spectator].send(JSON.stringify(
                    {
                        "type": "gameUpdated",
                        "data": games[data.id]
                    }));
            });

        }

        if (action == "updateSettings") {

            if (games[data.id] == null) {
                console.log("Game not found");
                return;
            }

            if (games[data.id]["admin"] != data.username) {
                console.log("Not an admin");
                return;
            }

            if (games[data.id]["status"] != "waiting") {
                console.log("Game already started");
                return;
            }

            if (data.tempo != null && data.tempo >= 1 && data.tempo <= 36000) {
                games[data.id]["tempo"] = data.tempo;
            }

            if (data.fisher != null && data.fisher >= 0 && data.fisher <= 600) {
                games[data.id]["fisher"] = data.fisher;
            }

            games[data.id]["spectators"].forEach(function (spectator) {
                users[spectator].send(JSON.stringify(
                    {
                        "type": "gameUpdated",
                        "data": games[data.id]
                    }));
            });

        }

        //ws.send("Hello from server");
    });

    ws.on('close', function () {
        console.log("Client Disconnected");
    });

});

wss.broadcast = function broadcast(msg) {
    wss.clients.forEach(function each(client) {
        client.send(msg);
    });
};


setInterval(() => {
    

    for (const [key, value] of Object.entries(games)) {
        if (value["playerTurn"] == 0) {
            continue;
        }

        games[key]["player"+value["playerTurn"]+"Time"] -= 1;

        if (games[key]["player"+value["playerTurn"]+"Time"] <= 0) {

            games[key]["winner"] = invertPlayer(value["playerTurn"]);
            games[key]["playerTurn"] = null;
            games[key]["status"] = "waiting";

            games[key]["spectators"].forEach(function (spectator) {
                users[spectator].send(JSON.stringify(
                    {
                        "type": "gameUpdated",
                        "data": games[key]
                    }));
            });


        }

    }

}, 1000);
// Create WebSocket connection.

let username = "test";

if (window.location.search != "" && window.location.search != null) {
    username = window.location.search;
    username = username.replace("?", "");
}

const socket = new WebSocket("ws://localhost:8080");

// Connection opened
socket.addEventListener("open", (event) => {
    let data = {
        "type": "auth",
        "data": {
            "username": username,
        }
    };
    socket.send(JSON.stringify(data));
});

// Listen for messages
socket.addEventListener("message", (event) => {
    console.log("Message from server ", event.data);
    let data = JSON.parse(event.data);
    if (data.type == "gameCreated") {
        console.log("Game Created");
        let html = `
            <tr>
            <td>${data.game.id}</td>
            <td><button onclick=joinGame("${data.game.id}")>Join</button></td>
            </tr>
        `;
        document.getElementById("games").innerHTML += html;
        console.log(data.game);
    } else if (data.type == "gameJoined" || data.type == "gameUpdated") {
        renderGame(data.data);
    } else if (data.type == "auth") {
        console.log("Auth");
        console.log(data.data);
        /*document.getElementById("games").innerHTML = data.data.games.map((game) => `
            <tr>
            <td>${game.id}</td>
            <td><button onclick=joinGame("${game.id}")>Join</button></td>
            </tr>
        `).join("");*/

        let gameText = "";

        for (const [key, value] of Object.entries(data.data.games)) {
            console.log(key, value);
            gameText += `
            <tr>
            <td>${value.id}</td>
            <td><button onclick=joinGame("${value.id}")>Join</button></td>
            </tr>
        `;
        }

        document.getElementById("games").innerHTML = gameText;

    } else if (data.type == "gameLeft") {
        document.getElementById("main").style.display = "none";
    }
});

function renderGame(data) {
    console.log("Game Joined");
    console.log(data);
    document.getElementById("board").innerHTML = renderBoard(data.board, data.id);
    document.getElementById("main").style.display = "block";
    document.getElementById("spectatorsList").innerHTML = data.spectators.map((spectator) => `${spectator}, `).join("");
    document.getElementById("leave").onclick = () => leaveGame(data.id);
    document.getElementById("sit1").onclick = () => sit(data.id, 1);
    document.getElementById("sit2").onclick = () => sit(data.id, 2);
    document.getElementById("unsit").onclick = () => unsit(data.id);
    document.getElementById("start").onclick = () => start(data.id);
    document.getElementById("pickX").onclick = () => pick(data.id, "x");
    document.getElementById("pickO").onclick = () => pick(data.id, "o");
    data.player1 ??= "Empty";
    data.player2 ??= "Empty";
    document.getElementById("player1Name").innerHTML = data.player1;
    document.getElementById("player2Name").innerHTML = data.player2;
    document.getElementById("status").innerHTML = data.status;
}

function createGame() {
    socket.send(JSON.stringify({ type: "create", data: {
        username: username
    } }));
}

function joinGame(id) {
    socket.send(JSON.stringify({ type: "join", data: {
        id: id,
        username: username
    } }));
}

function renderBoard(board, id) {

    let html = "";
    for (let i = 0; i < 15; i++) {
        html += "<tr>";
        for (let j = 0; j < 15; j++) {
            board ??= {};
            board[i] ??= {};
            board[i][j] ??= "";
            html += `<td onclick=place("${id}",${j},${i})>${board[i][j]}</td>`;
        }
        html += "</tr>";
    }
    //console.log(html);
    return html;
}

function leaveGame(id) {
    console.log("Leave Game" + id);
    socket.send(JSON.stringify({ type: "leave", data: {
        "id": id+"",
        "username": username
    } }));
}

function sit(id, slot) {
    socket.send(JSON.stringify({ type: "sit", data: {
        "id": id+"",
        "slot": slot,
        "username": username
    } }));
}

function unsit(id) {
    socket.send(JSON.stringify({ type: "unsit", data: {
        "id": id+"",
        "username": username
    } }));
}

function start(id) {
    socket.send(JSON.stringify({ type: "start", data: {
        "id": id+"",
        "username": username
    } }));
}

function place(id, y, x) {
    console.log("placing " + x + " " + y);
    socket.send(JSON.stringify({ type: "place", data: {
        "id": id+"",
        "x": x,
        "y": y,
        "username": username
    } }));
}

function pick(id, symbol) {
    console.log("picking " + symbol);
    socket.send(JSON.stringify({ type: "pick", data: {
        "id": id+"",
        "symbol": symbol,
        "username": username
    } }));
}
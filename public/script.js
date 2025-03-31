function handleAction(action) {
    fetch(`/${action}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => {
        const inputArea = document.getElementById('inputArea');
        inputArea.innerHTML = '';
        const dataArea = document.getElementById('dataArea');
        dataArea.innerHTML = '';

        if (action === 'players') {
            inputArea.innerHTML = `
            <form action="/add-player" method="POST">
                <h3>Add/Edit Player</h3>
                <label for="name">Name:</label>
                <input type="text" id="name" name="name" required><br>
                <label for="elo">Elo:</label>
                <input type="number" id="elo" name="elo" value=1000 required><br>
                <input type="submit" value="Submit">
            </form>`;

            let table = '<table class="data-table">';
            table += '<tr><th>Player</th><th>Elo</th><th>Present</th></tr>';

            data.forEach(player => {
                const presentButton = `
                <form action="/toggle-presence" method="POST" style="display: inline;">
                    <input type="hidden" name="name" value="${player.name}">
                    <button type="submit">${player.isPresent ? 'Yes' : 'No'}</button>
                </form>`
                table += `<tr><td>${player.name}</td><td>${Math.round(player.elo)}</td><td>${presentButton}</td></tr>`;
            });
            table += '</table>';
            dataArea.innerHTML = table;
        }
        else if (action === 'games') {
            inputArea.innerHTML = `
            <form action="/add-game" method="POST">
                <h3>Add Game</h3>
                <label for="whitePlayer">White player:</label>
                <select name="whitePlayer" required>
                    ${data["players"].map(player => `<option value="${player.name}">${player.name}</option>`).join('')}
                </select><br>
                <label for="blackPlayer">Black player:</label>
                <select name="blackPlayer" required>
                    ${data["players"].map(player => `<option value="${player.name}">${player.name}</option>`).join('')}
                </select><br>
                <label for="result">Result:</label>
                <select name="result" required>
                    <option value="1">White Win</option>
                    <option value="0">Draw</option>
                    <option value="-1">Black Win</option>
                </select><br><br>
                <input type="submit" value="Submit">
            </form>`;

            let table = '<table class="data-table">';
            table += '<tr><th>ID</th><th>White Player</th><th>Black Player</th><th>Result</th></tr>';
            data["games"].forEach(game => {
                table += `<tr><td>${game.id}</td><td>${game.whitePlayer}</td><td>${game.blackPlayer}</td>
                    <td>${game.result === -1 ? "Black won" : game.result === 1 ? "White won" : "Draw"}</td></tr>`;
            });
            table += '</table>';
            dataArea.innerHTML = table;
        }
        else if (action === 'matchmake') {
            const matches = data["matches"];
            const lastPlayer = data["lastPlayer"];
            const newElo = data["newElo"];
            let matchHtml = '<h2>Matchmaking Results</h2><ul>';

            matches.forEach((match) => {
                matchHtml += `<li>${match.player1.name} (ELO: ${Math.round(match.player1.elo)}) vs ${match.player2.name} (ELO: ${Math.round(match.player2.elo)}) | ${match.player1.name} plays as ${match.color1}, ${match.player2.name} plays as ${match.color2}</li>`;
            });
            if (lastPlayer && newElo) {
                matchHtml += `<li>${lastPlayer.name} (ELO: ${Math.round(lastPlayer.elo)}) has no opponent and wins against a default opponent with ELO 1000. New ELO: ${Math.round(newElo)}</li>`;
            }
            matchHtml += "</ul>";
            dataArea.innerHTML = matchHtml;
        }
    })
    .catch(err => {
        console.error(err);
    });
}

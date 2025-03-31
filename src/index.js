const Logger = require("./Logger");
const { handleErrors } = require("./errorHandler");
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db.sqlite');

function main() {
  handleErrors();
  Logger.StartNewLog();
  Logger.Info("[SETUP] Starting up Chess Game Logger.");

  // Initialize app
  try {
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(express.static('public'));
    app.set('view engine', 'ejs');
    app.set('views', './views');
    Logger.Info("[SETUP] App was initialized.");
  }
  catch (err) {
    return Logger.Error("[ERROR] There was an issue while initializing the app: " + err);
  }

  // Initialize database
  try {
    db.run(`CREATE TABLE IF NOT EXISTS players (
      name TEXT PRIMARY KEY,
      elo INTEGER DEFAULT 1000,
      lastColor TEXT DEFAULT 'none',
      isPresent BOOLEAN DEFAULT 1
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      whitePlayer TEXT,
      blackPlayer TEXT,
      result INTEGER,
      FOREIGN KEY(whitePlayer) REFERENCES players(name),
      FOREIGN KEY(blackPlayer) REFERENCES players(name)
    )`);
    Logger.Info("[SETUP] Database was initialized.");
  }
  catch (err) {
    return Logger.Error("[ERROR] There was an issue while initializing the database: " + err);
  }
}
main();

function calculateExpectedScore(playerRating, opponentRating) {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

function calculateNewElo(playerRating, opponentRating, score) {
  const expectedScore = calculateExpectedScore(playerRating, opponentRating);
  const K_FACTOR = 30;
  return playerRating + K_FACTOR * (score - expectedScore);
}

app.get('/', (req, res) => {
  Logger.Info(`[INFO] Received connection from ${req.ip}`);
  res.render('index',);
  return;
});

app.post('/players', (req, res) => {
  Logger.Info(`[INFO] Received players POST from ${req.ip}`);
  db.all("SELECT * FROM players", [], (err, players) => {
    if (err) throw err;
    res.send(players);
  });
});

app.post('/games', (req, res) => {
  Logger.Info(`[INFO] Received games POST from ${req.ip}`);
  db.all("SELECT * FROM games", [], (err, games) => {
    if (err) throw err;
    db.all("SELECT * FROM players", [], (err, players) => {
      if (err) throw err;
      res.json({ "games": games, "players": players });
    });
  });
});

app.post('/toggle-presence', (req, res) => {
  Logger.Info(`[INFO] Received toggle-presence POST from ${req.ip}`);
  const { name } = req.body;
  db.get("SELECT isPresent FROM players WHERE name = ?", [name], (err, row) => {
    if (err) return console.error(err.message);
    if (row) {
      const newPresence = row.isPresent ? 0 : 1;
      db.run("UPDATE players SET isPresent = ? WHERE name = ?", [newPresence, name], (err) => {
        if (err) return console.error(err.message);
        Logger.Info(`[DB] Player ${name} was set as ${row.isPresent ? "not present" : "present"}`);
        res.redirect('/');
      });
    } else {
      res.redirect('/');
    }
  });
});

app.post('/add-player', (req, res) => {
  Logger.Info(`[INFO] Received add-player POST from ${req.ip}`);
  const { name, elo } = req.body;

  db.run("INSERT OR REPLACE INTO players (name, elo) VALUES (?, ?)", [name, elo], function(err) {
    if (err) return console.error(err.message);
    Logger.Info(`[DB] Player ${name} was added with a Elo rating of ${elo}}`);
    res.redirect('/');
  });
});

app.post('/matchmake', (req, res) => {
  Logger.Info(`[INFO] Received matchmake POST from ${req.ip}`);
  db.all("SELECT * FROM players WHERE isPresent = 1 ORDER BY elo DESC", [], (err, players) => {
    if (err) return console.error(err.message);
    if (players.length < 2) return res.send("<h2>Not enough players for matchmaking.</h2>");

    const matches = [];
    const pairedPlayers = new Set();

    const getColor = (lastColor1, lastColor2) => {
      if (lastColor1 === lastColor2)
        return Math.random() < 0.5 ? { color1: 'white', color2: 'black' } : { color1: 'black', color2: 'white' };
      return lastColor1 === 'white' ? { color1: 'black', color2: 'white' } : { color1: 'white', color2: 'black' };
    };

    const pairPlayers = (index) => {
      if (index >= players.length) {
        let lastPlayer;
        let newElo;

        if (players.length % 2 !== 0 && !pairedPlayers.has(players[players.length - 1].name)) {
          lastPlayer = players[players.length - 1];
          newElo = calculateNewElo(lastPlayer.elo, 1000, 1);
          Logger.Info(`[DB] Player ${lastPlayer.name} had their Elo increased from ${lastPlayer.elo} to ${newElo} for getting a bye.`);
          db.run("UPDATE players SET elo = ? WHERE name = ?", [newElo, lastPlayer.name]);
        }
        return res.json({ "matches": matches, "lastPlayer": lastPlayer, "newElo": newElo });
      }

      const player1 = players[index];
      if (pairedPlayers.has(player1.name)) return pairPlayers(index+1);

      for (let j = index + 1; j < players.length; j++) {
        const player2 = players[j];
        if (pairedPlayers.has(player2.name)) continue;

        db.get("SELECT * FROM games WHERE (whitePlayer = ? AND blackPlayer = ?) OR (whitePlayer = ? AND blackPlayer = ?)",
          [player1.name, player2.name, player2.name, player1.name], (err, row) =>
          {
            if (err) return console.error(err.message);
            if (!row) {
              const { color1, color2 } = getColor(player1.lastColor, player2.lastColor);

              matches.push({ player1, player2, color1, color2 });
              pairedPlayers.add(player1.name);
              pairedPlayers.add(player2.name);

              db.run("UPDATE players SET lastColor = ? WHERE name = ?", [color1, player1.name]);
              db.run("UPDATE players SET lastColor = ? WHERE name = ?", [color2, player2.name]);

              pairPlayers(index+1);
            }
            else
              pairPlayers(index+1);
          }
        );
        return;
      }
      // If no pair found, move to the next player
      pairPlayers(index+1);
    };
    // Start pairing players from the first one
    pairPlayers(0);
  });
});

app.post('/add-game', (req, res) => {
  Logger.Info(`[INFO] Received add-game POST from ${req.ip}`);
  const { whitePlayer, blackPlayer, result } = req.body;

  db.run("INSERT INTO games (whitePlayer, blackPlayer, result) VALUES (?, ?, ?)", [whitePlayer, blackPlayer, result], function(err) {
    if (err) {
      return console.error(err.message);
    }

    db.get("SELECT elo FROM players WHERE name = ?", [whitePlayer], (err, row) => {
      if (err) throw err;
      const whiteElo = row ? row.elo : 1000;
      db.get("SELECT elo FROM players WHERE name = ?", [blackPlayer], (err, row) => {
        if (err) throw err;
        const blackElo = row ? row.elo : 1000;

        let whiteScore = (result == 1) ? 1 : (result == 0 ? 0.5 : 0);
        let blackScore = (result == -1) ? 1 : (result == 0 ? 0.5 : 0);
        
        const newWhiteElo = calculateNewElo(whiteElo, blackElo, whiteScore);
        const newBlackElo = calculateNewElo(blackElo, whiteElo, blackScore);

        db.run("INSERT OR REPLACE INTO players (name, elo) VALUES (?, ?)", [whitePlayer, newWhiteElo]);
        db.run("INSERT OR REPLACE INTO players (name, elo) VALUES (?, ?)", [blackPlayer, newBlackElo]);

        Logger.Info(`[DB] Player ${whitePlayer} had their Elo changed from ${whiteElo} to ${newWhiteElo} after ${(result == 1) ? "winning" : (result == 0 ? "drawing" : "losing")}.`);
        Logger.Info(`[DB] Player ${blackPlayer} had their Elo changed from ${blackElo} to ${newBlackElo} after ${(result == 1) ? "losing" : (result == 0 ? "drawing" : "winning")}.`);

        res.redirect('/');
      });
    });
  });
});

app.listen(3000, () => {
  Logger.Success(`[SETUP] Server started on http://localhost:3000`);
});

// simulation.js (REVISED - AI vs AI Experiment - CORRECTED TABLE OUTPUT)
// Assumes gameLogic.js and aiLogic.js are loaded first.

// Helper function needed for runSingleGameWithLog
function makeRandomMove(board) {
    const validLocations = getValidLocations(board);
    if (validLocations.length === 0) return null;
    return validLocations[Math.floor(Math.random() * validLocations.length)];
}

// Plays one game pitting two AI depths against each other
// Returns winner DEPTH, null for Draw, or 'ERROR'
function runSingleGame_AIvsAI(depth1, depth2, ai1Starts = true) {
    let board = createBoard();
    let winner = null;
    let pieces = {}; // Map depth to piece number
    let depths = {}; // Map piece number to depth
    let currentPlayer;

    // Assign pieces and starting player based on who starts
    if (ai1Starts) {
        pieces[depth1] = PLAYER_PIECE; // AI1 uses Player 1 piece if it starts
        pieces[depth2] = AI_PIECE;     // AI2 uses Player 2 piece
        depths[PLAYER_PIECE] = depth1;
        depths[AI_PIECE]     = depth2;
        currentPlayer = PLAYER_PIECE; // AI1 (as P1) starts
    } else {
        pieces[depth1] = AI_PIECE;     // AI1 uses Player 2 piece
        pieces[depth2] = PLAYER_PIECE; // AI2 uses Player 1 piece if it starts
        depths[AI_PIECE]     = depth1;
        depths[PLAYER_PIECE] = depth2;
        currentPlayer = PLAYER_PIECE; // AI2 (as P1) starts
    }

    let gameOver = false;

    while (!gameOver) {
        let col = null;
        let currentDepth = depths[currentPlayer]; // Get depth for the current piece/player

        col = makeAiMove(board, currentDepth); // Get move from the correct AI depth

        if (col === null || !dropPiece(board, col, currentPlayer)) {
            winner = isBoardFull(board) && !checkWin(board, PLAYER_PIECE) && !checkWin(board, AI_PIECE) ? null : 'ERROR';
            console.error("Simulation Error:", { winner, currentDepth, currentPlayer, col });
            gameOver = true;
            break;
        }

        if (checkWin(board, currentPlayer)) {
            winner = depths[currentPlayer]; // Winner is the DEPTH associated with the winning piece
            gameOver = true;
        } else if (isBoardFull(board)) {
            winner = null; // Draw
            gameOver = true;
        }

        if (!gameOver) {
             currentPlayer = (currentPlayer === PLAYER_PIECE) ? AI_PIECE : PLAYER_PIECE;
        }
    }
    return winner; // Return the DEPTH of the winning AI, or null/ERROR
}


// Runs the simulation suite for different AI vs AI matchups
async function runSimulationSuite_AIvsAI(numGamesPerMatchup = 30, matchups = [[3, 1], [5, 1], [5, 3]]) {
    console.log(`Starting AI vs AI simulation suite: ${numGamesPerMatchup} games per matchup...`);
    const overallResults = {};
    const simulationStartTime = performance.now();

    // --- Use Promise.all for potential parallelization (though JS is single-threaded) ---
    // This structure helps manage async operations if they were present
    await Promise.all(matchups.map(async (matchup) => {
        const depthHigh = Math.max(matchup[0], matchup[1]);
        const depthLow = Math.min(matchup[0], matchup[1]);
        const key = `${depthHigh}v${depthLow}`;

        let highDepthWins = 0;
        let lowDepthWins = 0;
        let draws = 0;
        let errors = 0;

        console.log(`  Running ${key}...`);
        const matchupStartTime = performance.now();

        for (let i = 0; i < numGamesPerMatchup; i++) {
             // Introduce a small delay to prevent freezing the browser UI on long runs
             // await new Promise(resolve => setTimeout(resolve, 0)); // Optional: yield execution briefly

            const highDepthStarts = (i % 2 === 0); // Alternate who starts
            const winnerDepth = runSingleGame_AIvsAI(depthHigh, depthLow, highDepthStarts);

            if (winnerDepth === depthHigh) highDepthWins++;
            else if (winnerDepth === depthLow) lowDepthWins++;
            else if (winnerDepth === null) draws++;
            else errors++;
        }

        const matchupEndTime = performance.now();
        const duration = ((matchupEndTime - matchupStartTime) / 1000).toFixed(2);

        overallResults[key] = {
            numGames: numGamesPerMatchup,
            depthHigh: depthHigh,
            depthLow: depthLow,
            highDepthWins: highDepthWins,
            lowDepthWins: lowDepthWins,
            draws: draws,
            errors: errors,
            highDepthWinRate: ((highDepthWins / numGamesPerMatchup) * 100).toFixed(1),
            lowDepthWinRate: ((lowDepthWins / numGamesPerMatchup) * 100).toFixed(1),
            drawRate: ((draws / numGamesPerMatchup) * 100).toFixed(1),
            duration_sec: duration
        };
         console.log(`    ${key} complete. Duration: ${duration}s`);
    })); // End of Promise.all

     const simulationEndTime = performance.now();
     const totalDuration = ((simulationEndTime - simulationStartTime) / 1000).toFixed(2);

    console.log("Simulation Suite Complete. Total Duration:", totalDuration, "s");
    console.log("Results:", overallResults);

    // --- Generate Clean HTML Table ---
    const resultsDiv = document.getElementById('simulationResults');
    if (resultsDiv) {
        let tableHTML = `<h3>AI vs AI Simulation Results</h3>
            <p>Games per matchup: ${numGamesPerMatchup}, Total Duration: ${totalDuration}s</p>
            <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; margin-top: 10px; text-align: center;">
                <thead>
                    <tr>
                        <th>Matchup</th>
                        <th>Higher Depth Wins %</th>
                        <th>Lower Depth Wins %</th>
                        <th>Draw %</th>
                        <th>Duration (s)</th>
                        <th>Errors</th>
                    </tr>
                </thead>
                <tbody>`;

        // Ensure consistent order of matchups in the table
        const sortedKeys = Object.keys(overallResults).sort((a, b) => {
            const depthA = parseInt(a.split('v')[0]);
            const depthB = parseInt(b.split('v')[0]);
            if (depthA !== depthB) return depthB - depthA; // Higher depth first
            const lowA = parseInt(a.split('v')[1]);
            const lowB = parseInt(b.split('v')[1]);
            return lowB - lowA; // Then higher lower-depth first
        });


        for(const key of sortedKeys) {
            const res = overallResults[key];
            tableHTML += `
                <tr>
                    <td>Depth ${res.depthHigh} vs Depth ${res.depthLow}</td>
                    <td>${res.highDepthWinRate}%</td>
                    <td>${res.lowDepthWinRate}%</td>
                    <td>${res.drawRate}%</td>
                    <td>${res.duration_sec}</td>
                    <td>${res.errors}</td>
                </tr>`;
        }
        tableHTML += `</tbody></table>`;
        resultsDiv.innerHTML = tableHTML; // Replace content with the generated table

    } else {
        console.error("Results display element not found.");
    }

    return overallResults;
}

// How to run from simulation.html console:
// runSimulationSuite_AIvsAI(30) // Runs 30 games for [3v1], [5v1], [5v3]


// --- Single Game Logger ---
// Runs a single game at given depth, logs each move and board state
// FORCES a specific opening move by the 'Random' player (acts as Player 1)
function runSingleGameWithLog(aiDepth = 5, openingCol = 3) { // openingCol is 0-based index
    let board = createBoard();
    let log = [];

    // Ensure opening column is valid before starting
    if (openingCol < 0 || openingCol >= COLS) {
        console.error("Invalid opening column provided for log.");
        return { log: [], winner: 'ERROR' };
    }

    // Force the first move (by convention Player 1 / 'Random' in this log)
    if (!dropPiece(board, openingCol, PLAYER_PIECE)) {
         console.error("Could not place opening piece in log.");
         return { log: [], winner: 'ERROR'}; // Should not happen on empty board
    }
    log.push({moveNum: 1, player: 'Forced P1 Opening', col: openingCol + 1, board: board.map(row => [...row])});

    let currentPlayer = AI_PIECE; // AI always plays second in this logged game
    let moveNum = 2;
    let gameOver = false;
    let winner = null;

    while (!gameOver) {
        let col = null;

        if (currentPlayer === AI_PIECE) {
            col = makeAiMove(board, aiDepth);
        } else {
            // In this logged version, the 'opponent' after the forced open is still random
             col = makeRandomMove(board);
             // If you wanted the *human* to play against AI D5 for the log, you'd need interactivity
        }

        if (col === null || !dropPiece(board, col, currentPlayer)) {
            winner = isBoardFull(board) && !checkWin(board, PLAYER_PIECE) && !checkWin(board, AI_PIECE) ? null : 'ERROR';
            gameOver = true;
            break;
        }

        log.push({moveNum, player: currentPlayer === AI_PIECE ? `AI (D${aiDepth})` : 'Random', col: col + 1, board: board.map(row => [...row])});

        if (checkWin(board, currentPlayer)) {
            winner = currentPlayer;
            gameOver = true;
        } else if (isBoardFull(board)) {
            winner = null; // Draw
            gameOver = true;
        }

        if (!gameOver) {
            currentPlayer = (currentPlayer === PLAYER_PIECE) ? AI_PIECE : PLAYER_PIECE;
            moveNum++;
        }
    }

    // --- Print log to console ---
    console.log(`--- Single Game Log (AI Depth ${aiDepth} vs Random, P1 Forced Open Col ${openingCol + 1}) ---`);
    log.forEach(entry => {
        console.log(`
Move ${entry.moveNum}: ${entry.player} in column ${entry.col}`);
        entry.board.forEach(row => {
            console.log("  " + row.map(cell => cell === EMPTY ? '.' : (cell === PLAYER_PIECE ? 'X' : 'O')).join(' '));
        });
    });

    let resultMsg = "Result: ";
    if (winner === AI_PIECE) resultMsg += `AI (D${aiDepth}) wins`;
    else if (winner === PLAYER_PIECE) resultMsg += 'Random wins';
    else if (winner === null) resultMsg += 'Draw';
    else resultMsg += 'Error';
    console.log("" + resultMsg);
    // --- End Print log ---

    return {log, winner};
}

// How to run from console on simulation.html: runSingleGameWithLog(5, 3)

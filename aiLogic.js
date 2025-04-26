// Depends on gameLogic.js being loaded first

// --- AI Logic Functions ---

// Helper function to evaluate a window of 4 cells
function evaluateWindow(window, piece) {
    let score = 0;
    const oppPiece = piece === PLAYER_PIECE ? AI_PIECE : PLAYER_PIECE;

    const pieceCount = window.filter(p => p === piece).length;
    const emptyCount = window.filter(p => p === EMPTY).length;
    const oppCount = window.filter(p => p === oppPiece).length;

    // Rationale: Maximizing score for AI's piece (piece)
    // See Report Section 3.2 (Heuristic Design) for detailed justification of scores.
    if (pieceCount === 4) {
        score += 1000; // Prioritize winning move (highest score)
    } else if (pieceCount === 3 && emptyCount === 1) {
        score += 10; // Strong potential win (3 in a row with space)
    } else if (pieceCount === 2 && emptyCount === 2) {
        score += 3;  // Minor advantage (2 in a row with 2 spaces)
    }

    // Rationale: Penalizing opponent's potential wins heavily
    // See Report Section 3.2 (Heuristic Design) for detailed justification of scores.
    if (oppCount === 3 && emptyCount === 1) {
        score -= 80; // Blocking opponent's win is crucial (high negative score)
    } else if (oppCount === 2 && emptyCount === 2) {
        score -= 5; // Minor block (opponent has 2 in a row with 2 spaces)
    }

    return score;
}

// Heuristic function to score the overall board for the AI
function scorePosition(board, piece) {
    let score = 0;

    // Center column preference
    // Rationale: Controlling the center column statistically increases winning chances
    // as it participates in more potential lines. See Report Section 3.2.
    const centerArray = board.map(row => row[Math.floor(COLS / 2)]);
    const centerCount = centerArray.filter(p => p === piece).length;
    score += centerCount * 3; // Small bonus for center control

    // Score Horizontal
    // Rationale: Evaluate all horizontal 4-cell windows using evaluateWindow.
    // See Report Section 3.2.
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            const window = [board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]];
            score += evaluateWindow(window, piece);
        }
    }

    // Score Vertical
    // Rationale: Evaluate all vertical 4-cell windows using evaluateWindow.
    // See Report Section 3.2.
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS - 3; r++) {
            const window = [board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]];
            score += evaluateWindow(window, piece);
        }
    }

    // Score positive sloped diagonal
    // Rationale: Evaluate all positive diagonal 4-cell windows using evaluateWindow.
    // See Report Section 3.2.
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            const window = [board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]];
            score += evaluateWindow(window, piece);
        }
    }

    // Score negative sloped diagonal
    // Rationale: Evaluate all negative diagonal 4-cell windows using evaluateWindow.
    // See Report Section 3.2.
    for (let r = 3; r < ROWS; r++) { // Start check from row 3
        for (let c = 0; c < COLS - 3; c++) {
             const window = [board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]];
             score += evaluateWindow(window, piece);
        }
    }

    return score;
}

// Function to check if a node is terminal (game over)
function isTerminalNode(board) {
    return checkWin(board, PLAYER_PIECE) || checkWin(board, AI_PIECE) || isBoardFull(board);
}


// Minimax with Alpha-Beta Pruning
// Rationale: Implements the Minimax algorithm to explore the game tree, optimized
// with Alpha-Beta pruning to reduce the search space. See Report Section 3.1 (Algorithm Choice).
function minimax(board, depth, alpha, beta, maximizingPlayer) {
    const validLocations = getValidLocations(board);
    const isTerminal = isTerminalNode(board);

    if (depth === 0 || isTerminal) {
        if (isTerminal) {
            // Rationale: Terminal state evaluation. Winning is highly positive, losing highly negative.
            // Depth is added/subtracted to incentivize faster wins / slower losses.
            // See Report Section 3.1.
            if (checkWin(board, AI_PIECE)) {return [null, 1000000 + depth];} // Win faster is better
            if (checkWin(board, PLAYER_PIECE)) {return [null, -1000000 - depth];} // Lose slower is better
            return [null, 0]; // Draw
        } else { // Depth is zero, use heuristic
            // Rationale: Reached search depth limit, use heuristic evaluation.
            // See Report Section 3.2.
            return [null, scorePosition(board, AI_PIECE)];
        }
    }

    let bestCol = validLocations.length > 0 ? validLocations[Math.floor(Math.random() * validLocations.length)] : null; // Start with random valid move

    if (maximizingPlayer) { // AI's turn (Maximize score)
        let value = -Infinity;
        for (const col of validLocations) {
            let boardCopy = board.map(row => [...row]);
            if (dropPiece(boardCopy, col, AI_PIECE)) { // Ensure dropPiece succeeded
                const newScore = minimax(boardCopy, depth - 1, alpha, beta, false)[1];
                if (newScore > value) {
                    value = newScore;
                    bestCol = col;
                }
                alpha = Math.max(alpha, value);
                if (alpha >= beta) {
                    // Rationale: Alpha-Beta Pruning (Beta cut-off). If the maximizer finds a move
                    // that guarantees a score >= beta, the minimizer (opponent) would have already
                    // avoided this path earlier. Stop exploring this branch. See Report Section 3.1.
                    break;
                }
            }
        }
        return [bestCol, value];
    } else { // Player's turn (Minimize score from AI perspective)
        let value = Infinity;
        for (const col of validLocations) {
             let boardCopy = board.map(row => [...row]);
             if (dropPiece(boardCopy, col, PLAYER_PIECE)) { // Ensure dropPiece succeeded
                const newScore = minimax(boardCopy, depth - 1, alpha, beta, true)[1];
                 if (newScore < value) {
                    value = newScore;
                    bestCol = col; // Track column for consistency, though minimizer doesn't 'choose' it
                }
                beta = Math.min(beta, value);
                if (alpha >= beta) {
                    // Rationale: Alpha-Beta Pruning (Alpha cut-off). If the minimizer finds a move
                    // that guarantees a score <= alpha, the maximizer (AI) would have already
                    // chosen a better path earlier. Stop exploring this branch. See Report Section 3.1.
                    break;
                }
            }
        }
        return [bestCol, value]; // Return column chosen during simulation and the resulting value
    }
}

// Function called when it's AI's turn
function makeAiMove(board, depth = 5) { // Accept depth parameter, default to 5
    // Rationale: Set search depth for Minimax. Higher depth = stronger AI but slower computation.
    // Depth 5 is a reasonable balance. See Report Section 4.1 (Performance Analysis).
    const result = minimax(board, depth, -Infinity, Infinity, true);
    console.log(`Minimax AI (depth ${depth}) recommending column: ${result[0]}, score: ${result[1]}`);
    // Fallback if minimax returns null (should only happen if no valid moves)
    if (result[0] === null) {
        const validMoves = getValidLocations(board);
        return validMoves.length > 0 ? validMoves[0] : null;
    }
    return result[0];
}
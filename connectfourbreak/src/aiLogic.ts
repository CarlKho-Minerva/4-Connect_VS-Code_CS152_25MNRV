
// src/aiLogic.ts
import {
    Board, EMPTY, PLAYER_PIECE, AI_PIECE, ROWS, COLS,
    dropPiece, getValidLocations, checkWin, isBoardFull
} from './gameLogic';

// --- AI Logic Functions ---

// Helper function to evaluate a window of 4 cells
function evaluateWindow(window: number[], piece: number): number {
    let score = 0;
    const oppPiece = piece === PLAYER_PIECE ? AI_PIECE : PLAYER_PIECE;

    const pieceCount = window.filter(p => p === piece).length;
    const emptyCount = window.filter(p => p === EMPTY).length;
    const oppCount = window.filter(p => p === oppPiece).length;

    if (pieceCount === 4) {
        score += 1000; // Prioritize winning move
    } else if (pieceCount === 3 && emptyCount === 1) {
        score += 10; // Strong potential win
    } else if (pieceCount === 2 && emptyCount === 2) {
        score += 3;  // Minor advantage
    }

    // Penalize opponent's potential wins heavily
    if (oppCount === 3 && emptyCount === 1) {
        score -= 80; // Blocking opponent's win is crucial
    } else if (oppCount === 2 && emptyCount === 2) {
        score -= 5; // Minor block
    }

    return score;
}

// Heuristic function to score the overall board for the AI
function scorePosition(board: Board, piece: number): number {
    let score = 0;

    // Center column preference
    const centerArray = board.map(row => row[Math.floor(COLS / 2)]);
    const centerCount = centerArray.filter(p => p === piece).length;
    score += centerCount * 3; // Small bonus for center control

    // Score Horizontal
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            const window = [board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]];
            score += evaluateWindow(window, piece);
        }
    }

    // Score Vertical
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS - 3; r++) {
            const window = [board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]];
            score += evaluateWindow(window, piece);
        }
    }

    // Score positive sloped diagonal
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            const window = [board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]];
            score += evaluateWindow(window, piece);
        }
    }

    // Score negative sloped diagonal
    for (let r = 3; r < ROWS; r++) { // Start check from row 3
        for (let c = 0; c < COLS - 3; c++) {
             const window = [board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]];
             score += evaluateWindow(window, piece);
        }
    }

    return score;
}

// Function to check if a node is terminal (game over)
function isTerminalNode(board: Board): boolean {
    return checkWin(board, PLAYER_PIECE) || checkWin(board, AI_PIECE) || isBoardFull(board);
}


// Minimax with Alpha-Beta Pruning
function minimax(board: Board, depth: number, alpha: number, beta: number, maximizingPlayer: boolean): [number | null, number] {
    const validLocations = getValidLocations(board);
    const isTerminal = isTerminalNode(board);

    if (depth === 0 || isTerminal) {
        if (isTerminal) {
            if (checkWin(board, AI_PIECE)) {return [null, 1000000 + depth];} // Win faster is better
            if (checkWin(board, PLAYER_PIECE)) {return [null, -1000000 - depth];} // Lose slower is better
            return [null, 0]; // Draw
        } else { // Depth is zero, use heuristic
            return [null, scorePosition(board, AI_PIECE)];
        }
    }

    let bestCol: number | null = validLocations.length > 0 ? validLocations[Math.floor(Math.random() * validLocations.length)] : null; // Start with random valid move

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
                    break; // Beta cut-off
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
                    break; // Alpha cut-off
                }
            }
        }
        return [bestCol, value]; // Return column chosen during simulation and the resulting value
    }
}

// Function called when it's AI's turn
export function makeAiMove(board: Board): number | null {
    const depth = 5; // Adjust depth for difficulty/performance (e.g., 4-6)
    const result = minimax(board, depth, -Infinity, Infinity, true);
    console.log(`Minimax AI (depth ${depth}) recommending column: ${result[0]}, score: ${result[1]}`);
    // Fallback if minimax returns null (should only happen if no valid moves)
    if (result[0] === null) {
        const validMoves = getValidLocations(board);
        return validMoves.length > 0 ? validMoves[0] : null;
    }
    return result[0];
}

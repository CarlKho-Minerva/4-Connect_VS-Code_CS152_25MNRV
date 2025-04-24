
// src/gameLogic.ts

// --- Game Logic Constants and Types ---
export const ROWS = 6;
export const COLS = 7;
export const EMPTY = 0;
export const PLAYER_PIECE = 1;
export const AI_PIECE = 2;

export type Board = number[][];

// --- Game Logic Functions ---

export function createBoard(): Board {
    return Array(ROWS).fill(0).map(() => Array(COLS).fill(EMPTY));
}

export function dropPiece(board: Board, col: number, piece: number): boolean {
    if (col < 0 || col >= COLS || board[0][col] !== EMPTY) {
        return false; // Invalid column or column full
    }
    for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r][col] === EMPTY) {
            board[r][col] = piece;
            return true; // Piece dropped successfully
        }
    }
    return false; // Should not happen if initial check passed
}

export function getValidLocations(board: Board): number[] {
    let validLocations: number[] = [];
    for (let c = 0; c < COLS; c++) {
        if (board[0][c] === EMPTY) {
            validLocations.push(c);
        }
    }
    return validLocations;
}

export function checkWin(board: Board, piece: number): boolean {
    // Check horizontal
    for (let c = 0; c < COLS - 3; c++) {
        for (let r = 0; r < ROWS; r++) {
            if (board[r][c] === piece && board[r][c+1] === piece && board[r][c+2] === piece && board[r][c+3] === piece) {
                return true;
            }
        }
    }
    // Check vertical
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS - 3; r++) {
            if (board[r][c] === piece && board[r+1][c] === piece && board[r+2][c] === piece && board[r+3][c] === piece) {
                return true;
            }
        }
    }
    // Check positive diagonal
    for (let c = 0; c < COLS - 3; c++) {
        for (let r = 0; r < ROWS - 3; r++) {
            if (board[r][c] === piece && board[r+1][c+1] === piece && board[r+2][c+2] === piece && board[r+3][c+3] === piece) {
                return true;
            }
        }
    }
    // Check negative diagonal
    for (let c = 0; c < COLS - 3; c++) {
        for (let r = 3; r < ROWS; r++) {
            if (board[r][c] === piece && board[r-1][c+1] === piece && board[r-2][c+2] === piece && board[r-3][c+3] === piece) {
                return true;
            }
        }
    }
    return false;
}

export function isBoardFull(board: Board): boolean {
    return getValidLocations(board).length === 0;
}

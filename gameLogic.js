// --- Game Logic Constants and Types ---
const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const PLAYER_PIECE = 1;
const AI_PIECE = 2;

// --- Game Logic Functions ---

function createBoard() {
    return Array(ROWS).fill(0).map(() => Array(COLS).fill(EMPTY));
}

function dropPiece(board, col, piece) {
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

function getValidLocations(board) {
    let validLocations = [];
    for (let c = 0; c < COLS; c++) {
        if (board[0][c] === EMPTY) {
            validLocations.push(c);
        }
    }
    return validLocations;
}

function checkWin(board, piece) {
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

function isBoardFull(board) {
    return getValidLocations(board).length === 0;
}
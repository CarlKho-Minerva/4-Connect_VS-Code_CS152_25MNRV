import * as vscode from 'vscode';
import * as path from 'path'; // Import the path module

// --- Game Logic Constants and Types ---
const ROWS = 6;
const COLS = 7;
const EMPTY = 0;
const PLAYER_PIECE = 1;
const AI_PIECE = 2;

type Board = number[][];

// Keep track of the panel so we only have one instance
let gamePanel: vscode.WebviewPanel | undefined = undefined;

// --- Game State ---
let currentBoard: Board = createBoard();
let currentPlayer = PLAYER_PIECE; // Player starts
let gameOver = false;


export function activate(context: vscode.ExtensionContext) {

    console.log('Congratulations, your extension "ConnectFourBreak" is now active!');

    let startGameCommand = vscode.commands.registerCommand('connectfour.startGame', () => {
        const columnToShow = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (gamePanel) {
            gamePanel.reveal(columnToShow);
             // Reset game state if revealing an existing panel for a fresh start
            currentBoard = createBoard();
            currentPlayer = PLAYER_PIECE;
            gameOver = false;
            gamePanel.webview.postMessage({ command: 'updateBoard', board: currentBoard, status: 'Your turn (Player 1 - X)' });
            return;
        }

        // Otherwise, create a new panel.
        gamePanel = vscode.window.createWebviewPanel(
            'connectFourGame', // Identifies the type of the webview. Used internally
            'Connect Four Break', // Title of the panel displayed to the user
            vscode.ViewColumn.Beside, // Show it beside the current editor
            {
                // Enable javascript in the webview
                enableScripts: true,
                // Retain context even when hidden
                retainContextWhenHidden: true, // Keep game state when panel is not visible
                // Restrict the webview to only loading content from our extension's `media` directory.
                // localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')] // Good practice, but we'll add media later
            }
        );

        // Set the webview's initial HTML content
        gamePanel.webview.html = getWebviewContent(context, gamePanel.webview);

        // Reset panel tracking and game state when it's closed
        gamePanel.onDidDispose(
            () => {
                gamePanel = undefined;
                // Reset game state variables if needed when panel is closed
                currentBoard = createBoard();
                currentPlayer = PLAYER_PIECE;
                gameOver = false;
            },
            null,
            context.subscriptions
        );

         // Handle messages from the webview
         gamePanel.webview.onDidReceiveMessage(
            message => {
                if (gameOver && message.command !== 'getInitialBoard') return; // Ignore moves if game is over, unless it's a reset request

                switch (message.command) {
                    case 'getInitialBoard':
                        currentBoard = createBoard(); // Reset board
                        currentPlayer = PLAYER_PIECE;
                        gameOver = false;
                        gamePanel?.webview.postMessage({ command: 'updateBoard', board: currentBoard, status: 'Your turn (Player 1 - X)' });
                        break;

                    case 'playerMove':
                        if (currentPlayer === PLAYER_PIECE) {
                            console.log('Player wants to move to column:', message.column);
                            if (dropPiece(currentBoard, message.column, PLAYER_PIECE)) {
                                if (checkWin(currentBoard, PLAYER_PIECE)) {
                                    console.log("PLAYER WINS");
                                    gameOver = true;
                                    gamePanel?.webview.postMessage({ command: 'gameOver', board: currentBoard, status: 'You Win!' });
                                    return;
                                }
                                if (isBoardFull(currentBoard)) {
                                    console.log("DRAW");
                                    gameOver = true;
                                    gamePanel?.webview.postMessage({ command: 'gameOver', board: currentBoard, status: 'Draw!' });
                                    return;
                                }

                                // Switch to AI's turn
                                currentPlayer = AI_PIECE;
                                gamePanel?.webview.postMessage({ command: 'updateBoard', board: currentBoard, status: "AI's turn (thinking...)" });

                                // --- Call AI function here ---
                                 // Simulate AI thinking delay then make move
                                setTimeout(() => {
                                    if (gameOver) return; // Check again in case player closed panel during timeout
                                    console.log("AI Thinking...");
                                    const aiCol = makeAiMove(currentBoard); // Implement this in Phase 5

                                    if (aiCol !== null && dropPiece(currentBoard, aiCol, AI_PIECE)) {
                                        if (checkWin(currentBoard, AI_PIECE)) {
                                            console.log("AI WINS");
                                            gameOver = true;
                                            gamePanel?.webview.postMessage({ command: 'gameOver', board: currentBoard, status: 'AI Wins!' });
                                            return;
                                        }
                                         if (isBoardFull(currentBoard)) {
                                            console.log("DRAW");
                                            gameOver = true;
                                            gamePanel?.webview.postMessage({ command: 'gameOver', board: currentBoard, status: 'Draw!' });
                                            return;
                                        }
                                        // Switch back to Player's turn
                                        currentPlayer = PLAYER_PIECE;
                                        gamePanel?.webview.postMessage({ command: 'updateBoard', board: currentBoard, status: 'Your turn (Player 1 - X)' });

                                    } else {
                                         console.error("AI failed to make a valid move or returned null. AI recommended col:", aiCol);
                                          // Handle error - switch back to player
                                         currentPlayer = PLAYER_PIECE;
                                         gamePanel?.webview.postMessage({ command: 'updateBoard', board: currentBoard, status: 'AI error! Your turn.' });
                                    }
                                }, 500); // 500ms delay for realism

                            } else {
                                // Invalid move
                                console.log("Invalid player move attempted.");
                                 gamePanel?.webview.postMessage({ command: 'updateBoard', board: currentBoard, status: 'Invalid move! Column might be full. Your turn.' });
                            }
                        }
                        return;
                }
            },
            undefined,
            context.subscriptions
          );

        // Send initial state when panel is first created (or revealed and reset)
        gamePanel?.webview.postMessage({ command: 'updateBoard', board: currentBoard, status: 'Your turn (Player 1 - X)' });

    });

    context.subscriptions.push(startGameCommand);
}

// --- Game Logic Functions ---

function createBoard(): Board {
    return Array(ROWS).fill(0).map(() => Array(COLS).fill(EMPTY));
}

function dropPiece(board: Board, col: number, piece: number): boolean {
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

function getValidLocations(board: Board): number[] {
    let validLocations: number[] = [];
    for (let c = 0; c < COLS; c++) {
        if (board[0][c] === EMPTY) {
            validLocations.push(c);
        }
    }
    return validLocations;
}

function checkWin(board: Board, piece: number): boolean {
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

function isBoardFull(board: Board): boolean {
    return getValidLocations(board).length === 0;
}

// --- AI Logic Functions (Phase 5) ---

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
            if (checkWin(board, AI_PIECE)) return [null, 1000000 + depth]; // Win faster is better
            if (checkWin(board, PLAYER_PIECE)) return [null, -1000000 - depth]; // Lose slower is better
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
function makeAiMove(board: Board): number | null {
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


// Function to generate the HTML for the Webview
function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview): string {
    // For now, using the same placeholder HTML from the prompt.
    // Ideally, load HTML from a separate file later.
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <!-- CSP Source Policy -->
        <!-- <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-YOUR_NONCE_HERE' ${webview.cspSource};"> -->
        <title>Connect Four</title>
        <style>
            /* Basic styling for ASCII display */
            body {
                font-family: monospace;
                white-space: pre;
                line-height: 1.2; /* Slightly more spacing */
                padding: 15px;
                background-color: var(--vscode-editor-background); /* Use VS Code theme background */
                color: var(--vscode-editor-foreground); /* Use VS Code theme foreground */
            }
            h1 {
                 text-align: center;
                 color: var(--vscode-textLink-foreground); /* Use link color for title */
            }
            .board {
                margin: 15px auto; /* Center board */
                display: inline-block; /* Fit content */
                border: 1px solid var(--vscode-editorWidget-border); /* Add border */
                padding: 5px;
                background-color: var(--vscode-input-background); /* Slightly different background */
            }
            .row {
                 display: block; /* Ensure rows are block elements */
                 height: 1.2em; /* Consistent row height */
            }
            .cell-empty, .cell-player1, .cell-player2 {
                display: inline-block;
                width: 1.5em; /* Ensure cells align */
                text-align: center;
                font-size: 1.1em;
            }
            .cell-empty { color: var(--vscode-editorHint-foreground); } /* Use hint color for empty */
            .cell-player1 { color: var(--vscode-errorForeground); font-weight: bold; } /* Use error color for player 1 */
            .cell-player2 { color: var(--vscode-debugIcon-startForeground); font-weight: bold; } /* Use debug/warning color for player 2 */

            .input-area {
                text-align: center;
                margin-top: 10px;
            }
            .input-area button {
                font-family: var(--vscode-font-family); /* Use VS Code font */
                font-size: 1em;
                margin: 0 3px;
                cursor: pointer;
                padding: 5px 10px;
                min-width: 2em; /* Ensure buttons have minimum width */
                border: 1px solid var(--vscode-button-border);
                background-color: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
            }
             .input-area button:hover:not(:disabled) {
                 background-color: var(--vscode-button-hoverBackground);
             }
             .input-area button:disabled {
                 cursor: not-allowed;
                 opacity: 0.6;
             }
            #status {
                margin-top: 15px;
                font-weight: bold;
                text-align: center;
                font-size: 1.1em;
                min-height: 1.5em; /* Prevent layout shift */
            }
        </style>
    </head>
    <body>
        <h1>Connect Four Break!</h1>
        <div class="board" id="board">
            <!-- ASCII Board will be rendered here by JavaScript -->
            Loading board...
        </div>
        <div class="input-area" id="input-area">
            <!-- Column buttons will be added here by JavaScript -->
        </div>
        <div id="status">Your turn (Player 1 - X)</div>

        <script>
            // --- Webview JavaScript ---
            (function() { // Wrap in IIFE to avoid polluting global scope
                const vscode = acquireVsCodeApi();

                let currentBoardState = []; // Store the board state received from extension
                const rows = 6; // Should match extension constants
                const cols = 7; // Should match extension constants

                const boardDiv = document.getElementById('board');
                const inputDiv = document.getElementById('input-area');
                const statusDiv = document.getElementById('status');

                // Function to render the board
                function renderBoard(board) {
                    currentBoardState = board; // Update local state
                    boardDiv.innerHTML = ''; // Clear previous board

                    for (let r = 0; r < rows; r++) {
                        const rowDiv = document.createElement('div');
                        rowDiv.className = 'row';
                        for (let c = 0; c < cols; c++) {
                            const piece = board[r][c];
                            const cellSpan = document.createElement('span');
                            let cellClass = 'cell-empty';
                            let cellChar = '·'; // Use dot for empty
                            if (piece === 1) { // Player 1
                                cellClass = 'cell-player1';
                                cellChar = 'X';
                            } else if (piece === 2) { // Player 2 (AI)
                                cellClass = 'cell-player2';
                                cellChar = 'O';
                            }
                            cellSpan.className = cellClass;
                            cellSpan.textContent = cellChar;
                            rowDiv.appendChild(cellSpan);
                        }
                        boardDiv.appendChild(rowDiv);
                    }
                    renderInputControls(board); // Update buttons based on new board state
                }

                // Function to render input buttons
                 function renderInputControls(board) {
                    inputDiv.innerHTML = 'Drop in column: '; // Reset input area
                    for (let c = 0; c < cols; c++) {
                        const button = document.createElement('button');
                        button.innerText = (c + 1).toString();
                        // Disable button if column is full (check top row: board[0][c])
                        button.disabled = board[0][c] !== 0;
                        button.onclick = () => handlePlayerMove(c);
                        inputDiv.appendChild(button);
                    }
                }

                // Function to handle player clicking a column button
                function handlePlayerMove(column) {
                    console.log('Webview: Player clicked column:', column);
                    // Send the move back to the extension
                    vscode.postMessage({
                        command: 'playerMove',
                        column: column
                    });
                    disableInput(); // Disable buttons immediately after move
                    updateStatus("Thinking..."); // Give immediate feedback
                }

                // Function to update status message
                function updateStatus(message) {
                     statusDiv.innerText = message;
                }

                 // Function to disable all input buttons
                 function disableInput() {
                    const buttons = inputDiv.querySelectorAll('button');
                    buttons.forEach(button => button.disabled = true);
                 }

                 // Function to enable input buttons based on board state
                 function enableInput(board) {
                     const buttons = inputDiv.querySelectorAll('button');
                     buttons.forEach((button, index) => {
                        // Enable only if the corresponding column isn't full
                        button.disabled = board[0][index] !== 0;
                     });
                 }

                // Listen for messages from the extension host
                window.addEventListener('message', event => {
                    const message = event.data; // The JSON data sent from the extension
                    console.log("Webview received message:", message);

                    switch (message.command) {
                        case 'updateBoard':
                            renderBoard(message.board);
                            enableInput(message.board); // Re-enable input based on new board
                            updateStatus(message.status || 'Your turn'); // Update status
                            break;
                        case 'gameOver':
                             renderBoard(message.board); // Show final board
                             updateStatus(message.status); // Show win/loss/draw message
                             disableInput(); // Game over, disable all input
                             break;
                        // Add other message handlers if needed
                    }
                });

                // Request initial board state when webview loads/reloads
                 window.addEventListener('load', () => {
                    console.log("Webview loaded, requesting initial board.");
                    vscode.postMessage({ command: 'getInitialBoard' });
                 });

                 // Save state before unload (optional, VS Code handles retainContextWhenHidden)
                 /*
                 window.addEventListener('beforeunload', () => {
                     vscode.setState({ board: currentBoardState }); // Example of saving state
                 });
                 */

            }()); // End IIFE
        </script>
    </body>
    </html>`;
}


// This function is called when your extension is deactivated
export function deactivate() {}
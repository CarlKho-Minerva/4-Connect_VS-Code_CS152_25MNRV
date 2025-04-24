
// src/webviewContent.ts
import * as vscode from 'vscode';

// Function to generate the HTML for the Webview
export function getWebviewContent(context: vscode.ExtensionContext, webview: vscode.Webview): string {
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

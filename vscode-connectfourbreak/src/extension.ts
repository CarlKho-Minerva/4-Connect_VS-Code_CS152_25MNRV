import * as vscode from 'vscode';
import * as path from 'path'; // Import the path module
import * as gameLogic from './gameLogic'; // Import game logic
import * as aiLogic from './aiLogic'; // Import AI logic
import { getWebviewContent } from './webviewContent'; // Import webview content generator

// Keep track of the panel so we only have one instance
let gamePanel: vscode.WebviewPanel | undefined = undefined;

// --- Game State (Managed by the extension) ---
let currentBoard: gameLogic.Board = gameLogic.createBoard();
let currentPlayer = gameLogic.PLAYER_PIECE; // Player starts
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
            currentBoard = gameLogic.createBoard();
            currentPlayer = gameLogic.PLAYER_PIECE;
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

        // Set the webview's initial HTML content using the imported function
        gamePanel.webview.html = getWebviewContent(context, gamePanel.webview);

        // Reset panel tracking and game state when it's closed
        gamePanel.onDidDispose(
            () => {
                gamePanel = undefined;
                // Reset game state variables if needed when panel is closed
                currentBoard = gameLogic.createBoard();
                currentPlayer = gameLogic.PLAYER_PIECE;
                gameOver = false;
            },
            null,
            context.subscriptions
        );

         // Handle messages from the webview
         gamePanel.webview.onDidReceiveMessage(
            message => {
                if (gameOver && message.command !== 'getInitialBoard') {return;} // Ignore moves if game is over, unless it's a reset request

                switch (message.command) {
                    case 'getInitialBoard':
                        currentBoard = gameLogic.createBoard(); // Reset board using imported function
                        currentPlayer = gameLogic.PLAYER_PIECE;
                        gameOver = false;
                        gamePanel?.webview.postMessage({ command: 'updateBoard', board: currentBoard, status: 'Your turn (Player 1 - X)' });
                        break;

                    case 'playerMove':
                        if (currentPlayer === gameLogic.PLAYER_PIECE) {
                            console.log('Player wants to move to column:', message.column);
                            // Use imported game logic functions
                            if (gameLogic.dropPiece(currentBoard, message.column, gameLogic.PLAYER_PIECE)) {
                                if (gameLogic.checkWin(currentBoard, gameLogic.PLAYER_PIECE)) {
                                    console.log("PLAYER WINS");
                                    gameOver = true;
                                    gamePanel?.webview.postMessage({ command: 'gameOver', board: currentBoard, status: 'You Win!' });
                                    return;
                                }
                                if (gameLogic.isBoardFull(currentBoard)) {
                                    console.log("DRAW");
                                    gameOver = true;
                                    gamePanel?.webview.postMessage({ command: 'gameOver', board: currentBoard, status: 'Draw!' });
                                    return;
                                }

                                // Switch to AI's turn
                                currentPlayer = gameLogic.AI_PIECE;
                                gamePanel?.webview.postMessage({ command: 'updateBoard', board: currentBoard, status: "AI's turn (thinking...)" });

                                // --- Call AI function here ---
                                 // Simulate AI thinking delay then make move
                                setTimeout(() => {
                                    if (gameOver) {return;} // Check again in case player closed panel during timeout
                                    console.log("AI Thinking...");
                                    // Use imported AI logic function
                                    const aiCol = aiLogic.makeAiMove(currentBoard);

                                    if (aiCol !== null && gameLogic.dropPiece(currentBoard, aiCol, gameLogic.AI_PIECE)) {
                                        if (gameLogic.checkWin(currentBoard, gameLogic.AI_PIECE)) {
                                            console.log("AI WINS");
                                            gameOver = true;
                                            gamePanel?.webview.postMessage({ command: 'gameOver', board: currentBoard, status: 'AI Wins!' });
                                            return;
                                        }
                                         if (gameLogic.isBoardFull(currentBoard)) {
                                            console.log("DRAW");
                                            gameOver = true;
                                            gamePanel?.webview.postMessage({ command: 'gameOver', board: currentBoard, status: 'Draw!' });
                                            return;
                                        }
                                        // Switch back to Player's turn
                                        currentPlayer = gameLogic.PLAYER_PIECE;
                                        gamePanel?.webview.postMessage({ command: 'updateBoard', board: currentBoard, status: 'Your turn (Player 1 - X)' });

                                    } else {
                                         console.error("AI failed to make a valid move or returned null. AI recommended col:", aiCol);
                                          // Handle error - switch back to player
                                         currentPlayer = gameLogic.PLAYER_PIECE;
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

    context.subscriptions.push(startGameCommand); // Add the command to subscriptions

    // Register the Sidebar Provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ConnectFourSidebarProvider.viewType,
            new ConnectFourSidebarProvider(context)
        )
    );
}

// --- Sidebar Provider ---
// Note: This provider duplicates some game logic handling from the main panel.
// For a more robust solution, consider centralizing game state management further.
class ConnectFourSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'connectfourbreakView'; // Ensure this matches package.json
    private _view?: vscode.WebviewView;
    private _context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this._context = context;
    }

    resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            // localResourceRoots: [vscode.Uri.joinPath(this._context.extensionUri, 'media')]
        };
        // Use the imported function to get HTML
        webviewView.webview.html = getWebviewContent(this._context, webviewView.webview);

        // Handle messages from the webview (reuse logic from panel, using imported functions)
        webviewView.webview.onDidReceiveMessage(message => {
            // Use global game state variables (currentBoard, currentPlayer, gameOver)
            if (gameOver && message.command !== 'getInitialBoard') {return;}
            switch (message.command) {
                case 'getInitialBoard':
                    currentBoard = gameLogic.createBoard();
                    currentPlayer = gameLogic.PLAYER_PIECE;
                    gameOver = false;
                    webviewView.webview.postMessage({ command: 'updateBoard', board: currentBoard, status: 'Your turn (Player 1 - X)' });
                    break;
                case 'playerMove':
                    if (currentPlayer === gameLogic.PLAYER_PIECE) {
                        if (gameLogic.dropPiece(currentBoard, message.column, gameLogic.PLAYER_PIECE)) {
                            if (gameLogic.checkWin(currentBoard, gameLogic.PLAYER_PIECE)) {
                                gameOver = true;
                                webviewView.webview.postMessage({ command: 'gameOver', board: currentBoard, status: 'You Win!' });
                                return;
                            }
                            if (gameLogic.isBoardFull(currentBoard)) {
                                gameOver = true;
                                webviewView.webview.postMessage({ command: 'gameOver', board: currentBoard, status: 'Draw!' });
                                return;
                            }
                            currentPlayer = gameLogic.AI_PIECE;
                            webviewView.webview.postMessage({ command: 'updateBoard', board: currentBoard, status: "AI's turn (thinking...)" });
                            setTimeout(() => {
                                if (gameOver) {return;}
                                const aiCol = aiLogic.makeAiMove(currentBoard);
                                if (aiCol !== null && gameLogic.dropPiece(currentBoard, aiCol, gameLogic.AI_PIECE)) {
                                    if (gameLogic.checkWin(currentBoard, gameLogic.AI_PIECE)) {
                                        gameOver = true;
                                        webviewView.webview.postMessage({ command: 'gameOver', board: currentBoard, status: 'AI Wins!' });
                                        return;
                                    }
                                    if (gameLogic.isBoardFull(currentBoard)) {
                                        gameOver = true;
                                        webviewView.webview.postMessage({ command: 'gameOver', board: currentBoard, status: 'Draw!' });
                                        return;
                                    }
                                    currentPlayer = gameLogic.PLAYER_PIECE;
                                    webviewView.webview.postMessage({ command: 'updateBoard', board: currentBoard, status: 'Your turn (Player 1 - X)' });
                                } else {
                                    currentPlayer = gameLogic.PLAYER_PIECE;
                                    webviewView.webview.postMessage({ command: 'updateBoard', board: currentBoard, status: 'AI error! Your turn.' });
                                }
                            }, 500);
                        } else {
                            webviewView.webview.postMessage({ command: 'updateBoard', board: currentBoard, status: 'Invalid move! Column might be full. Your turn.' });
                        }
                    }
                    return;
            }
        });
        // Send initial state
        webviewView.webview.postMessage({ command: 'updateBoard', board: currentBoard, status: 'Your turn (Player 1 - X)' });
    }
}

export function deactivate() {}
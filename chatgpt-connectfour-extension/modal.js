// Runs inside the modal.html iframe
// Assumes gameLogic.js and aiLogic.js are loaded first

(function() { // IIFE to avoid polluting global scope
    console.log("Modal script (modal.js) loaded.");

    let currentBoard = createBoard();
    let currentPlayer = PLAYER_PIECE; // Player starts
    let gameOver = false;

    const boardDiv = document.getElementById('board');
    const inputDiv = document.getElementById('input-area');
    const statusDiv = document.getElementById('status');

    // Function to render the board
    function renderBoard(board) {
        boardDiv.innerHTML = ''; // Clear previous board
        for (let r = 0; r < ROWS; r++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'row';
            for (let c = 0; c < COLS; c++) {
                const piece = board[r][c];
                const cellSpan = document.createElement('span');
                let cellClass = 'cell-empty';
                let cellChar = '·'; // Use dot for empty
                if (piece === PLAYER_PIECE) {
                    cellClass = 'cell-player1';
                    cellChar = 'X';
                } else if (piece === AI_PIECE) {
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
        for (let c = 0; c < COLS; c++) {
            const button = document.createElement('button');
            button.innerText = (c + 1).toString();
            button.disabled = gameOver || board[0][c] !== EMPTY; // Disable if game over or col full
            button.onclick = () => handlePlayerMove(c);
            inputDiv.appendChild(button);
        }
    }

    // Function to handle player clicking a column button
    function handlePlayerMove(column) {
        if (gameOver || currentPlayer !== PLAYER_PIECE) {
            return; // Ignore clicks if game over or not player's turn
        }

        console.log('Modal: Player clicked column:', column);
        if (dropPiece(currentBoard, column, PLAYER_PIECE)) {
            renderBoard(currentBoard); // Show player's move immediately

            if (checkWin(currentBoard, PLAYER_PIECE)) {
                updateStatus("You Win!", "win");
                gameOver = true;
                disableInput();
                return;
            }
            if (isBoardFull(currentBoard)) {
                updateStatus("Draw!", "draw");
                gameOver = true;
                disableInput();
                return;
            }

            // Switch to AI's turn
            currentPlayer = AI_PIECE;
            updateStatus("AI's turn (thinking...)", "thinking");
            disableInput(); // Disable input while AI thinks

            // --- Call AI function ---
            setTimeout(() => { // Simulate thinking delay
                if (gameOver) return; // Should not happen, but safety check

                console.log("Modal: AI Thinking...");
                const aiCol = makeAiMove(currentBoard); // From aiLogic.js

                if (aiCol !== null && dropPiece(currentBoard, aiCol, AI_PIECE)) {
                    renderBoard(currentBoard); // Show AI's move

                    if (checkWin(currentBoard, AI_PIECE)) {
                        updateStatus("AI Wins!", "lose");
                        gameOver = true;
                        disableInput();
                        return;
                    }
                    if (isBoardFull(currentBoard)) {
                        updateStatus("Draw!", "draw");
                        gameOver = true;
                        disableInput();
                        return;
                    }

                    // Switch back to Player's turn
                    currentPlayer = PLAYER_PIECE;
                    updateStatus('Your turn (Player 1 - X)');
                    enableInput(currentBoard); // Re-enable valid inputs

                } else {
                     console.error("Modal: AI failed to make a valid move or returned null. AI recommended col:", aiCol);
                     // Handle error - switch back to player?
                     currentPlayer = PLAYER_PIECE;
                     updateStatus('AI error! Your turn.');
                     enableInput(currentBoard);
                }
            }, 300); // Shorter delay for responsiveness

        } else {
            // Invalid move (should be prevented by disabled buttons, but good to handle)
            console.log("Modal: Invalid player move attempted.");
            updateStatus('Invalid move! Column full? Your turn.');
        }
    }

    // Function to update status message and style
    function updateStatus(message, statusClass = '') {
         statusDiv.innerText = message;
         statusDiv.className = statusClass; // Apply styling class
    }

    // Function to disable all input buttons
    function disableInput() {
        const buttons = inputDiv.querySelectorAll('button');
        buttons.forEach(button => button.disabled = true);
    }

    // Function to enable input buttons based on board state (and not game over)
    function enableInput(board) {
         if (gameOver) return;
         const buttons = inputDiv.querySelectorAll('button');
         buttons.forEach((button, index) => {
            // Enable only if the corresponding column isn't full
            button.disabled = board[0][index] !== EMPTY;
         });
    }

    // Function to reset the game
    function resetGame() {
        console.log("Modal: Resetting game.");
        currentBoard = createBoard();
        currentPlayer = PLAYER_PIECE;
        gameOver = false;
        renderBoard(currentBoard);
        updateStatus('Your turn (Player 1 - X)');
    }

    // Listen for messages from the parent window (content script)
    window.addEventListener('message', event => {
        // Basic security check: Ensure message is from the expected origin (extension)
        // Note: In Chrome extensions, checking event.origin might be complex due to chrome-extension:// URLs.
        // Relying on the fact that only the content script should be posting messages here.
        if (event.data && event.data.command === 'resetGame') {
            resetGame();
        }
    });


    // Initial game setup on load
    console.log("Modal: Initializing game board.");
    resetGame();

}()); // End IIFE
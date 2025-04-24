# ConnectFourBreak

Play ASCII Connect Four in a VS Code panel while you wait for Copilot or just want a break!

## Features
- Play Connect Four against a simple AI (Minimax with alpha-beta pruning)
- ASCII board, keyboard/mouse friendly
- Works in any VS Code window

## How to Run Locally (Development)

1. **Install dependencies**

   ```sh
   npm install
   ```

2. **Compile the extension**

   ```sh
   npm run compile
   ```

3. **Launch the extension**
   - Press `F5` in VS Code (with this folder open) to open a new Extension Development Host window.
   - In the new window, open the Command Palette (`Cmd+Shift+P` or `Ctrl+Shift+P`), type `Connect Four: Start Game Break`, and run the command.

4. **Play!**
   - The Connect Four panel will open. Click the column buttons to drop your piece.

## How to Test

- Run the test suite with:
  ```sh
  npm test
  ```
- Lint the code with:
  ```sh
  npm run lint
  ```

## How to Package and Publish to the VS Code Marketplace

1. **Install vsce (VS Code Extension Manager):**
   ```sh
   npm install -g vsce
   ```
2. **Package your extension:**
   ```sh
   vsce package
   ```
   This creates a `.vsix` file you can share or install manually.
3. **Publish to Marketplace:**
   - Create a publisher account: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
   - Follow the instructions to publish:
     ```sh
     vsce publish
     ```

## Notes
- Make sure your code and assets are original or properly licensed before publishing.
- This extension is for VS Code, not a standalone app.

## License
MIT (or your preferred license)

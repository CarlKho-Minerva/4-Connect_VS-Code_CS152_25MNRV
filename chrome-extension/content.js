console.log("ChatGPT Connect Four Extension: Content script loaded.");

let gameModal = null;
let iframe = null;
let dontShowAgain = false;

// Function to create and show the modal
function showModal() {
    if (gameModal && gameModal.style.display === 'block') {
        console.log('Modal already visible.');
        return; // Don't show if already visible
    }

    if (dontShowAgain) {
        console.log('Modal disabled for this session.');
        return;
    }

    console.log('Showing Connect Four modal.');

    // Create modal container if it doesn't exist
    if (!gameModal) {
        gameModal = document.createElement('div');
        gameModal.id = 'connectFourModal';
        gameModal.style.display = 'none'; // Start hidden
        gameModal.style.position = 'fixed';
        gameModal.style.left = '50%';
        gameModal.style.top = '50%';
        gameModal.style.transform = 'translate(-50%, -50%)';
        gameModal.style.zIndex = '10000'; // High z-index
        gameModal.style.border = '1px solid #424242'; /* Darker border to match theme */
        gameModal.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)'; /* Slightly adjusted shadow */
        gameModal.style.backgroundColor = '#212121'; /* Match modal content background */
        gameModal.style.borderRadius = '8px';
        gameModal.style.overflow = 'hidden'; // Contain the iframe

        // Create an iframe to host the game content
        iframe = document.createElement('iframe');
        iframe.src = chrome.runtime.getURL('modal.html');
        iframe.style.width = '450px'; // Adjust size as needed
        iframe.style.height = '550px'; // Adjust size as needed
        iframe.style.border = 'none';

        // Create a close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'X';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '5px';
        closeButton.style.right = '10px';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.fontSize = '1.2em';
        closeButton.style.cursor = 'pointer';
        closeButton.style.color = '#bdbdbd'; /* Lighter color for visibility */
        closeButton.onclick = hideModal;

        // Add close button hover effect
        closeButton.onmouseover = function() {
            closeButton.style.color = '#ffffff';
        };
        closeButton.onmouseout = function() {
            closeButton.style.color = '#bdbdbd';
        };

        // Append elements
        gameModal.appendChild(closeButton);
        gameModal.appendChild(iframe);
        document.body.appendChild(gameModal);

        // Add listener to close modal if clicked outside
        document.addEventListener('click', handleClickOutside);
    }

    gameModal.style.display = 'block';
}

// Function to hide the modal
function hideModal() {
    if (gameModal) {
        console.log('Hiding Connect Four modal.');
        gameModal.style.display = 'none';
        // Optionally reset the game inside the iframe here if needed
        if (iframe && iframe.contentWindow) {
             iframe.contentWindow.postMessage({ command: 'resetGame' }, '*');
        }
    }
}

// Function to handle clicks outside the modal
function handleClickOutside(event) {
    if (gameModal && gameModal.style.display === 'block' && !gameModal.contains(event.target)) {
        // Check if the click was on the manual trigger button (we'll add this later)
        const manualTrigger = document.getElementById('manualConnectFourButton');
        if (!manualTrigger || !manualTrigger.contains(event.target)) {
             hideModal();
        }
    }
}

// --- Observer for Streaming Button --- //

let isStreaming = false; // Track streaming state

const streamingObserverTargetNode = document.body;
const streamingObserverConfig = { childList: true, subtree: true };

const streamingCallback = function(mutationsList, observer) {
    let streamingButtonNowPresent = false;

    // Check if the streaming button exists in the current DOM state after mutations
    const stopButton = document.querySelector('button[aria-label="Stop streaming"]');
    if (stopButton) {
        streamingButtonNowPresent = true;
    }

    if (streamingButtonNowPresent && !isStreaming) {
        // Streaming just started
        console.log('Detected streaming start.');
        isStreaming = true;
        showModal();
    } else if (!streamingButtonNowPresent && isStreaming) {
        // Streaming just ended (button was there, now it's gone)
        console.log('Detected streaming end.');
        isStreaming = false;
        hideModal();
        // Optional: Check for Regenerate button as confirmation, though disappearance should be enough
    }

    // Update the state for the next mutation check
    // isStreaming = streamingButtonNowPresent; // This line was incorrect, state is managed above
};

const streamingObserver = new MutationObserver(streamingCallback);
streamingObserver.observe(streamingObserverTargetNode, streamingObserverConfig);
console.log('MutationObserver started to watch for streaming button.');

// Add a MutationObserver to wait for the composer-footer-actions div
const observer = new MutationObserver(() => {
    const actionsArea = document.querySelector('div[data-testid="composer-footer-actions"]');
    if (actionsArea && !document.getElementById('manualConnectFourButton')) {
        // Create the Play button
        const manualButton = document.createElement('button');
        manualButton.id = 'manualConnectFourButton';
        manualButton.textContent = 'Play';
        manualButton.title = dontShowAgain
            ? 'Disabled for this session (right-click to re-enable)'
            : 'Play Connect Four (right-click to disable for this session)';
        manualButton.style.border = '1.5px solid #444';
        manualButton.style.borderRadius = '999px';
        manualButton.style.backgroundColor = dontShowAgain ? '#6C71FF' : 'transparent';
        manualButton.style.color = '#fff';
        manualButton.style.fontWeight = '400';
        manualButton.style.fontSize = '13px';
        manualButton.style.height = '36px';
        manualButton.style.padding = '0 18px';
        manualButton.style.display = 'inline-flex';
        manualButton.style.alignItems = 'center';
        manualButton.style.justifyContent = 'center';
        manualButton.style.transition = 'background 0.15s, border 0.15s';
        manualButton.onclick = (event) => {
            event.stopPropagation();
            if (dontShowAgain) {
                // Toggle back to enabled
                dontShowAgain = false;
                manualButton.style.backgroundColor = '#303030';
                manualButton.title = 'Play Connect Four (right-click to disable for this session)';
            } else {
                showModal();
            }
        };
        manualButton.oncontextmenu = (event) => {
            event.preventDefault();
            dontShowAgain = !dontShowAgain;
            manualButton.style.backgroundColor = dontShowAgain ? '#6C71FF' : '#303030';
            manualButton.title = dontShowAgain
                ? 'Disabled for this session (right-click to re-enable)'
                : 'Play Connect Four (right-click to disable for this session)';
        };
        // Custom tooltip
        const tooltip = document.createElement('div');
        tooltip.id = 'c4-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.background = '#18181b';
        tooltip.style.color = '#fff';
        tooltip.style.fontWeight = '600';
        tooltip.style.fontSize = '15px';
        tooltip.style.padding = '10px 18px';
        tooltip.style.borderRadius = '10px';
        tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.15s';
        tooltip.style.zIndex = '99999';
        tooltip.style.left = '0';
        tooltip.style.top = '0';
        tooltip.style.whiteSpace = 'nowrap';
        tooltip.style.transform = 'translateY(8px)';
        tooltip.innerText = manualButton.title;
        document.body.appendChild(tooltip);
        // Arrow
        const arrow = document.createElement('div');
        arrow.style.position = 'absolute';
        arrow.style.top = '-8px';
        arrow.style.left = '50%';
        arrow.style.transform = 'translateX(-50%)';
        arrow.style.width = '0';
        arrow.style.height = '0';
        arrow.style.borderLeft = '8px solid transparent';
        arrow.style.borderRight = '8px solid transparent';
        arrow.style.borderBottom = '8px solid #18181b';
        tooltip.appendChild(arrow);
        // Tooltip handlers
        manualButton.onmouseenter = (e) => {
            manualButton.title = '';
            tooltip.innerText = dontShowAgain
                ? 'Disabled for this session (right-click to re-enable)'
                : 'Play Connect Four (right-click to disable for this session)';
            const rect = manualButton.getBoundingClientRect();
            tooltip.style.left = `${rect.left + rect.width/2 - tooltip.offsetWidth/2}px`;
            tooltip.style.top = `${rect.bottom + 8}px`;
            tooltip.style.opacity = '1';
        };
        manualButton.onmouseleave = () => {
            tooltip.style.opacity = '0';
        };
        manualButton.onmousemove = (e) => {
            const rect = manualButton.getBoundingClientRect();
            tooltip.style.left = `${rect.left + rect.width/2 - tooltip.offsetWidth/2}px`;
            tooltip.style.top = `${rect.bottom + 8}px`;
        };
        actionsArea.appendChild(manualButton);
        observer.disconnect(); // Stop observing once added
    }
});
observer.observe(document.body, { childList: true, subtree: true });

// Clean up observers on unload
window.addEventListener('unload', () => {
    if (streamingObserver) {
        streamingObserver.disconnect();
        console.log('Streaming MutationObserver disconnected.');
    }
    document.removeEventListener('click', handleClickOutside);
});

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
        gameModal.style.border = '1px solid #ccc';
        gameModal.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        gameModal.style.backgroundColor = 'white'; // Or use theme variables if possible
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
        closeButton.onclick = hideModal;

        // Create "Don't show again" toggle/button
        const dontShowToggleContainer = document.createElement('div');
        dontShowToggleContainer.style.position = 'absolute';
        dontShowToggleContainer.style.bottom = '10px';
        dontShowToggleContainer.style.left = '10px';
        dontShowToggleContainer.style.fontSize = '0.8em';
        dontShowToggleContainer.style.color = '#555';

        const dontShowCheckbox = document.createElement('input');
        dontShowCheckbox.type = 'checkbox';
        dontShowCheckbox.id = 'dontShowConnectFour';
        dontShowCheckbox.checked = dontShowAgain;
        dontShowCheckbox.onchange = (e) => {
            dontShowAgain = e.target.checked;
            console.log('Dont show again set to:', dontShowAgain);
            // Optionally save this preference to chrome.storage.local for persistence
        };

        const dontShowLabel = document.createElement('label');
        dontShowLabel.htmlFor = 'dontShowConnectFour';
        dontShowLabel.textContent = ' Don\'t show automatically this session';
        dontShowLabel.style.cursor = 'pointer';

        dontShowToggleContainer.appendChild(dontShowCheckbox);
        dontShowToggleContainer.appendChild(dontShowLabel);

        // Append elements
        gameModal.appendChild(closeButton);
        gameModal.appendChild(iframe);
        gameModal.appendChild(dontShowToggleContainer);
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

const targetNode = document.body; // Observe the whole body for simplicity, might need refinement
const config = { childList: true, subtree: true };

const callback = function(mutationsList, observer) {
    for(const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            // Check if the "Stop streaming" button appeared
            const stopButton = document.querySelector('button[aria-label="Stop streaming"]');
            if (stopButton) {
                console.log('Detected streaming start.');
                showModal();
                // Maybe disconnect observer once found if only needed once per stream?
                // observer.disconnect();
            }

            // Optional: Check if the button disappeared (streaming stopped)
            // This requires tracking the button's state or observing its removal
        }
    }
};

const observer = new MutationObserver(callback);

// Start observing
observer.observe(targetNode, config);
console.log('MutationObserver started to watch for streaming button.');

// --- Manual Trigger Button (Placeholder) --- //

function addManualTriggerButton() {
    // Find the area near the send button (this selector might change with ChatGPT updates)
    const sendButtonArea = document.querySelector('textarea[data-id="root"]')?.parentNode?.parentNode;

    if (sendButtonArea && !document.getElementById('manualConnectFourButton')) {
        console.log('Adding manual trigger button.');
        const manualButton = document.createElement('button');
        manualButton.id = 'manualConnectFourButton';
        manualButton.textContent = 'C4'; // Short text for the button
        manualButton.title = 'Play Connect Four';
        // Basic styling - adjust as needed to fit near the send button
        manualButton.style.marginLeft = '8px';
        manualButton.style.padding = '5px 10px';
        manualButton.style.border = '1px solid #ccc';
        manualButton.style.borderRadius = '4px';
        manualButton.style.cursor = 'pointer';
        manualButton.style.backgroundColor = '#f0f0f0';

        manualButton.onclick = (event) => {
            event.stopPropagation(); // Prevent click outside listener from closing immediately
            showModal();
        };

        // Try to insert it after the textarea or near the send button
        sendButtonArea.appendChild(manualButton);
    } else {
        // Retry if the area isn't found yet
        setTimeout(addManualTriggerButton, 1000);
    }
}

// Initial attempt to add the button
addManualTriggerButton();

// Clean up observer on unload (though content scripts usually run until page unload)
window.addEventListener('unload', () => {
    if (observer) {
        observer.disconnect();
        console.log('MutationObserver disconnected.');
    }
    document.removeEventListener('click', handleClickOutside);
});

document.addEventListener('DOMContentLoaded', () => {
    // Check if titlebar already exists
    if (document.querySelector('.titlebar')) return;
    
    // Create titlebar container
    const titlebar = document.createElement('div');
    titlebar.className = 'titlebar';
    titlebar.innerHTML = `
        <div class="titlebar-title">OBS Remote Control</div>
        <div class="titlebar-controls">
            <div class="titlebar-button" id="minimize-btn">
                <svg viewBox="0 0 10 1">
                    <rect width="10" height="1" />
                </svg>
            </div>
            <div class="titlebar-button" id="maximize-btn">
                <svg viewBox="0 0 10 10">
                    <rect width="10" height="10" fill="none" stroke="currentColor" stroke-width="1" />
                </svg>
            </div>
            <div class="titlebar-button close" id="close-btn">
                <svg viewBox="0 0 10 10">
                    <path d="M1 1 L9 9 M9 1 L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
            </div>
        </div>
    `;

    // Insert the titlebar at the beginning of the body
    document.body.insertBefore(titlebar, document.body.firstChild);
    
    // Add padding to app container to account for fixed titlebar
    const appContainer = document.querySelector('.app');
    if (appContainer) {
        appContainer.style.paddingTop = '30px';
    }

    // Add event listeners
    document.getElementById('minimize-btn').addEventListener('click', () => {
        window.windowControls.minimize();
    });

    document.getElementById('maximize-btn').addEventListener('click', () => {
        window.windowControls.maximize();
    });

    document.getElementById('close-btn').addEventListener('click', () => {
        window.windowControls.close();
    });
});

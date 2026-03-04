export const webviewInlineScript = `
      (function() {
        const vscode = acquireVsCodeApi();
        let currentDiagramData = null;

        function initialize() {
          document.getElementById('zoom-in').addEventListener('click', () => {
            // Zoom in
          });
          document.getElementById('zoom-out').addEventListener('click', () => {
            // Zoom out
          });
          document.getElementById('fit-view').addEventListener('click', () => {
            // Fit view
          });
          document.getElementById('abstraction-level').addEventListener('change', (e) => {
            vscode.postMessage({ type: 'abstractionLevelChanged', level: parseInt(e.target.value) });
          });
          document.getElementById('export-png').addEventListener('click', () => {
            vscode.postMessage({ type: 'exportRequested', format: 'png' });
          });
          document.getElementById('export-svg').addEventListener('click', () => {
            vscode.postMessage({ type: 'exportRequested', format: 'svg' });
          });
          document.getElementById('refresh').addEventListener('click', () => {
            vscode.postMessage({ type: 'refreshRequested' });
          });

          window.addEventListener('message', (event) => {
            const message = event.data;
            if (message.type === 'initialize') {
              currentDiagramData = message.data;
              document.getElementById('loading').style.display = 'none';
            } else if (message.type === 'error') {
              document.getElementById('loading').style.display = 'none';
              document.getElementById('error').style.display = 'block';
              document.querySelector('.error-message').textContent = message.message;
            }
          });

          vscode.postMessage({ type: 'ready' });
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initialize);
        } else {
          initialize();
        }
      })();
    `;

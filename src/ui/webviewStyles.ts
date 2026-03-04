export const webviewFeedbackStyles = `
      #loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        z-index: 2000;
        background: rgba(255, 255, 255, 0.95);
        padding: 30px 40px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      }
      .spinner {
        width: 40px;
        height: 40px;
        margin: 0 auto 16px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #0066cc;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      #error {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        z-index: 2000;
        background: #fff;
        padding: 30px 40px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        border-left: 4px solid #dc3545;
        max-width: 500px;
      }
      .error-message {
        margin: 0;
        color: #dc3545;
        font-size: 14px;
      }
    `;

export const webviewTooltipStyles = `
      .diagram-tooltip {
        position: absolute;
        background: rgba(0, 0, 0, 0.85);
        color: #fff;
        padding: 10px 14px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        z-index: 1000;
        max-width: 250px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }
    `;

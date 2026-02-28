/**
 * Integration tests for webview communication
 * Tests message flow between extension and webview
 */

import { WebviewManager } from '../WebviewManager';
import { WebviewMessageHandler } from '../WebviewMessageHandler';
import { FileHighlighter } from '../FileHighlighter';
import { FileMappingService } from '../FileMappingService';
import { DiagramData, WebviewMessage, AbstractionLevel, ComponentType, Language, RelationshipType } from '../../types';

describe('Webview Integration Tests', () => {
  let webviewManager: WebviewManager;
  let fileHighlighter: FileHighlighter;
  let fileMappingService: FileMappingService;
  let messageHandler: WebviewMessageHandler;

  // Sample diagram data for testing
  const sampleDiagramData: DiagramData = {
    nodes: [
      {
        id: 'node1',
        label: 'Component A',
        type: ComponentType.Module,
        language: Language.TypeScript,
        filePaths: ['src/componentA.ts', 'src/componentA.test.ts'],
        style: {
          color: '#4a90e2',
          shape: 'rectangle',
          size: 100,
          borderWidth: 2
        }
      },
      {
        id: 'node2',
        label: 'Component B',
        type: ComponentType.Class,
        language: Language.TypeScript,
        filePaths: ['src/componentB.ts'],
        style: {
          color: '#50c878',
          shape: 'rectangle',
          size: 80,
          borderWidth: 2
        }
      }
    ],
    edges: [
      {
        id: 'edge1',
        source: 'node1',
        target: 'node2',
        type: RelationshipType.Dependency,
        style: {
          color: '#666',
          width: 2,
          lineStyle: 'solid',
          arrow: true
        }
      }
    ],
    layout: {
      algorithm: 'dagre',
      spacing: 50,
      direction: 'TB'
    },
    abstractionLevel: AbstractionLevel.Module
  };

  beforeEach(() => {
    webviewManager = new WebviewManager();
    fileHighlighter = new FileHighlighter();
    fileMappingService = new FileMappingService();
    messageHandler = new WebviewMessageHandler(webviewManager, fileHighlighter, fileMappingService);
  });

  afterEach(() => {
    webviewManager.disposeWebview();
    fileHighlighter.dispose();
    messageHandler.dispose();
  });

  describe('Message flow from extension to webview', () => {
    it('should send initialize message with diagram data', () => {
      // Create webview
      const panel = webviewManager.createWebview();
      expect(panel).toBeDefined();

      // Spy on postMessage
      const postMessageSpy = jest.spyOn(webviewManager, 'postMessage');

      // Update diagram
      webviewManager.updateDiagram(sampleDiagramData);

      // Verify message was sent
      expect(postMessageSpy).toHaveBeenCalledWith({
        type: 'initialize',
        data: sampleDiagramData
      });
    });

    it('should send abstraction level changed message', () => {
      webviewManager.createWebview();
      const postMessageSpy = jest.spyOn(webviewManager, 'postMessage');

      // Change abstraction level
      webviewManager.setAbstractionLevel(AbstractionLevel.Detailed);

      // Verify message was sent
      expect(postMessageSpy).toHaveBeenCalledWith({
        type: 'abstractionLevelChanged',
        level: AbstractionLevel.Detailed
      });
    });

    it('should send error message to webview', () => {
      webviewManager.createWebview();
      const postMessageSpy = jest.spyOn(webviewManager, 'postMessage');

      // Send error
      webviewManager.showError('Test error message');

      // Verify message was sent
      expect(postMessageSpy).toHaveBeenCalledWith({
        type: 'error',
        message: 'Test error message'
      });
    });

    it('should handle multiple messages in sequence', () => {
      webviewManager.createWebview();
      const postMessageSpy = jest.spyOn(webviewManager, 'postMessage');

      // Send multiple messages
      webviewManager.updateDiagram(sampleDiagramData);
      webviewManager.setAbstractionLevel(AbstractionLevel.Overview);
      webviewManager.showError('Error occurred');

      // Verify all messages were sent
      expect(postMessageSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Message flow from webview to extension', () => {
    it('should handle element selected message and highlight files', () => {
      webviewManager.createWebview();
      messageHandler.setDiagramData(sampleDiagramData);

      // Spy on file highlighter
      const highlightSpy = jest.spyOn(fileHighlighter, 'highlightFiles');

      // Simulate element selected message from webview
      const message: WebviewMessage = {
        type: 'elementSelected',
        elementId: 'node1'
      };

      // Trigger message handler (simulate receiving message)
      (messageHandler as any).handleMessage(message);

      // Verify files were highlighted
      expect(highlightSpy).toHaveBeenCalledWith([
        'src/componentA.ts',
        'src/componentA.test.ts'
      ]);
    });

    it('should clear highlights when element is deselected', () => {
      webviewManager.createWebview();
      messageHandler.setDiagramData(sampleDiagramData);

      const clearSpy = jest.spyOn(fileHighlighter, 'clearHighlights');

      // Simulate deselection (empty elementId)
      const message: WebviewMessage = {
        type: 'elementSelected',
        elementId: ''
      };

      (messageHandler as any).handleMessage(message);

      // Verify highlights were cleared
      expect(clearSpy).toHaveBeenCalled();
    });

    it('should handle abstraction level changed message', () => {
      webviewManager.createWebview();
      messageHandler.setDiagramData(sampleDiagramData);

      const updateSpy = jest.spyOn(webviewManager, 'updateDiagram');

      // Simulate abstraction level change
      const message: WebviewMessage = {
        type: 'abstractionLevelChanged',
        level: AbstractionLevel.Detailed
      };

      (messageHandler as any).handleMessage(message);

      // Verify diagram was updated
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should handle export requested message', () => {
      const exportCallback = jest.fn();
      messageHandler = new WebviewMessageHandler(
        webviewManager,
        fileHighlighter,
        fileMappingService,
        { onExportRequested: exportCallback }
      );

      webviewManager.createWebview();

      // Simulate export request
      const message: WebviewMessage = {
        type: 'exportRequested',
        format: 'png'
      };

      (messageHandler as any).handleMessage(message);

      // Verify callback was called
      expect(exportCallback).toHaveBeenCalledWith('png');
    });

    it('should handle refresh requested message', () => {
      const refreshCallback = jest.fn();
      messageHandler = new WebviewMessageHandler(
        webviewManager,
        fileHighlighter,
        fileMappingService,
        { onRefreshRequested: refreshCallback }
      );

      webviewManager.createWebview();

      // Simulate refresh request
      const message: WebviewMessage = {
        type: 'refreshRequested'
      };

      (messageHandler as any).handleMessage(message);

      // Verify callback was called
      expect(refreshCallback).toHaveBeenCalled();
    });

    it('should handle element hovered message', () => {
      const hoverCallback = jest.fn();
      messageHandler = new WebviewMessageHandler(
        webviewManager,
        fileHighlighter,
        fileMappingService,
        { onElementHovered: hoverCallback }
      );

      webviewManager.createWebview();

      // Simulate hover
      const message: WebviewMessage = {
        type: 'elementHovered',
        elementId: 'node1'
      };

      (messageHandler as any).handleMessage(message);

      // Verify callback was called
      expect(hoverCallback).toHaveBeenCalledWith('node1');
    });
  });

  describe('Diagram data serialization/deserialization', () => {
    it('should correctly serialize diagram data for webview', () => {
      webviewManager.createWebview();
      const postMessageSpy = jest.spyOn(webviewManager, 'postMessage');

      webviewManager.updateDiagram(sampleDiagramData);

      // Verify the data structure is preserved
      const call = postMessageSpy.mock.calls[0][0];
      expect(call.type).toBe('initialize');
      expect((call as any).data).toEqual(sampleDiagramData);
      expect((call as any).data.nodes).toHaveLength(2);
      expect((call as any).data.edges).toHaveLength(1);
    });

    it('should handle diagram data with multiple abstraction levels', () => {
      const multiLevelData: DiagramData = {
        ...sampleDiagramData,
        nodes: [
          ...sampleDiagramData.nodes,
          {
            id: 'node3',
            label: 'Detailed Component',
            type: ComponentType.Function,
            language: Language.TypeScript,
            filePaths: ['src/utils.ts'],
            style: {
              color: '#ff6b6b',
              shape: 'ellipse',
              size: 60,
              borderWidth: 1
            }
          }
        ]
      };

      webviewManager.createWebview();
      messageHandler.setDiagramData(multiLevelData);

      const postMessageSpy = jest.spyOn(webviewManager, 'postMessage');

      // Change abstraction level
      const message: WebviewMessage = {
        type: 'abstractionLevelChanged',
        level: AbstractionLevel.Overview
      };

      (messageHandler as any).handleMessage(message);

      // Verify filtered data was sent
      expect(postMessageSpy).toHaveBeenCalled();
    });

    it('should preserve node and edge properties during filtering', () => {
      webviewManager.createWebview();
      messageHandler.setDiagramData(sampleDiagramData);

      const updateSpy = jest.spyOn(webviewManager, 'updateDiagram');

      // Filter diagram
      const message: WebviewMessage = {
        type: 'abstractionLevelChanged',
        level: AbstractionLevel.Module
      };

      (messageHandler as any).handleMessage(message);

      // Verify data structure is preserved
      const filteredData = updateSpy.mock.calls[0][0];
      expect(filteredData.nodes[0]).toHaveProperty('id');
      expect(filteredData.nodes[0]).toHaveProperty('label');
      expect(filteredData.nodes[0]).toHaveProperty('filePaths');
      expect(filteredData.nodes[0]).toHaveProperty('style');
    });
  });

  describe('Error message display in webview', () => {
    it('should display error message when diagram generation fails', () => {
      webviewManager.createWebview();
      const postMessageSpy = jest.spyOn(webviewManager, 'postMessage');

      // Send error
      webviewManager.showError('Failed to generate diagram');

      // Verify error message was sent
      expect(postMessageSpy).toHaveBeenCalledWith({
        type: 'error',
        message: 'Failed to generate diagram'
      });
    });

    it('should handle error messages from webview', () => {
      webviewManager.createWebview();
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Simulate error from webview
      const message: WebviewMessage = {
        type: 'error',
        message: 'Webview rendering error'
      };

      (messageHandler as any).handleMessage(message);

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        'Webview error:',
        'Webview rendering error'
      );

      consoleSpy.mockRestore();
    });

    it('should handle multiple error messages', () => {
      webviewManager.createWebview();
      const postMessageSpy = jest.spyOn(webviewManager, 'postMessage');

      // Send multiple errors
      webviewManager.showError('Error 1');
      webviewManager.showError('Error 2');
      webviewManager.showError('Error 3');

      // Verify all errors were sent
      expect(postMessageSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Webview lifecycle', () => {
    it('should create webview only once', () => {
      const panel1 = webviewManager.createWebview();
      const panel2 = webviewManager.createWebview();

      // Should return the same panel
      expect(panel1).toBe(panel2);
    });

    it('should dispose webview and clean up resources', () => {
      webviewManager.createWebview();
      expect(webviewManager.isActive()).toBe(true);

      webviewManager.disposeWebview();
      expect(webviewManager.isActive()).toBe(false);
    });

    it('should clear file highlights on disposal', () => {
      webviewManager.createWebview();
      messageHandler.setDiagramData(sampleDiagramData);

      // Highlight some files
      fileHighlighter.highlightFiles(['src/test.ts']);
      expect(fileHighlighter.getHighlightedFiles()).toHaveLength(1);

      // Dispose
      messageHandler.dispose();

      // Highlights should be cleared
      expect(fileHighlighter.getHighlightedFiles()).toHaveLength(0);
    });

    it('should not send messages after disposal', () => {
      webviewManager.createWebview();
      webviewManager.disposeWebview();

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Try to send message after disposal
      webviewManager.updateDiagram(sampleDiagramData);

      // Should log warning
      expect(consoleSpy).toHaveBeenCalledWith(
        'Cannot post message: webview not available'
      );

      consoleSpy.mockRestore();
    });
  });
});

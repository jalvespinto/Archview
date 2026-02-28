# Implementation Plan: AI Architecture Diagram Extension

## Overview

This plan implements an AI-powered architecture diagram extension for Kiro IDE using TypeScript, Tree-sitter for multi-language parsing, Kiro's built-in AI API, and Cytoscape.js for diagram rendering. The implementation follows an incremental approach, building core functionality first, then adding AI enhancement, interactivity, and advanced features.

## Tasks

- [x] 1. Set up project structure and dependencies
  - Note: package.json, tsconfig.json, and src/ directory already exist - verify and complete remaining items
  - Create extension subdirectories: `src/analysis/`, `src/diagram/`, `src/ui/`
  - Add dependencies: `tree-sitter`, language parsers (`tree-sitter-python`, `tree-sitter-javascript`, `tree-sitter-typescript`, `tree-sitter-java`, `tree-sitter-go`), `cytoscape`, `cytoscape-dagre`
  - Add dev dependencies: `@types/node`, `jest`, `@types/jest`, `fast-check`
  - Set up Jest configuration for unit and property-based testing
  - _Requirements: 8.2_

- [x] 2. Define core data models and interfaces
  - [x] 2.1 Create type definitions for analysis models
    - Define `Component`, `ComponentType`, `Language`, `AbstractionLevel`, `ComponentMetadata` interfaces
    - Define `Relationship`, `RelationshipType`, `RelationshipMetadata` interfaces
    - Define `AnalysisResult`, `AnalysisMetadata`, `AnalysisConfig` interfaces
    - _Requirements: 1.2, 1.3, 1.4, 12.1_
  
  - [x] 2.2 Create type definitions for diagram models
    - Define `DiagramData`, `DiagramNode`, `DiagramEdge` interfaces
    - Define `NodeStyle`, `EdgeStyle`, `LayoutConfig` interfaces
    - Define `WebviewMessage` union type for extension-webview communication
    - _Requirements: 2.3, 2.4, 2.5_
  
  - [x] 2.3 Create validation utilities
    - Implement `DataValidator` class with `validateAnalysisResult()` and `validateDiagramData()` methods
    - Add cycle detection for parent-child relationships
    - Add reference integrity checks for relationships and edges
    - _Requirements: 10.1, 10.2_

- [ ] 3. Implement Analysis Service core
  - [x] 3.1 Create file system scanner
    - Implement `FileScanner` class with glob pattern support for include/exclude patterns
    - Add language detection based on file extensions
    - Implement file filtering logic (respect `.gitignore`, custom patterns)
    - Add file count and depth limiting
    - _Requirements: 1.1, 8.4, 12.1_
  
  - [x] 3.2 Write property test for file pattern filtering
    - **Property 23: File Pattern Filtering**
    - **Validates: Requirements 8.4**
  
  - [x] 3.3 Implement Tree-sitter parser integration
    - Create `ParserManager` class to initialize and manage Tree-sitter parsers for each language
    - Implement `parseFile()` method that selects appropriate parser based on language
    - Add AST traversal utilities for extracting nodes by type
    - Handle parse errors gracefully with fallback to partial results
    - _Requirements: 1.2, 1.4, 12.4_
  
  - [x] 3.4 Write property tests for multi-language support
    - **Property 3: Multi-Language Support**
    - **Validates: Requirements 1.4, 12.1**
    - **Property 4: Language Pattern Recognition**
    - **Validates: Requirements 12.4**
  
  - [x] 3.5 Implement component extraction
    - Create `ComponentExtractor` class with language-specific extraction strategies
    - Extract modules/packages (Python modules, JS/TS modules, Java packages, Go packages)
    - Extract classes and interfaces from ASTs
    - Extract functions and methods
    - Assign abstraction levels based on component type and nesting
    - _Requirements: 1.2, 6.2, 6.3, 6.4_
  
  - [x] 3.6 Write property test for component detection
    - **Property 1: Component Detection Completeness**
    - **Validates: Requirements 1.2**
  
  - [x] 3.7 Implement relationship extraction
    - Create `RelationshipExtractor` class to detect dependencies from ASTs
    - Extract import/dependency relationships (import statements, require calls)
    - Extract inheritance relationships (class extends, implements)
    - Extract function call relationships
    - Calculate relationship strength based on occurrence count
    - _Requirements: 1.3_
  
  - [x] 3.8 Write property test for relationship detection
    - **Property 2: Relationship Detection Completeness**
    - **Validates: Requirements 1.3**

- [ ] 4. Implement Analysis Service orchestration (Phase 1: Grounding Layer)
  - [x] 4.0 Validate Kiro AI API integration (SPIKE)
    - Create minimal POC to test Kiro AI API availability and signature
    - Verify API rate limits, token constraints, and response format
    - Document actual API shape for use in Task 6
    - Test fallback behavior when AI unavailable
    - _Requirements: 2.2_

  - [x] 4.1 Create main AnalysisService class with Grounding Layer output
    - Implement `buildGroundingLayer()` method orchestrating scan → parse → extract → build GroundingData
    - Produce compact `GroundingData` struct: directory tree, per-file metadata (language, class/function names, exports), import graph, inheritance graph
    - Add progress tracking with percentage updates every 5 seconds
    - Implement timeout management (120 second max for static analysis phase)
    - Add cancellation support for long-running operations
    - Implement result caching keyed by file modification times
    - _Requirements: 1.1, 1.5, 9.3, 9.5, 10.3_

  - [x] 4.2 Write property test for cache behavior
    - **Property 24: Cache Hit for Unchanged Files**
    - **Validates: Requirements 9.5**

  - [x] 4.3 Implement GroundingData builder
    - Create `GroundingDataBuilder` class that converts raw `Component[]` and `Relationship[]` from extractors into the compact `GroundingData` structure
    - Build `DirectoryNode` tree from file paths
    - Resolve import paths where possible (relative → absolute)
    - Validate grounding data integrity
    - _Requirements: 1.2, 1.3, 2.5_

  - [x] 4.4 Add error handling and logging
    - Create `ErrorHandler` class with methods for each error category
    - Implement graceful degradation for analysis errors
    - Add detailed logging to extension output channel
    - Implement retry logic with exponential backoff
    - _Requirements: 1.6, 10.1, 10.4_

  - [x] 4.5 Write property test for error message display
    - **Property 5: Error Message Display**
    - **Validates: Requirements 1.6, 10.1, 10.2, 10.5**

- [x] 5. Checkpoint - Verify analysis functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement Kiro AI integration (Phase 2: Architectural Model)
  - [x] 6.1 Create KiroAIService class
    - Implement `interpretArchitecture(grounding: GroundingData)` as the primary entry point using Kiro AI API (validated in Task 4.0)
    - Build Tier 1 prompt from GroundingData (directory tree + file metadata + import/inheritance graphs)
    - Parse LLM JSON response into `ArchitecturalModel` structure
    - Detect low-confidence responses and trigger Tier 2/3 enrichment automatically
    - _Requirements: 1.4, 2.2_

  - [x] 6.2 Implement tiered enrichment
    - Implement `enrichGrounding()` for Tier 2: add function signatures and method lists for ambiguous files
    - Implement Tier 3 enrichment: add first 50 lines of file content for files the LLM flags
    - Retry `interpretArchitecture()` with enriched grounding when confidence is low
    - Cap enrichment at Tier 3 (never send full file content)
    - _Requirements: 1.4_

  - [x] 6.3 Implement ArchitecturalModel response caching
    - Create cache keyed by hash of GroundingData structure
    - Implement LRU eviction (max 100 entries)
    - Store cache in extension global state
    - Invalidate cache entries when corresponding files change (modification time check)
    - Cache tier-specific responses separately
    - _Requirements: 9.5_

  - [x] 6.4 Implement fallback strategy (heuristic Architectural Model)
    - When LLM unavailable: produce ArchitecturalModel heuristically — group files by top-level directory, use directory names as component names, derive relationships from import graph
    - Fallback still produces a valid `ArchitecturalModel` (diagram renders without LLM)
    - Mark fallback results with `confidence: 'low'` and notify user with non-blocking warning
    - _Requirements: 10.2_

  - [x] 6.5 Write unit tests for AI integration
    - Test Tier 1 prompt construction with various GroundingData structures
    - Test ArchitecturalModel parsing from valid and malformed LLM responses
    - Test tiered enrichment trigger on low-confidence response
    - Test fallback heuristic produces valid ArchitecturalModel
    - Test cache hit/miss scenarios

- [x] 7. Implement diagram generation
  - [x] 7.1 Create DiagramGenerator class
    - Implement `generateDiagram()` method converting `ArchitecturalModel` to `DiagramData`
    - Create nodes from `ArchitecturalComponent` entries, using LLM-generated names and descriptions as labels
    - Create edges from `ArchitecturalRelationship` entries with styles based on relationship type
    - Preserve LLM-identified hierarchy (parent/child components → nested diagram groups)
    - Implement timeout management (60 second max for generation)
    - _Requirements: 2.1, 2.3, 2.4, 2.7, 12.2_
  
  - [x] 7.2 Write property tests for diagram generation
    - **Property 6: Analysis-to-Diagram Fidelity**
    - **Validates: Requirements 2.1, 2.3, 2.4**
    - **Property 7: Abstraction Level Generation**
    - **Validates: Requirements 2.6**
    - **Property 8: Component Hierarchy Representation**
    - **Validates: Requirements 2.5**
  
  - [x] 7.3 Implement abstraction level filtering
    - Create `AbstractionFilter` class to filter diagram data by level
    - Implement Overview level (level 1 components only)
    - Implement Module level (levels 1-2)
    - Implement Detailed level (all levels)
    - Preserve relationships between visible components
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 7.4 Write property test for abstraction level filtering
    - **Property 19: Abstraction Level Filtering**
    - **Validates: Requirements 6.2, 6.3, 6.4**
  
  - [x] 7.5 Implement visual styling
    - Create `StyleManager` class for node and edge styling
    - Implement language-based color coding for components
    - Implement relationship type-based edge styling (solid, dashed, dotted)
    - Add component type-based shapes (rectangle, ellipse, hexagon)
    - _Requirements: 2.5, 12.2_
  
  - [x] 7.6 Write property test for language visual distinction
    - **Property 29: Language Visual Distinction**
    - **Validates: Requirements 12.2**

- [x] 8. Implement diagram rendering with Cytoscape.js
  - [x] 8.1 Create DiagramRenderer class (webview context)
    - Note: This class runs in the webview's browser context, NOT in Node.js extension host
    - Implement `initialize()` to set up Cytoscape instance in browser DOM
    - Implement `renderDiagram()` to convert DiagramData to Cytoscape format
    - Configure Dagre layout algorithm for hierarchical diagrams
    - Apply node and edge styles from DiagramData
    - Add performance optimization (virtualization for 1000+ nodes)
    - _Requirements: 2.1, 2.7_
  
  - [x] 8.2 Implement navigation controls
    - Implement `zoomIn()`, `zoomOut()`, `fitToView()` methods
    - Implement `panTo()` for programmatic panning
    - Add mouse wheel zoom support
    - Add click-and-drag panning support
    - Maintain element readability at zoom levels 25%-400%
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 8.3 Write property tests for navigation
    - **Property 15: Pan Operation Updates Viewport**
    - **Validates: Requirements 5.1**
    - **Property 16: Zoom Operation Updates Scale**
    - **Validates: Requirements 5.2**
    - **Property 17: Fit-to-View Reset**
    - **Validates: Requirements 5.4**
  
  - [x] 8.4 Implement element interaction
    - Add click event handlers with `onElementClick()` callback
    - Add hover event handlers with `onElementHover()` callback
    - Implement `selectElement()` to highlight selected element
    - Implement `clearSelection()` to remove highlights
    - Add tooltip rendering on hover with element name and file count
    - _Requirements: 3.1, 3.4_
  
  - [x] 8.5 Write property tests for element selection
    - **Property 9: Element Selection Highlighting**
    - **Validates: Requirements 3.1**
    - **Property 11: Tooltip Information Completeness**
    - **Validates: Requirements 3.4**
  
  - [x] 8.6 Implement diagram export
    - Implement `exportToPNG()` with minimum 1920x1080 resolution
    - Implement `exportToSVG()` generating valid SVG documents
    - Add timeout management (5 second max for export)
    - Include all visible elements at current abstraction level
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 8.7 Write property tests for export
    - **Property 20: PNG Export Resolution**
    - **Validates: Requirements 7.2**
    - **Property 21: SVG Export Validity**
    - **Validates: Requirements 7.3**
    - **Property 22: Export Completeness**
    - **Validates: Requirements 7.4**

- [x] 9. Checkpoint - Verify diagram rendering
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement webview integration
  - [x] 10.1 Create WebviewManager class (extension host context)
    - Implement `createWebview()` using Kiro webview API
    - Implement `disposeWebview()` with cleanup
    - Set up bidirectional messaging with `postMessage()` and `onMessage()`
    - Implement `updateDiagram()` to send diagram data to webview
    - Implement `setAbstractionLevel()` to update diagram filtering
    - _Requirements: 2.1, 6.5_
  
  - [x] 10.2 Create webview HTML/CSS/JS bundle
    - Create HTML template with diagram container and control panel
    - Add CSS for diagram controls (zoom buttons, abstraction level selector, export button)
    - Implement JavaScript message handler for receiving diagram data
    - Initialize DiagramRenderer (from Task 8.1) when webview loads
    - Wire up control buttons to send messages back to extension
    - Bundle webview assets for deployment
    - _Requirements: 5.4, 6.5, 7.1_
  
  - [x] 10.3 Implement message handling
    - Handle `initialize` message to set up diagram
    - Handle `elementSelected` message to trigger file highlighting
    - Handle `elementHovered` message for tooltip display
    - Handle `abstractionLevelChanged` message to filter diagram
    - Handle `exportRequested` message to trigger export
    - Handle `refreshRequested` message to regenerate diagram
    - _Requirements: 3.1, 6.5, 7.1, 11.1_
  
  - [x] 10.4 Write integration tests for webview communication
    - Test message flow from extension to webview
    - Test message flow from webview to extension
    - Test diagram data serialization/deserialization
    - Test error message display in webview

- [x] 11. Implement file highlighting
  - [x] 11.1 Create FileHighlighter class
    - Implement `highlightFiles()` using Kiro FileDecoration API
    - Implement `clearHighlights()` to remove all decorations
    - Implement `getHighlightedFiles()` to query current state
    - Implement `isFileHighlighted()` for individual file checks
    - Add custom color/icon for highlighted files
    - _Requirements: 4.1, 4.2, 4.5_
  
  - [x] 11.2 Implement file mapping
    - Create `FileMappingService` to maintain element-to-files associations
    - Implement lookup by element ID returning file paths
    - Handle file system changes (renamed/deleted files)
    - Update mappings when diagram refreshes
    - _Requirements: 3.2, 3.3_
  
  - [x] 11.3 Write property tests for file highlighting
    - **Property 10: File Mapping Integrity**
    - **Validates: Requirements 3.2, 3.3, 4.1**
    - **Property 12: Highlight State Transitions**
    - **Validates: Requirements 3.5, 4.4, 4.5**
    - **Property 13: Highlight Visual Distinction**
    - **Validates: Requirements 4.2**
    - **Property 14: Highlighted File Navigation**
    - **Validates: Requirements 4.3**
  
  - [x] 11.4 Implement IDE integration
    - Listen to file click events in Kiro IDE
    - Open file in editor when highlighted file clicked
    - Clear highlights when diagram closed
    - _Requirements: 4.3, 4.5_

- [x] 12. Implement Extension Controller
  - [x] 12.1 Create ExtensionController class
    - Implement `activate()` to register commands and initialize services
    - Implement `deactivate()` to clean up resources
    - Register command: `generateDiagram` to trigger analysis and rendering
    - Register command: `refreshDiagram` to regenerate with current settings
    - Register command: `exportDiagram` to export current diagram
    - Show welcome message on first activation
    - _Requirements: 8.1, 8.6_
  
  - [x] 12.2 Implement state management
    - Cache AnalysisResult in memory
    - Track currently selected element
    - Track current abstraction level
    - Track zoom and pan state for preservation
    - Implement `getAnalysisResults()`, `setSelectedElement()`, `clearSelection()`
    - _Requirements: 5.5, 6.6, 11.4_
  
  - [x] 12.3 Write property test for state preservation
    - **Property 18: State Preservation During Navigation**
    - **Validates: Requirements 5.5, 6.6, 11.4**
  
  - [x] 12.4 Implement configuration management
    - Create configuration schema in `package.json`
    - Add settings: `includePatterns`, `excludePatterns`, `maxFiles`, `maxDepth`, `languages`, `aiEnabled`, `autoRefresh`, `autoRefreshDebounce` (default: 10s, configurable)
    - Provide default values (exclude `node_modules`, `.git`, etc.)
    - Listen to configuration changes and invalidate cache
    - _Requirements: 8.3, 8.4, 8.5_
  
  - [x] 12.5 Coordinate component interactions
    - Wire AnalysisService → DiagramGenerator → WebviewManager flow
    - Wire element selection → FileHighlighter flow
    - Wire abstraction level changes → diagram filtering flow
    - Wire refresh → re-analysis flow
    - Handle errors from any component with ErrorHandler
    - _Requirements: 2.1, 3.1, 6.5, 11.1_

- [x] 13. Implement auto-refresh and file watching
  - [x] 13.1 Create FileWatcher service
    - Use Kiro file system watcher API to detect file changes
    - Debounce changes using configurable `autoRefreshDebounce` setting (default: 10 seconds)
    - Track which files have changed since last analysis
    - Respect `autoRefresh` configuration setting
    - _Requirements: 11.2, 11.3_
  
  - [x] 13.2 Write property test for file change detection
    - **Property 27: File Change Detection**
    - **Validates: Requirements 11.2, 11.5**
  
  - [x] 13.3 Implement incremental refresh
    - Mark diagram as "out of sync" when files change
    - Show indicator in webview when diagram is stale
    - Trigger re-analysis when auto-refresh enabled
    - Preserve zoom, pan, and selection during refresh
    - Only re-analyze changed files (use cache for unchanged)
    - _Requirements: 11.3, 11.4, 11.5_

- [x] 14. Implement progress indicators and user feedback
  - [x] 14.1 Create ProgressReporter class
    - Show progress notification during analysis with percentage
    - Show progress notification during diagram generation
    - Update progress every 5 seconds
    - Add cancel button for long operations
    - _Requirements: 10.3_
  
  - [x] 14.2 Write property test for progress indicator visibility
    - **Property 25: Progress Indicator Visibility**
    - **Validates: Requirements 10.3**
  
  - [x] 14.3 Implement error notifications
    - Show error messages with descriptive text and action buttons
    - Show warning messages for non-critical failures (AI unavailable)
    - Add "View Logs" action to open extension output channel
    - Add "Retry" action for recoverable errors
    - _Requirements: 10.1, 10.2, 10.5_
  
  - [x] 14.4 Write property test for error logging
    - **Property 26: Error Logging**
    - **Validates: Requirements 10.4**

- [-] 15. Implement performance optimizations
  - [ ] 15.1 Add memory management
    - Implement memory monitoring during analysis (500MB limit)
    - Implement memory monitoring during rendering (200MB limit)
    - Release memory within 2 seconds when diagram closed
    - Use streaming for large file processing
    - _Requirements: 9.1, 9.2, 9.4_
  
  - [ ] 15.2 Optimize analysis performance
    - Validate worker thread support in Kiro extension host (may have restrictions)
    - Use worker threads for parallel file parsing if supported, otherwise use async batching
    - Implement incremental parsing for file updates
    - Batch file system operations
    - Optimize AST traversal algorithms
    - _Requirements: 1.5, 9.3_
  
  - [ ] 15.3 Optimize rendering performance
    - Enable Cytoscape virtualization for large graphs
    - Implement progressive rendering (nodes first, then edges)
    - Debounce zoom/pan updates
    - Use requestAnimationFrame for smooth animations
    - _Requirements: 2.7_
  
  - [ ] 15.4 Write performance tests
    - Benchmark analysis time with 1000+ file codebase (< 120s)
    - Benchmark diagram rendering time (< 60s)
    - Benchmark export time (< 5s)
    - Monitor memory usage during operations

- [ ] 16. Implement multi-language diagram integration
  - [ ] 16.1 Enhance multi-language handling
    - Ensure components from all languages included in single diagram
    - Add language icons to diagram nodes
    - Group components by language in Overview level
    - Handle unknown file types as generic components
    - _Requirements: 12.3, 12.5_
  
  - [ ] 16.2 Write property test for multi-language integration
    - **Property 28: Multi-Language Diagram Integration**
    - **Validates: Requirements 12.3**

- [ ] 17. Checkpoint - Integration testing
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 18. Create extension packaging and documentation
  - [ ] 18.1 Prepare extension for marketplace
    - Create extension icon and banner images
    - Write README.md with features, installation, and usage instructions
    - Write CHANGELOG.md documenting initial release
    - Add LICENSE file
    - Configure `package.json` with marketplace metadata (description, keywords, categories)
    - _Requirements: 8.1_
  
  - [ ] 18.2 Create user documentation
    - Document configuration options in README
    - Add screenshots of diagram views and interactions
    - Create quick start guide
    - Document keyboard shortcuts and commands
    - _Requirements: 8.6_
  
  - [ ] 18.3 Set up CI/CD pipeline
    - Configure automated testing on commits
    - Set up property test runs (100 iterations)
    - Add performance benchmark tracking
    - Configure extension packaging for releases
    - _Requirements: Testing Strategy_

- [ ] 19. Final checkpoint - End-to-end validation
  - Run complete test suite (unit, property, integration, performance)
  - Test with real-world sample projects (Python, TypeScript, Java, Go, polyglot)
  - Verify all 29 correctness properties pass
  - Verify all requirements are met
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Each task references specific requirements for traceability
- Property-based tests validate universal correctness properties from the design document (100 iterations per test)
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- All code is implemented in TypeScript for unified architecture
- **Hybrid architecture**: Tree-sitter produces a compact Grounding Layer (Phase 1); the LLM interprets it into the Architectural Model (Phase 2); Cytoscape.js renders the result (Phase 3)
- The LLM is the **primary producer** of the Architectural Model — not an optional enhancement. Static analysis feeds it structured facts, not the other way around
- Tiered enrichment: Tier 1 (names + paths + graph) is sent by default; Tier 2 (signatures) and Tier 3 (file excerpts) are added only when the LLM signals low confidence
- Kiro AI API used for LLM interpretation (no external providers)
- Cytoscape.js runs in webview browser context, not Node.js extension host
- DiagramRenderer class lives in webview JS bundle, not extension host
- Auto-refresh debounce is configurable (default: 10 seconds)
- Worker threads may have restrictions in Kiro extension host - validate early in Task 15.2

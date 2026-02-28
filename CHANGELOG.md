# Changelog

All notable changes to the ArchView extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-15

### Added

#### Core Features
- **Automatic Codebase Analysis**: Multi-language static analysis using Tree-sitter
  - Support for Python, JavaScript, TypeScript, Java, and Go
  - Efficient parsing of 1000+ file codebases
  - Intelligent file filtering with include/exclude patterns
  
- **AI-Powered Architecture Interpretation**: Integration with Kiro AI API
  - Tiered enrichment strategy (3 levels of detail)
  - Semantic component grouping and naming
  - Architectural pattern detection (MVC, microservices, layered architecture)
  - Automatic fallback to heuristic analysis when AI unavailable
  
- **Interactive Diagram Visualization**: Cytoscape.js-based rendering
  - Hierarchical layout with Dagre algorithm
  - Smooth pan and zoom interactions
  - Element selection and highlighting
  - Hover tooltips with component information
  - Fit-to-view functionality
  
- **IDE Integration**: Seamless Kiro IDE integration
  - File highlighting in explorer when diagram elements selected
  - Click-to-navigate from diagram to source code
  - Automatic highlight cleanup on selection changes
  - Webview-based diagram panel
  
- **Multiple Abstraction Levels**: Three levels of architectural detail
  - Overview: Top-level components and major dependencies
  - Module: Module-level structure and interfaces
  - Detailed: Class and function level detail
  - Smooth transitions between levels
  
- **Diagram Export**: Multiple export formats
  - PNG export (minimum 1920x1080 resolution)
  - SVG export for scalable graphics
  - Export at current abstraction level
  - Fast export (<5 seconds)

#### Commands
- `ArchView: Generate Diagram` - Analyze codebase and create diagram
- `ArchView: Refresh Diagram` - Regenerate diagram with latest changes
- `ArchView: Export Diagram` - Export diagram as PNG or SVG

#### Configuration Options
- `archview.includePatterns` - Glob patterns for files to analyze
- `archview.excludePatterns` - Glob patterns for files to exclude
- `archview.maxFiles` - Maximum number of files to analyze (default: 1000)
- `archview.maxDepth` - Maximum directory depth (default: 10)
- `archview.languages` - Programming languages to analyze
- `archview.aiEnabled` - Enable/disable AI interpretation (default: true)
- `archview.autoRefresh` - Auto-refresh on file changes (default: false)
- `archview.autoRefreshDebounce` - Debounce time for auto-refresh (default: 10000ms)

#### Performance Optimizations
- Analysis caching for unchanged files
- Background thread processing for non-blocking analysis
- Memory management with automatic cleanup
- Efficient AST parsing with Tree-sitter
- Incremental parsing for file updates

#### Error Handling
- Graceful degradation when AI unavailable
- Descriptive error messages for analysis failures
- Progress indicators for long-running operations
- Detailed error logging to IDE console
- Validation of analysis results and diagram data

#### Testing
- Comprehensive unit test suite with Jest
- Property-based testing with fast-check (29 properties)
- Integration tests for end-to-end workflows
- Performance benchmarks for large codebases
- 80%+ code coverage

#### Documentation
- Detailed README with features and usage instructions
- Configuration guide with examples
- Troubleshooting section
- Quick start guide
- Keyboard shortcuts reference

### Technical Details

#### Architecture
- TypeScript-based extension for Kiro IDE
- Layered architecture with clear separation of concerns
- Components: Extension Controller, Analysis Service, Webview Manager, Diagram Renderer, File Highlighter
- Tree-sitter for multi-language parsing
- Cytoscape.js for graph visualization
- Kiro AI API for architectural interpretation

#### Data Models
- GroundingData: Compact static analysis output
- ArchitecturalModel: AI-generated semantic interpretation
- DiagramData: Visual representation structure
- Component and Relationship models with metadata

#### Performance Metrics
- Analysis: <120 seconds for 1000+ files
- Rendering: <60 seconds for diagram generation
- Memory: <500MB during analysis, <200MB during rendering
- Export: <5 seconds for PNG/SVG generation

### Known Limitations

- Maximum 1000 files analyzed by default (configurable up to 10,000)
- AI interpretation requires Kiro AI service availability
- Large diagrams (500+ nodes) may have reduced interactivity
- Auto-refresh disabled by default to avoid performance impact

### Dependencies

#### Runtime
- cytoscape: ^3.28.0
- cytoscape-dagre: ^2.5.0
- tree-sitter: ^0.21.0
- tree-sitter-go: ^0.21.0
- tree-sitter-java: ^0.21.0
- tree-sitter-javascript: ^0.21.0
- tree-sitter-python: ^0.21.0
- tree-sitter-typescript: ^0.21.0

#### Development
- TypeScript: ^5.3.0
- Jest: ^29.7.0
- fast-check: ^3.15.0
- ESLint: ^8.0.0

### Compatibility

- Kiro IDE: ^1.0.0
- Node.js: >=18.0.0

---

## [Unreleased]

### Planned Features
- Real-time collaboration on diagrams
- Custom diagram themes and styling
- Diagram annotations and notes
- Comparison view for architectural changes
- Integration with architecture decision records (ADRs)
- Support for additional languages (C++, Rust, C#)
- Diagram versioning and history
- Export to additional formats (PDF, Mermaid)

---

[0.1.0]: https://github.com/kiro/archview/releases/tag/v0.1.0

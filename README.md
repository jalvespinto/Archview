# ArchView - AI Architecture Diagrams

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/kiro/archview)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Built with Kiro](https://img.shields.io/badge/built%20with-Kiro%20AI-purple.svg)](https://kiro.ai)

Automatically generate interactive architecture diagrams from your codebase using AI. ArchView analyzes your project structure, uses AI to understand architectural patterns, and creates beautiful, navigable visualizations that help you understand and document your software architecture.

> **Built entirely by Kiro AI** - This extension was created through AI-assisted development. The developer provided requirements and specifications only, while Kiro AI handled the complete implementation, including architecture design, code generation, testing, and documentation.

## ✨ Features

### 🔍 Automatic Codebase Analysis
- Scans your entire project automatically
- Supports Python, JavaScript, TypeScript, Java, and Go
- Handles polyglot projects seamlessly
- Analyzes up to 1000+ files efficiently

### 🤖 AI-Powered Architecture Interpretation
- Uses Kiro's AI to intelligently identify architectural components
- Detects architectural patterns (MVC, microservices, layered architecture)
- Groups related files into meaningful components
- Generates semantic descriptions for each component

### 🎨 Interactive Diagram Visualization
- Pan and zoom to explore large architectures
- Click elements to see associated source files
- Hover for quick component information
- Smooth, responsive interactions

### 🔗 Seamless IDE Integration
- Click diagram elements to highlight files in the explorer
- Navigate directly from diagram to code
- File highlighting updates as you explore
- Works within your existing Kiro IDE workflow

### 📊 Multiple Abstraction Levels
- **Overview**: High-level system architecture
- **Module**: Module and package structure
- **Detailed**: Class and function level detail
- Switch between levels to focus on what matters

### 💾 Export Capabilities
- Export to PNG (1920x1080+) for presentations
- Export to SVG for scalable documentation
- Include in technical documentation
- Share with your team

## 🚀 Getting Started

### Installation

1. Open Kiro IDE
2. Go to Extensions marketplace
3. Search for "ArchView"
4. Click Install

### Quick Start

1. Open a project in Kiro IDE
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "ArchView: Generate Diagram"
4. Wait for analysis to complete
5. Explore your architecture!

### First Diagram

When you generate your first diagram:
- The extension analyzes your codebase structure
- AI interprets the architecture and identifies components
- An interactive diagram appears in a new panel
- Click any component to see its source files highlighted

## 📖 Usage

### Commands

Access these commands via the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

- **ArchView: Generate Diagram** - Analyze codebase and create a new diagram
- **ArchView: Refresh Diagram** - Regenerate diagram with latest code changes
- **ArchView: Export Diagram** - Export current diagram as PNG or SVG

### Keyboard Shortcuts

While viewing a diagram:

- **Mouse Wheel** - Zoom in/out
- **Click + Drag** - Pan around the diagram
- **Click Element** - Select component and highlight files
- **Hover Element** - Show component tooltip
- **Fit to View Button** - Reset zoom to show entire diagram

### Abstraction Levels

Use the level selector in the diagram toolbar:

- **Overview** (Level 1) - Top-level components and major dependencies
- **Module** (Level 2) - Individual modules and their public interfaces
- **Detailed** (Level 3) - Classes, functions, and internal dependencies

### Interacting with Diagrams

1. **Explore Components**: Click any node to select it
2. **View Files**: Selected component's files highlight in the explorer
3. **Navigate to Code**: Click a highlighted file to open it
4. **Zoom In**: Use mouse wheel or pinch gesture
5. **Pan**: Click and drag the background
6. **Reset View**: Click "Fit to View" button

## ⚙️ Configuration

Configure ArchView in Kiro IDE Settings:

### File Patterns

```json
{
  "archview.includePatterns": [
    "**/*.ts",
    "**/*.js",
    "**/*.py",
    "**/*.java",
    "**/*.go"
  ],
  "archview.excludePatterns": [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/build/**"
  ]
}
```

### Analysis Settings

```json
{
  "archview.maxFiles": 1000,
  "archview.maxDepth": 10,
  "archview.languages": [
    "typescript",
    "javascript",
    "python",
    "java",
    "go"
  ]
}
```

### AI Settings

```json
{
  "archview.aiEnabled": true
}
```

### Auto-Refresh

```json
{
  "archview.autoRefresh": false,
  "archview.autoRefreshDebounce": 10000
}
```

## 🎯 Use Cases

### Understanding New Codebases
Quickly visualize the architecture of unfamiliar projects to understand their structure and organization.

### Code Reviews
Generate diagrams to discuss architectural changes and their impact on the system.

### Documentation
Export diagrams for technical documentation, architecture decision records, and onboarding materials.

### Refactoring Planning
Visualize dependencies before refactoring to understand the scope and impact of changes.

### Team Communication
Share architectural insights with team members using visual representations.

## 🔧 Supported Languages

- **TypeScript** - Full support including interfaces, classes, and modules
- **JavaScript** - ES6 modules, classes, and functions
- **Python** - Modules, classes, and functions
- **Java** - Packages, classes, and interfaces
- **Go** - Packages, structs, and functions

## 📊 Performance

- Analyzes 1000+ file codebases in under 120 seconds
- Renders diagrams in under 60 seconds
- Memory efficient: <500MB during analysis, <200MB during rendering
- Caches results for unchanged files

## 🐛 Troubleshooting

### Diagram Not Generating

- Check that your project contains supported file types
- Verify file patterns in settings aren't excluding all files
- Check the Output panel for error messages

### Analysis Taking Too Long

- Reduce `archview.maxFiles` setting
- Add more patterns to `archview.excludePatterns`
- Ensure you're not analyzing large dependency folders

### Files Not Highlighting

- Ensure files still exist at their original paths
- Try refreshing the diagram
- Check that file paths are within the workspace

### AI Features Not Working

- Verify `archview.aiEnabled` is set to `true`
- Check Kiro AI service is available
- Extension falls back to basic analysis if AI is unavailable

## 🧪 Development & Testing

Want to test or develop the extension locally?

- **Quick Testing Guide**: [TESTING_GUIDE.md](TESTING_GUIDE.md) - Get started in 5 minutes
- **Development Guide**: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) - Full development workflow
- **Create Test Projects**: Run `./scripts/create-test-project.sh` to generate sample projects

### Quick Start for Developers

```bash
# Install dependencies
npm install

# Create test projects
./scripts/create-test-project.sh

# Run in debug mode
# Press F5 in Kiro IDE

# Or package and install
npm run package
# Then install the .vsix file in Kiro IDE
```

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for details.

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/kiro/archview)
- [Issue Tracker](https://github.com/kiro/archview/issues)
- [Changelog](CHANGELOG.md)

## 💡 Tips

- Start with Overview level for large projects
- Use auto-refresh during active development
- Export diagrams regularly for documentation
- Customize file patterns for your project structure
- Disable AI for faster analysis if semantic grouping isn't needed

## 🙏 Acknowledgments

Built with:
- [Cytoscape.js](https://js.cytoscape.org/) - Graph visualization
- [Tree-sitter](https://tree-sitter.github.io/) - Code parsing
- Kiro AI API - Architecture interpretation

## 🤖 About This Project

This entire extension was built by Kiro AI through AI-assisted development. The human developer provided:
- Initial concept and requirements
- Feature specifications and use cases
- Feedback and refinement during development

Kiro AI handled:
- Complete architecture design and implementation
- All TypeScript code generation (2000+ lines)
- Comprehensive test suite with property-based testing
- Full documentation and guides
- Build configuration and tooling setup

This project demonstrates the power of AI-assisted development for creating production-ready VS Code extensions with minimal manual coding.

---

Made with ❤️ by Kiro AI for developers who love understanding their code

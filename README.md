# ArchView - AI Architecture Diagram Extension

Automatically generate interactive architecture diagrams from your codebase using AI.

## Features

- 🔍 **Automatic Analysis**: Scans your codebase and identifies architectural components
- 🤖 **AI-Powered**: Uses AI to intelligently group and describe components
- 🎨 **Interactive Diagrams**: Pan, zoom, and explore your architecture visually
- 🔗 **IDE Integration**: Click diagram elements to highlight and navigate to source files
- 🌐 **Multi-Language**: Supports Python, JavaScript, TypeScript, Java, and Go
- 📊 **Multiple Views**: Switch between Overview, Module, and Detailed abstraction levels
- 💾 **Export**: Save diagrams as PNG or SVG for documentation

## Status

🚧 **In Development** - This extension is currently being built according to the specification in `.kiro/specs/ai-architecture-diagram-extension/`

## Development

### Setup
```bash
npm install
npm run compile
```

### Testing
```bash
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # With coverage
npm run test:property      # Property-based tests only
npm run test:performance   # Performance benchmarks
```

### Building
```bash
npm run package
```

## Architecture

See `.kiro/specs/ai-architecture-diagram-extension/design.md` for detailed architecture documentation.

## License

MIT

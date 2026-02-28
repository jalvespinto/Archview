# ArchView Configuration Guide

Complete guide to configuring ArchView for your needs.

## Accessing Settings

### Via UI
1. Open Kiro IDE Settings (`Cmd+,` / `Ctrl+,`)
2. Search for "ArchView"
3. Modify settings as needed

### Via settings.json
1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type: "Preferences: Open Settings (JSON)"
3. Add ArchView settings

## Configuration Options

### File Patterns

#### archview.includePatterns

**Type**: `string[]`  
**Default**:
```json
[
  "**/*.ts",
  "**/*.js",
  "**/*.py",
  "**/*.java",
  "**/*.go"
]
```

**Description**: Glob patterns for files to include in analysis.

**Examples**:

Include only TypeScript files:
```json
"archview.includePatterns": ["**/*.ts"]
```

Include specific directories:
```json
"archview.includePatterns": [
  "src/**/*.ts",
  "lib/**/*.js"
]
```

Include test files:
```json
"archview.includePatterns": [
  "**/*.ts",
  "**/*.test.ts",
  "**/*.spec.ts"
]
```

#### archview.excludePatterns

**Type**: `string[]`  
**Default**:
```json
[
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/__pycache__/**",
  "**/venv/**",
  "**/.venv/**",
  "**/target/**",
  "**/.idea/**",
  "**/.vscode/**"
]
```

**Description**: Glob patterns for files to exclude from analysis.

**Examples**:

Exclude test files:
```json
"archview.excludePatterns": [
  "**/node_modules/**",
  "**/*.test.ts",
  "**/*.spec.ts"
]
```

Exclude generated code:
```json
"archview.excludePatterns": [
  "**/node_modules/**",
  "**/generated/**",
  "**/*.generated.ts"
]
```

Exclude documentation:
```json
"archview.excludePatterns": [
  "**/node_modules/**",
  "**/docs/**",
  "**/*.md"
]
```

### Analysis Settings

#### archview.maxFiles

**Type**: `number`  
**Default**: `1000`  
**Range**: 1 - 10,000

**Description**: Maximum number of files to analyze.

**Examples**:

For small projects:
```json
"archview.maxFiles": 500
```

For large monorepos:
```json
"archview.maxFiles": 5000
```

**Performance Impact**:
- Higher values = longer analysis time
- Lower values = faster but may miss files
- Recommended: 1000 for most projects

#### archview.maxDepth

**Type**: `number`  
**Default**: `10`  
**Range**: 1 - 50

**Description**: Maximum directory depth to traverse.

**Examples**:

Shallow analysis:
```json
"archview.maxDepth": 5
```

Deep nested structures:
```json
"archview.maxDepth": 20
```

**Performance Impact**:
- Higher values = more directories scanned
- Lower values = faster but may miss nested files
- Recommended: 10 for most projects

#### archview.languages

**Type**: `string[]`  
**Default**: `["typescript", "javascript", "python", "java", "go"]`  
**Options**: `"typescript"`, `"javascript"`, `"python"`, `"java"`, `"go"`

**Description**: Programming languages to analyze.

**Examples**:

TypeScript/JavaScript only:
```json
"archview.languages": ["typescript", "javascript"]
```

Python projects:
```json
"archview.languages": ["python"]
```

Full-stack project:
```json
"archview.languages": ["typescript", "python", "go"]
```

**Performance Impact**:
- Fewer languages = faster analysis
- Only include languages actually used in your project

### AI Settings

#### archview.aiEnabled

**Type**: `boolean`  
**Default**: `true`

**Description**: Enable AI-powered architecture interpretation.

**When to Enable** (true):
- You want semantic component grouping
- You want meaningful component names
- You want architectural pattern detection
- You want component descriptions

**When to Disable** (false):
- Faster analysis needed
- AI service unavailable
- Simple directory-based grouping sufficient
- Privacy concerns with code analysis

**Examples**:

Enable AI (default):
```json
"archview.aiEnabled": true
```

Disable AI for speed:
```json
"archview.aiEnabled": false
```

**Behavior When Disabled**:
- Components grouped by directory structure
- Component names from directory/file names
- No semantic descriptions
- No pattern detection
- Faster analysis (30-50% faster)

### Auto-Refresh Settings

#### archview.autoRefresh

**Type**: `boolean`  
**Default**: `false`

**Description**: Automatically refresh diagram when files change.

**When to Enable** (true):
- Active development with frequent changes
- Want diagram always up-to-date
- Working on architectural refactoring
- Sufficient system resources

**When to Disable** (false):
- Large projects (performance impact)
- Infrequent changes
- Limited system resources
- Manual refresh preferred

**Examples**:

Enable auto-refresh:
```json
"archview.autoRefresh": true
```

Disable for large projects:
```json
"archview.autoRefresh": false
```

#### archview.autoRefreshDebounce

**Type**: `number`  
**Default**: `10000` (10 seconds)  
**Range**: 1,000 - 60,000 milliseconds

**Description**: Debounce time for auto-refresh (wait time after last file change).

**Examples**:

Quick refresh (5 seconds):
```json
"archview.autoRefreshDebounce": 5000
```

Slow refresh (30 seconds):
```json
"archview.autoRefreshDebounce": 30000
```

**Recommendations**:
- Small projects: 5,000 - 10,000ms
- Medium projects: 10,000 - 20,000ms
- Large projects: 20,000 - 30,000ms

## Configuration Profiles

### Profile: Small TypeScript Project

```json
{
  "archview.includePatterns": ["src/**/*.ts"],
  "archview.excludePatterns": ["**/node_modules/**", "**/dist/**"],
  "archview.maxFiles": 500,
  "archview.maxDepth": 8,
  "archview.languages": ["typescript"],
  "archview.aiEnabled": true,
  "archview.autoRefresh": true,
  "archview.autoRefreshDebounce": 5000
}
```

### Profile: Large Monorepo

```json
{
  "archview.includePatterns": [
    "packages/*/src/**/*.ts",
    "apps/*/src/**/*.ts"
  ],
  "archview.excludePatterns": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/*.test.ts"
  ],
  "archview.maxFiles": 3000,
  "archview.maxDepth": 12,
  "archview.languages": ["typescript", "javascript"],
  "archview.aiEnabled": true,
  "archview.autoRefresh": false,
  "archview.autoRefreshDebounce": 30000
}
```

### Profile: Python Data Science Project

```json
{
  "archview.includePatterns": ["**/*.py"],
  "archview.excludePatterns": [
    "**/__pycache__/**",
    "**/venv/**",
    "**/.venv/**",
    "**/notebooks/**",
    "**/*.ipynb"
  ],
  "archview.maxFiles": 800,
  "archview.maxDepth": 10,
  "archview.languages": ["python"],
  "archview.aiEnabled": true,
  "archview.autoRefresh": false,
  "archview.autoRefreshDebounce": 15000
}
```

### Profile: Multi-Language Microservices

```json
{
  "archview.includePatterns": [
    "services/**/*.ts",
    "services/**/*.py",
    "services/**/*.go"
  ],
  "archview.excludePatterns": [
    "**/node_modules/**",
    "**/vendor/**",
    "**/dist/**",
    "**/__pycache__/**"
  ],
  "archview.maxFiles": 2000,
  "archview.maxDepth": 10,
  "archview.languages": ["typescript", "python", "go"],
  "archview.aiEnabled": true,
  "archview.autoRefresh": false,
  "archview.autoRefreshDebounce": 20000
}
```

### Profile: Fast Analysis (No AI)

```json
{
  "archview.includePatterns": ["src/**/*.ts"],
  "archview.excludePatterns": ["**/node_modules/**"],
  "archview.maxFiles": 1000,
  "archview.maxDepth": 10,
  "archview.languages": ["typescript"],
  "archview.aiEnabled": false,
  "archview.autoRefresh": false,
  "archview.autoRefreshDebounce": 10000
}
```

## Performance Tuning

### For Faster Analysis

1. **Reduce file count**:
   ```json
   "archview.maxFiles": 500
   ```

2. **Exclude more directories**:
   ```json
   "archview.excludePatterns": [
     "**/node_modules/**",
     "**/dist/**",
     "**/build/**",
     "**/*.test.ts",
     "**/*.spec.ts",
     "**/docs/**"
   ]
   ```

3. **Disable AI**:
   ```json
   "archview.aiEnabled": false
   ```

4. **Limit languages**:
   ```json
   "archview.languages": ["typescript"]
   ```

### For More Complete Analysis

1. **Increase file limit**:
   ```json
   "archview.maxFiles": 3000
   ```

2. **Increase depth**:
   ```json
   "archview.maxDepth": 15
   ```

3. **Include more patterns**:
   ```json
   "archview.includePatterns": [
     "**/*.ts",
     "**/*.js",
     "**/*.tsx",
     "**/*.jsx"
   ]
   ```

4. **Enable AI**:
   ```json
   "archview.aiEnabled": true
   ```

## Workspace vs User Settings

### User Settings
- Apply to all projects
- Good for personal preferences
- Set in global settings.json

### Workspace Settings
- Apply to specific project
- Good for project-specific configuration
- Set in .vscode/settings.json

**Recommendation**: Use workspace settings for project-specific patterns and file limits.

## Troubleshooting Configuration

### Analysis Times Out

**Solution**: Reduce `maxFiles` or add more exclusion patterns

### Missing Components

**Solution**: Check `includePatterns` and increase `maxFiles` or `maxDepth`

### Too Many Components

**Solution**: Add exclusion patterns or reduce `maxDepth`

### AI Not Working

**Solution**: Verify `aiEnabled` is `true` and Kiro AI service is available

## Best Practices

1. **Start with defaults** - Only customize if needed
2. **Use workspace settings** - For project-specific configuration
3. **Exclude generated code** - Improves diagram quality
4. **Exclude tests** - Unless analyzing test architecture
5. **Disable auto-refresh** - For large projects
6. **Enable AI** - For better semantic grouping
7. **Tune for your project** - Adjust based on project size and structure

---

Need help? Check the [Troubleshooting Guide](TROUBLESHOOTING.md) or [Quick Start](QUICK_START.md).

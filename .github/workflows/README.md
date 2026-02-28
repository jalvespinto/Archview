# ArchView CI/CD Pipeline

This directory contains GitHub Actions workflows for continuous integration and deployment.

## Workflows

### 1. CI (ci.yml)

**Triggers**: Push to main/develop, Pull requests

**Jobs**:
- **Test**: Runs unit tests with coverage on Node.js 18.x and 20.x
- **Property Tests**: Runs property-based tests with 100 iterations
- **Lint**: Runs ESLint and TypeScript type checking
- **Build**: Compiles and packages the extension
- **Security**: Runs npm audit and dependency checks

**Purpose**: Ensures code quality and correctness on every commit

**Duration**: ~5-10 minutes

### 2. Performance Benchmarks (performance.yml)

**Triggers**: 
- Weekly schedule (Sundays at 00:00 UTC)
- Manual trigger
- Push to main affecting source code

**Jobs**:
- **Benchmark**: Runs performance benchmarks and tracks trends
- **Memory Profiling**: Profiles memory usage
- **Large Codebase Test**: Tests with 1000+ file repositories

**Purpose**: Tracks performance over time and catches regressions

**Duration**: ~15-20 minutes

**Performance Requirements Validated**:
- Analysis time: <120 seconds for 1000+ files
- Rendering time: <60 seconds
- Memory usage: <500MB during analysis, <200MB during rendering
- Export time: <5 seconds

### 3. Release (release.yml)

**Triggers**:
- Push tags matching `v*.*.*`
- Manual workflow dispatch

**Jobs**:
- **Pre-release Tests**: Runs full test suite including property tests
- **Build and Package**: Compiles and packages extension
- **Create GitHub Release**: Creates release with changelog and artifacts
- **Publish to Marketplace**: Publishes to Kiro marketplace (on tag push)

**Purpose**: Automates release process

**Duration**: ~10-15 minutes

## Secrets Required

Configure these secrets in GitHub repository settings:

### KIRO_MARKETPLACE_TOKEN
- **Purpose**: Authenticate with Kiro marketplace for publishing
- **How to get**: Generate from Kiro marketplace publisher dashboard
- **Scope**: Publish extensions

### CODECOV_TOKEN (optional)
- **Purpose**: Upload coverage reports to Codecov
- **How to get**: Sign up at codecov.io and link repository
- **Scope**: Upload coverage

## Branch Protection Rules

Recommended branch protection for `main`:

- ✅ Require pull request reviews (1 reviewer)
- ✅ Require status checks to pass:
  - Test (Node 18.x)
  - Test (Node 20.x)
  - Property Tests
  - Lint
  - Build
- ✅ Require branches to be up to date
- ✅ Require linear history
- ✅ Include administrators

## Property-Based Testing

Property tests run with **100 iterations** as specified in the testing strategy:

```yaml
env:
  PROPERTY_TEST_ITERATIONS: 100
```

This ensures comprehensive validation of correctness properties across diverse inputs.

## Performance Tracking

Performance benchmarks are tracked over time using `benchmark-action/github-action-benchmark`:

- Results stored in `gh-pages` branch
- Viewable at: `https://<username>.github.io/<repo>/dev/bench/`
- Alerts on >150% regression
- Comments on commits with performance changes

## Artifacts

### CI Artifacts (30 days retention)
- Extension package (.vsix)
- Property test results
- Coverage reports

### Performance Artifacts (90 days retention)
- Benchmark results (JSON)
- Memory profiles
- Large codebase reports

### Release Artifacts (90 days retention)
- Extension package (.vsix)
- Checksums (SHA256)

## Local Testing

Run the same checks locally before pushing:

```bash
# Run all tests
npm test

# Run property tests (100 iterations)
PROPERTY_TEST_ITERATIONS=100 npm run test:property

# Run linter
npm run lint

# Type check
npx tsc --noEmit

# Build extension
npm run compile
npm run package

# Run performance benchmarks
npm run test:performance
```

## Workflow Status Badges

Add these to README.md:

```markdown
[![CI](https://github.com/<username>/archview/workflows/CI/badge.svg)](https://github.com/<username>/archview/actions/workflows/ci.yml)
[![Performance](https://github.com/<username>/archview/workflows/Performance%20Benchmarks/badge.svg)](https://github.com/<username>/archview/actions/workflows/performance.yml)
[![Release](https://github.com/<username>/archview/workflows/Release/badge.svg)](https://github.com/<username>/archview/actions/workflows/release.yml)
```

## Release Process

### Automated Release (Recommended)

1. Update version in `package.json`
2. Update `CHANGELOG.md` with release notes
3. Commit changes: `git commit -am "Release v0.1.0"`
4. Create and push tag: `git tag v0.1.0 && git push origin v0.1.0`
5. GitHub Actions automatically:
   - Runs all tests
   - Builds and packages extension
   - Creates GitHub release
   - Publishes to marketplace

### Manual Release

1. Go to Actions → Release workflow
2. Click "Run workflow"
3. Enter version number (e.g., 0.1.0)
4. Click "Run workflow"
5. Monitor workflow progress
6. Manually publish to marketplace if needed

## Troubleshooting

### Tests Failing in CI but Passing Locally

**Possible causes**:
- Different Node.js versions
- Missing environment variables
- Timing issues in tests

**Solutions**:
- Run tests with same Node version as CI
- Check workflow logs for specific errors
- Add retries for flaky tests

### Property Tests Timing Out

**Possible causes**:
- 100 iterations taking too long
- Slow generators
- Resource constraints

**Solutions**:
- Optimize test generators
- Reduce complexity of test cases
- Increase timeout in workflow

### Performance Benchmarks Failing

**Possible causes**:
- Performance regression
- Different hardware in CI
- Flaky benchmarks

**Solutions**:
- Review performance changes
- Adjust alert thresholds
- Add warmup runs

### Release Workflow Not Publishing

**Possible causes**:
- Missing marketplace token
- Invalid token
- Network issues

**Solutions**:
- Verify `KIRO_MARKETPLACE_TOKEN` secret exists
- Regenerate token if expired
- Check marketplace API status

## Monitoring

### What to Monitor

1. **Test Success Rate**: Should be >99%
2. **Build Time**: Should be <10 minutes
3. **Property Test Coverage**: All 29 properties tested
4. **Performance Trends**: No significant regressions
5. **Security Alerts**: Address promptly

### Alerts

Configure GitHub notifications for:
- ❌ Failed workflows
- ⚠️ Performance regressions
- 🔒 Security vulnerabilities
- 📦 New releases

## Maintenance

### Weekly
- Review performance benchmark trends
- Check for dependency updates
- Review security audit results

### Monthly
- Update dependencies
- Review and optimize workflows
- Check artifact storage usage

### Quarterly
- Review and update CI/CD strategy
- Evaluate new GitHub Actions features
- Optimize workflow performance

## Best Practices

1. **Keep workflows fast**: Optimize for <10 minute runs
2. **Use caching**: Cache npm dependencies
3. **Fail fast**: Run quick checks first
4. **Parallel jobs**: Run independent jobs in parallel
5. **Clear naming**: Use descriptive job and step names
6. **Comprehensive logging**: Log important information
7. **Artifact cleanup**: Set appropriate retention periods
8. **Security first**: Never commit secrets, use GitHub secrets

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Node.js CI Best Practices](https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs)
- [Property-Based Testing Guide](../docs/TESTING.md)
- [Performance Benchmarking](https://github.com/benchmark-action/github-action-benchmark)

---

For questions or issues with CI/CD, open an issue with the `ci/cd` label.

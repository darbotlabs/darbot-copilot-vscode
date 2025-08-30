# Darbot Copilot VS Code Extension

Darbot Copilot is a comprehensive AI-powered coding assistant for Visual Studio Code. It's a TypeScript-based VS Code extension providing inline coding suggestions, conversational AI assistance, and autonomous agent mode for multi-step coding tasks.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Initial Setup and Installation
- Install Node.js 22.15.1 using nvm (as specified in .nvmrc): 
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  nvm install 22.15.1
  nvm use 22.15.1
  ```
- Ensure Python 3.10-3.12 is installed: `python3 --version` (required for build tools)
- Ensure Git LFS is installed: `git lfs version` (required for test artifacts)
- On Windows: Run `Set-ExecutionPolicy Unrestricted` as admin in PowerShell

### Install Dependencies and Setup
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install` -- installs dependencies in ~2 minutes. NEVER CANCEL. Set timeout to 5+ minutes.
  - Note: Playwright browser download may fail in restricted environments. Use environment variable to skip.
- `npm run get_token` -- sets up GitHub OAuth token interactively (required for API access)
  - This opens a browser for GitHub authentication. Copy the provided code and follow instructions.
  - Token is stored in .env file for development use.

### Build and Development
- `npm run compile` -- development build using esbuild, takes ~4 seconds. NEVER CANCEL.
- `npm run build` -- production build, takes ~4-5 seconds. NEVER CANCEL.  
- `npm run watch` -- starts multiple watch processes for continuous development. NEVER CANCEL.
  - Includes TypeScript watching and esbuild watching
  - Use this for active development to see changes immediately

### Code Quality and Validation
- `npm run typecheck` -- TypeScript type checking across all projects, takes ~25 seconds. NEVER CANCEL. Set timeout to 60+ minutes.
- `npm run lint` -- ESLint linting with strict rules including copyright headers, takes ~18 seconds. NEVER CANCEL. 
  - Note: Fresh clones may have missing copyright headers - this is expected
- `npm run prettier` -- code formatting with Prettier, takes ~8 seconds. NEVER CANCEL.

### Testing
- `npm run test:unit` -- runs vitest unit tests in Node.js, takes ~50 seconds. NEVER CANCEL. Set timeout to 90+ minutes.
  - Some tests may fail due to missing tool configurations in fresh environments
- `npm run test:extension` -- VS Code integration tests, requires VS Code download and GUI environment
  - Will fail in headless environments or with network restrictions - this is expected
- `npm run simulate` -- expensive LLM-based simulation tests, takes 30+ minutes. NEVER CANCEL. Set timeout to 90+ minutes.
  - Requires GitHub API access and populated cache
  - Use `npm run simulate-require-cache` to ensure cache is available
  - Use `npm run simulate-update-baseline` to update test baselines

## Running the Extension
- Open VS Code with `cmd+shift+B` (or Ctrl+Shift+B) and select build task
- Or use "Launch Copilot Extension - Watch Mode" debug configuration
- Or use "Launch Copilot Extension" debug configuration for non-watch mode
- Extension runs in both Node.js and web worker environments

## Validation Scenarios
When making changes to the extension, always validate:

### Basic Development Workflow
1. **Code builds successfully**: Run `npm run compile` and verify no errors
2. **Type checking passes**: Run `npm run typecheck` and verify no type errors  
3. **Code formatting is correct**: Run `npm run prettier` to auto-format code
4. **Unit tests pass**: Run `npm run test:unit` for core functionality validation

### Full Validation (CI-equivalent)
1. Install fresh dependencies: `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install`
2. Type check: `npm run typecheck` (~25 seconds)
3. Lint code: `npm run lint` (~18 seconds)
4. Build extension: `npm run compile` (~4 seconds)
5. Run unit tests: `npm run test:unit` (~50 seconds)
6. Optional: Run simulation tests with cache: `npm run simulate-require-cache` (if API access available)

### Extension Functionality Testing
- Load the extension in VS Code using debug configurations
- Test basic chat functionality with AI assistant
- Test inline coding suggestions and completions
- Test agent mode for multi-step tasks
- Verify tool integration (code search, file operations, terminal access)

## Project Architecture Overview

### Technology Stack
- **Core**: TypeScript/JavaScript VS Code extension
- **Build**: esbuild for fast compilation and bundling
- **Runtime**: Node.js >=22.14.0 (development), supports web workers
- **Testing**: vitest (unit), VS Code test framework (integration), custom simulation tests
- **AI Integration**: Multiple LLM providers, GitHub Copilot API integration
- **Tools**: ESLint, Prettier, TypeScript, Git LFS

### Key Directories
- `src/extension/` -- main extension code organized by feature
- `src/platform/` -- shared services (telemetry, configuration, search)
- `src/util/` -- utility code reusable across extension
- `test/` -- all test code including unit, integration, and simulation tests
- `dist/` -- compiled output (extension.js, web.js, workers, etc.)
- `.vscode/` -- VS Code workspace configuration with launch/debug settings

### Entry Points
- `src/extension/extension/vscode-node/extension.ts` -- Node.js extension host entry
- `src/extension/extension/vscode-worker/extension.ts` -- web worker extension host entry
- Main extension bundle: `dist/extension.js` (~10MB with source maps)

### Important Build Artifacts
- Extension works in both desktop VS Code and web environments
- Multiple workers: parser, tokenizer, diff, tfidf workers
- Tree-sitter WASM files for language parsing
- Simulation and test bundles for development/testing

## Common Development Issues

### Environment Issues
- **Node.js version**: Must use 22.15.1+, check with `node --version`
- **Python version**: Must be 3.10-3.12 for build tools
- **Git LFS**: Required for test artifacts, run `git lfs pull` to validate
- **Playwright**: May fail in restricted environments, skip browser downloads

### Build Issues  
- **Watch mode not updating**: Restart watch tasks if file changes aren't detected
- **Large bundle sizes**: Extension bundles are intentionally large (~10MB) for rich functionality
- **Missing dependencies**: Run `npm install` again if esbuild fails

### Test Issues
- **Unit test failures**: Tool configuration mismatches are common in fresh environments
- **Extension test failures**: Require VS Code GUI environment and network access
- **Simulation test failures**: Need GitHub API access and populated cache layers

### Performance Notes
- **Build time**: Very fast (~4 seconds) thanks to esbuild
- **Test time**: Unit tests ~50 seconds, simulation tests 30+ minutes
- **Development workflow**: Use watch mode for immediate feedback during development

## CI/CD Integration
The project uses GitHub Actions with:
- Linux and Windows testing environments
- Build caching for improved performance
- Telemetry validation
- Comprehensive test suites including simulation tests
- Strict linting and formatting requirements

Always run the full validation workflow before submitting changes to match CI requirements.
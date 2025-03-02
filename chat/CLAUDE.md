# CLAUDE.md - Project Guide

## Commands
- Test build: `npm run build` (for testing only, not website building)
- Test all: `npm run test`
- Specific tests: `npm run test-proxy`, `npm run test-ice`, `npm run test-relays`
- Local development: `npx http-server` (simple static file serving)

## Code Style Guidelines
- Use ES Modules format (import/export)
- TypeScript definitions (.d.ts) for all public APIs
- Naming: camelCase for variables/functions, PascalCase for classes/components
- Prefer arrow functions and const/let over var
- Follow Web Component standards for custom elements
- Prioritize serverless architecture - components should work with static file hosting only
- Keep components small, focused and composable
- Document component API with JSDoc comments
- Use standardized error handling patterns

## Development Workflow
- Create standalone components that work without backend dependencies
- Implement proper keyboard accessibility and ARIA attributes
- Test components in isolation before integration
- Ensure all components are responsive by default
- Add TypeScript definitions for public component APIs
<!--
Sync Impact Report for Constitution Update
Version change: 1.0.0 → 2.0.0
List of modified principles: Removed Test-First Implementation
Added sections: None
Removed sections: None
Templates requiring updates: None
Follow-up TODOs: None
-->

# macOS Finder Clone Constitution

## Core Principles

### I. Event-Driven Architecture
The application uses an event-driven architecture for component communication and file system operations. All UI interactions trigger events that are consumed by appropriate services, ensuring loose coupling and testability. File operations publish events for desktop integration while maintaining browser compatibility.

### II. Component-Based UI
UI is built using Web Components with Shadow DOM encapsulation. Each component is self-contained, independently testable, and reusable across the application. Components follow modern JavaScript practices with ES6+ features and responsive design principles.

### III. Multi-Filesystem Support
Support multiple filesystem implementations (LightningFS for persistence, mock for testing, git integration for version control). Factory pattern used for service creation with graceful fallbacks. Enables running in browser, desktop environment, or with database integration.

### IV. Accessibility and Performance
Application MUST be keyboard accessible, mobile responsive, and performant. Virtual scrolling for large directories, lazy loading, and debounced operations required. Cross-platform compatibility maintained with touch support and adaptive interactions.

## Technology Stack

Primary technologies: JavaScript ES6+, Web Components, LightningFS, isomorphic-git. Dependencies loaded dynamically via ES modules. No build tools required - runs directly in browser. Supports integration with desktop environment and database systems.

## Development Workflow

Features planned via plan.md with phased implementation approach. Setup phase establishes project structure, foundational phase creates core infrastructure, then incremental user story delivery. Each story independently testable and deployable. Code reviews verify constitution compliance.

## Governance

Constitution supersedes all other practices; Amendments require documentation in plan.md and approval; All PRs/reviews must verify compliance; Complexity must be justified; Use CLAUDE.md and plan.md for runtime development guidance.

**Version**: 2.0.0 | **Ratified**: 2025-10-11 | **Last Amended**: 2025-10-11
# Documentation Index

Welcome to the Pomo documentation! This directory contains all project documentation organized by topic.

## 📚 Quick Navigation

### 🚀 Getting Started

- **[Development Setup](./setup/development.md)** - Complete guide for local development environment
- **[Production Setup](./setup/production.md)** - Deploy to Vercel with Convex and Clerk

### 🧪 Testing

- **[Testing Guide](./testing/guide.md)** - Unit tests, E2E tests, and testing strategies

### 🏗️ Architecture & Design

- **[Architecture](../ARCHITECTURE.md)** - System design, data model, and technical decisions
- **[Convex Backend](../convex/README.md)** - Backend API reference and schema documentation
- **[AI Context](../AI_CONTEXT.md)** - Instructions for AI agents working on the codebase

### 🔧 Platform-Specific Guides

- **[Convex + Vercel Setup](./platform/CONVEX_VERCEL_SETUP.md)** - Integration guide
- **[PWA Setup](./platform/PWA_SETUP.md)** - Progressive Web App configuration
- **[Push Notifications](./platform/PUSH_NOTIFICATION_RECOMMENDATIONS.md)** - Notification setup recommendations
- **[Optimization Guide](./platform/OPTIMIZATION_GUIDE.md)** - Performance optimization tips
- **[Packaging](./platform/PACKAGING.md)** - Desktop app packaging with Tauri
- **[Distribution](./platform/DISTRIBUTION.md)** - App distribution strategies

---

## 🎯 Documentation by Task

### "I want to..."

#### Set up my development environment

→ [Development Setup](./setup/development.md)

#### Deploy to production

→ [Production Setup](./setup/production.md)

#### Understand the codebase architecture

→ [Architecture](../ARCHITECTURE.md)

#### Write tests

→ [Testing Guide](./testing/guide.md)

#### Work with the Convex backend

→ [Convex Backend](../convex/README.md)

#### Build a desktop app

→ [Packaging](./platform/PACKAGING.md)

#### Optimize performance

→ [Optimization Guide](./platform/OPTIMIZATION_GUIDE.md)

#### Set up push notifications

→ [Push Notifications](./platform/PUSH_NOTIFICATION_RECOMMENDATIONS.md)

#### Configure as PWA

→ [PWA Setup](./platform/PWA_SETUP.md)

---

## 📖 Documentation Standards

### For Contributors

When updating documentation:

1. **Keep docs close to code** - Update docs when you change code
2. **Link related docs** - Help readers find what they need
3. **Use examples** - Show, don't just tell
4. **Test instructions** - Verify steps work before documenting

### For AI Agents

See [AI_CONTEXT.md](../AI_CONTEXT.md) for:

- Documentation update triggers
- File header standards
- Maintenance protocols

---

## 🗂️ Documentation Structure

```
docs/
├── README.md              # This file - navigation hub
├── setup/
│   ├── development.md     # Local development setup
│   └── production.md      # Production deployment
├── testing/
│   └── guide.md          # Testing strategies and examples
└── platform/
    ├── CONVEX_VERCEL_SETUP.md
    ├── PWA_SETUP.md
    ├── PUSH_NOTIFICATION_RECOMMENDATIONS.md
    ├── OPTIMIZATION_GUIDE.md
    ├── PACKAGING.md
    └── DISTRIBUTION.md
```

---

## 🔄 Recently Updated

Check git history for recent doc changes:

```bash
git log --oneline -- docs/
```

---

## 💡 Need Help?

- **Can't find something?** - Use GitHub search or `grep` through docs
- **Documentation outdated?** - Open an issue or PR
- **Questions?** - Check [GitHub Discussions](https://github.com/your-username/pomo/discussions)

---

## 🤝 Contributing to Docs

Improvements welcome! When adding documentation:

1. Place it in the appropriate subdirectory
2. Update this README's navigation
3. Link to/from related docs
4. Follow existing formatting style
5. Test all commands and examples

See [CONTRIBUTING.md](../CONTRIBUTING.md) for more details.

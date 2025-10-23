---
description: Plan and implement a new feature
---

Help me plan and implement a new feature:

**Planning Phase:**

1. Understand the feature requirements (ask clarifying questions)
2. Identify affected files:
   - Frontend components (`app/`, `components/`)
   - Backend functions (`convex/`)
   - Database schema (`convex/schema.ts`)
   - Types (`types/`)
3. Check existing patterns in codebase
4. Plan implementation approach
5. Identify potential edge cases
6. Consider offline behavior (if applicable)

**Implementation Phase:**

1. Create/modify files following existing patterns
2. Use proper authentication checks
3. Add indexes for new queries
4. Handle errors gracefully
5. Test manually in browser
6. Write tests (if complex logic)

**Documentation Phase:**

1. Add @fileoverview headers to new files
2. Update relevant documentation:
   - `README.md` (if user-facing feature)
   - `ARCHITECTURE.md` (if architecture changed)
   - `convex/` docs (if backend changed)
3. Update TodoWrite with completion status

Guide me through this process step-by-step, asking for approval before implementing.

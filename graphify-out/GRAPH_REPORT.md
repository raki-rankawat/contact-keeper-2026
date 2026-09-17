# Graph Report - .  (2026-09-18)

## Corpus Check
- Corpus is ~21,175 words - fits in a single context window. You may not need a graph.

## Summary
- 292 nodes · 458 edges · 15 communities
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 40 edges (avg confidence: 0.86)
- Token cost: 4,200 input · 1,900 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Auth & Platform Specs|Auth & Platform Specs]]
- [[_COMMUNITY_Auth & User Backend|Auth & User Backend]]
- [[_COMMUNITY_Conventions & Bug Specs|Conventions & Bug Specs]]
- [[_COMMUNITY_Client Package Manifest|Client Package Manifest]]
- [[_COMMUNITY_Server Package Manifest|Server Package Manifest]]
- [[_COMMUNITY_Context Hooks & Pages|Context Hooks & Pages]]
- [[_COMMUNITY_Reducers & Token Storage|Reducers & Token Storage]]
- [[_COMMUNITY_Contacts UI Components|Contacts UI Components]]
- [[_COMMUNITY_Contacts API Layer|Contacts API Layer]]
- [[_COMMUNITY_Server Bootstrap & Config|Server Bootstrap & Config]]
- [[_COMMUNITY_Phase 8 Product Features|Phase 8 Product Features]]
- [[_COMMUNITY_Social Icon Sprite|Social Icon Sprite]]
- [[_COMMUNITY_Favicon Brand Artwork|Favicon Brand Artwork]]

## God Nodes (most connected - your core abstractions)
1. `CLAUDE.md Project Guide` - 22 edges
2. `Contact Keeper 2026 README` - 21 edges
3. `useContacts()` - 12 edges
4. `Implementation Plan (44 items, 9 phases)` - 12 edges
5. `useAuth()` - 11 edges
6. `Phase 8 — Product features` - 11 edges
7. `A2 — Refresh tokens with rotation and reuse detection` - 10 edges
8. `A1 — Authorization: Bearer and flat sub claim` - 9 edges
9. `F3 — Pagination and sorting` - 9 edges
10. `Phase 2 — Correctness bugs` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Client State: Context + useReducer providers own the API calls` --conceptually_related_to--> `Vite SPA Shell (#root + /src/main.jsx)`  [INFERRED]
  CLAUDE.md → client/index.html
- `No Attribution Trailers Rule` --conceptually_related_to--> `CLAUDE.md Project Guide`  [INFERRED]
  .claude/skills/commit-msg/SKILL.md → CLAUDE.md
- `D3 — No JSON 404 handler for unmatched routes` --conceptually_related_to--> `No try/catch in Controllers`  [INFERRED]
  features/03-design-and-performance.md → CLAUDE.md
- `F2 — Search and filter` --conceptually_related_to--> `Store Inputs, Derive Outputs`  [INFERRED]
  features/06-contacts-features.md → CLAUDE.md
- `C3 — PUT cannot perform a partial update` --references--> `Edit Mode by Form Remount (key = current._id)`  [INFERRED]
  features/01-correctness-bugs.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Phase 4 breaking changes must land with matching client edits** — features_00_implementation_plan_phase_4, features_05_auth_features_a1, features_07_api_platform_p5, features_07_api_platform_p7, features_03_design_and_performance_d2, claude_client_context_state [EXTRACTED 1.00]
- **Defenses against user/resource enumeration oracles** — features_02_security_hardening_s3, features_03_design_and_performance_d2, features_05_auth_features_a5, features_06_contacts_features_f1 [INFERRED 0.85]
- **Per-user ownership enforcement across every contact write path** — claude_per_user_ownership_guard, features_03_design_and_performance_d2, features_06_contacts_features_f1, features_06_contacts_features_f8, features_06_contacts_features_f5, features_04_tooling_t1 [INFERRED 0.85]
- **Masked Glow Composition Pipeline** — public_favicon_bolt_fill_path, public_favicon_bolt_mask_path, public_favicon_blurred_ellipse_layer, public_favicon_gaussian_blur_gradient_technique [EXTRACTED 1.00]
- **Flat #08060d Brand Glyph Set (Bluesky, Discord, GitHub, X)** — public_icons_bluesky_icon, public_icons_discord_icon, public_icons_github_icon, public_icons_x_icon [EXTRACTED 1.00]
- **All Six Symbols Composing the Single-File Sprite** — public_icons_bluesky_icon, public_icons_discord_icon, public_icons_documentation_icon, public_icons_github_icon, public_icons_social_icon, public_icons_x_icon, public_icons_sprite_symbol_pattern [EXTRACTED 1.00]
- **Client loading-state UX: one shared spinner asset gates both auth and contacts rendering** — layout_spinner_gif, layout_spinner_spinner, routes_privateroute_privateroute, contacts_contacts, layout_spinner_loading_indicator [INFERRED 0.85]

## Communities (15 total, 0 thin omitted)

### Community 0 - "Auth & Platform Specs"
Cohesion: 0.10
Nodes (43): JWT Auth Flow (x-auth-token, nested user.id payload), Client State: Context + useReducer providers own the API calls, No try/catch in Controllers, Three-Step Per-User Ownership Guard, app.js / server.js Split, Implementation Plan (44 items, 9 phases), Phase 1 — Safety net (tests + shutdown), Phase 3 — Security baseline (+35 more)

### Community 1 - "Auth & User Backend"
Cohesion: 0.07
Nodes (26): bcrypt, generateToken, getLoggedInUser(), login(), User, bcrypt, generateToken, register() (+18 more)

### Community 2 - "Conventions & Bug Specs"
Cohesion: 0.12
Nodes (28): Edit Mode by Form Remount (key = current._id), Strict Layering: routes validate, controllers decide, models persist, CommonJS Backend vs ESM Client, CLAUDE.md Project Guide, Store Inputs, Derive Outputs, Style Conventions: no semicolons, single quotes, no formatter, Vite SPA Shell (#root + /src/main.jsx), commit-msg Skill (+20 more)

### Community 3 - "Client Package Manifest"
Cohesion: 0.07
Nodes (27): dependencies, axios, react, react-dom, react-icons, react-router-dom, react-transition-group, uuid (+19 more)

### Community 4 - "Server Package Manifest"
Cohesion: 0.07
Nodes (26): author, dependencies, bcryptjs, dotenv, express, express-validator, jsonwebtoken, mongoose (+18 more)

### Community 5 - "Context Hooks & Pages"
Cohesion: 0.15
Nodes (10): AlertContext, useAlert(), AuthContext, useAuth(), emptyUser, Login(), emptyUser, Register() (+2 more)

### Community 6 - "Reducers & Token Storage"
Cohesion: 0.12
Nodes (7): initialState, clearToken(), config, initialState, saveToken(), initialState, setAuthToken()

### Community 7 - "Contacts UI Components"
Cohesion: 0.18
Nodes (12): ContactContext, useContacts(), ContactFilter(), ContactForm(), emptyContact, ContactItem(), Contacts(), Spinner Loading Animation (spinner.gif) (+4 more)

### Community 8 - "Contacts API Layer"
Cohesion: 0.13
Nodes (15): addContact(), Contact, deleteContact(), getContacts(), updateContact(), jwt, ContactSchema, mongoose (+7 more)

### Community 9 - "Server Bootstrap & Config"
Cohesion: 0.13
Nodes (8): mongoose, required, app, connectDB, errorHandler, express, path, validateEnv

### Community 10 - "Phase 8 Product Features"
Cohesion: 0.27
Nodes (11): Phase 8 — Product features, C5 — Mass assignment in addContact, A5 — Password reset, A6 — Email verification, Shared Email Provider Prerequisite, Explicitly Not Recommended Yet (OAuth, 2FA, RBAC), F5 — CSV import and export, F6 — Favourites (+3 more)

### Community 11 - "Social Icon Sprite"
Cohesion: 0.29
Nodes (11): Icon Sprite Sheet (icons.svg), Bluesky Clip Path Definition, Bluesky Brand Glyph, Discord Brand Glyph, Documentation Outline Icon, GitHub Brand Glyph, Purple #aa3bff Stroke Accent Token, Social/Community Outline Icon (+3 more)

### Community 12 - "Favicon Brand Artwork"
Cohesion: 0.43
Nodes (7): Contact Keeper Favicon (Violet Bolt Glyph), Blurred Ellipse Glow Layer, Visible Bolt Fill Path, Bolt Silhouette Mask (mask id=a), Violet-Lavender-Cyan Brand Palette, Display-P3 Progressive Color Fallback, Masked Gaussian-Blur Faux-Gradient Technique

## Ambiguous Edges - Review These
- `Icon Sprite Sheet (icons.svg)` → `Unreferenced Starter Template Asset`  [AMBIGUOUS]
  client/public/icons.svg · relation: conceptually_related_to
- `Social/Community Outline Icon` → `Unreferenced Starter Template Asset`  [AMBIGUOUS]
  client/public/icons.svg · relation: conceptually_related_to

## Knowledge Gaps
- **103 isolated node(s):** `initialState`, `AlertContext`, `initialState`, `config`, `AuthContext` (+98 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Icon Sprite Sheet (icons.svg)` and `Unreferenced Starter Template Asset`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Social/Community Outline Icon` and `Unreferenced Starter Template Asset`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `CLAUDE.md Project Guide` connect `Conventions & Bug Specs` to `Auth & Platform Specs`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `Contact Keeper 2026 README` connect `Auth & Platform Specs` to `Conventions & Bug Specs`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `Implementation Plan (44 items, 9 phases)` connect `Auth & Platform Specs` to `Conventions & Bug Specs`, `Phase 8 Product Features`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `initialState`, `AlertContext`, `initialState` to the rest of the system?**
  _104 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auth & Platform Specs` be split into smaller, more focused modules?**
  _Cohesion score 0.09745293466223699 - nodes in this community are weakly interconnected._
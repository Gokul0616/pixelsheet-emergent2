# Replit.md - PixelSheet

## Overview

PixelSheet is a comprehensive Google Sheets clone built with modern web technologies. The application features a full-stack architecture with real-time collaboration capabilities, advanced spreadsheet functionality, and a polished user interface that closely mimics Google Sheets. 

### Recent Updates (January 2025)
- ✓ Implemented comprehensive FormattingToolbar with bold, italic, underline, font selection, colors, and alignment
- ✓ Added real-time WebSocket collaboration with live user presence indicators
- ✓ Created ShareDialog component for managing spreadsheet permissions and collaborators
- ✓ Integrated online/offline status indicators and connection management
- ✓ Enhanced UI with live collaboration features similar to Google Sheets
- ✓ Successfully migrated from Replit Agent to Replit environment (July 2025)
- ✓ Fixed authentication token handling and API integration (July 2025)
- ✓ Fixed cell value display and editing functionality with proper API integration
- ✓ Fixed "sheet not found" error by auto-creating default Sheet1 when spreadsheets are created or accessed
- ✓ Renamed application from "Ultimate Pixel Sheets" to "PixelSheet" throughout the application
- ✓ Implemented advanced features: Data validation, conditional formatting, pivot tables
- ✓ Added column/row resizing with drag borders and auto-fit functionality
- ✓ Enhanced import/export capabilities with multiple formats (Excel, PDF, JSON)
- ✓ Improved scroll behavior and virtual grid performance
- ✓ Added smart fill with pattern detection and auto-suggestions

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI primitives with custom styling
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query for server state, React hooks for local state
- **Routing**: Wouter for lightweight client-side routing

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API Pattern**: RESTful API with JSON responses

### Key Components

1. **Spreadsheet Grid System**
   - Virtual scrolling for performance with large datasets
   - Cell-based editing with formula support
   - Context menus for cell operations
   - Real-time cell selection and highlighting

2. **Formula Engine**
   - Custom formula parser and evaluator
   - Support for basic arithmetic, functions (SUM, AVERAGE, COUNT, etc.)
   - Cell reference resolution (A1, B2, etc.)
   - Error handling for invalid formulas

3. **UI Components**
   - Comprehensive component library based on Radix UI
   - Consistent styling with CSS variables
   - Responsive design with mobile considerations
   - Accessibility features built-in

4. **Collaboration Features**
   - Real-time updates using optimistic updates
   - Activity tracking and history
   - User presence indicators
   - Comment system for cells

## Data Flow

1. **Client-Server Communication**
   - RESTful API endpoints for CRUD operations
   - Optimistic updates for better UX
   - Error handling with toast notifications
   - Query invalidation for cache management

2. **Data Storage**
   - Normalized database schema with separate tables for spreadsheets, sheets, cells, comments, activities, and collaborators
   - JSON fields for complex data (formatting, share settings)
   - Timestamps for audit trails

3. **State Management**
   - Server state managed by TanStack Query
   - Local UI state using React hooks
   - Shared state between components via context

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database queries
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI components
- **tailwindcss**: Utility-first CSS framework

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking
- **esbuild**: Fast bundling for production

## Deployment Strategy

### Build Process
1. **Development**: `npm run dev` - Runs both frontend and backend in development mode
2. **Production Build**: `npm run build` - Builds both frontend (Vite) and backend (esbuild)
3. **Production Start**: `npm start` - Serves the production build

### Environment Setup
- **DATABASE_URL**: PostgreSQL connection string (required)
- **NODE_ENV**: Environment mode (development/production)
- **PORT**: Server port (defaults to 8000)

### Database Management
- **Schema**: Defined in `shared/schema.ts` using Drizzle
- **Migrations**: Generated in `migrations/` directory
- **Push**: `npm run db:push` - Pushes schema changes to database

### File Structure
```
├── client/          # Frontend React application
├── server/          # Backend Express application
├── shared/          # Shared types and schemas
├── backend/         # Alternative Python backend (Flask)
├── migrations/      # Database migrations
└── dist/           # Production build output
```

The application follows a monorepo structure with clear separation between frontend, backend, and shared code, enabling efficient development and deployment workflows.
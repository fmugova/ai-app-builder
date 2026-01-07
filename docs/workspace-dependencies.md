# Workspace Feature - Package Dependencies

## Required NPM Packages

The workspace feature requires the following packages. Most should already be installed in your project:

### Core Dependencies

```bash
npm install @radix-ui/react-avatar
npm install @radix-ui/react-tabs
npm install date-fns
```

Or with pnpm:
```bash
pnpm add @radix-ui/react-avatar @radix-ui/react-tabs date-fns
```

Or with yarn:
```bash
yarn add @radix-ui/react-avatar @radix-ui/react-tabs date-fns
```

### Already Required (should be in your project)

These packages are likely already installed:
- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-select`
- `@radix-ui/react-alert-dialog`
- `next-auth`
- `@prisma/client`
- `prisma`
- `zod`
- `lucide-react`

## Package Verification

Check your `package.json` to ensure you have:

```json
{
  "dependencies": {
    "@prisma/client": "^5.x.x",
    "@radix-ui/react-alert-dialog": "^1.0.x",
    "@radix-ui/react-avatar": "^1.0.x",
    "@radix-ui/react-dialog": "^1.0.x",
    "@radix-ui/react-dropdown-menu": "^2.0.x",
    "@radix-ui/react-select": "^2.0.x",
    "@radix-ui/react-tabs": "^1.0.x",
    "date-fns": "^3.x.x",
    "lucide-react": "^0.x.x",
    "next": "14.x.x",
    "next-auth": "^4.x.x",
    "zod": "^3.x.x"
  },
  "devDependencies": {
    "prisma": "^5.x.x"
  }
}
```

## Installation Command (All at Once)

If you need to install all potentially missing packages:

```bash
npm install @radix-ui/react-avatar @radix-ui/react-tabs date-fns
```

## After Installation

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Verify no TypeScript errors:
   ```bash
   npm run type-check
   # or
   npx tsc --noEmit
   ```

## Potential Issues

### Module Not Found Errors

If you see errors like "Cannot find module '@radix-ui/react-avatar'":
1. Make sure the package is installed: `npm list @radix-ui/react-avatar`
2. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
3. Clear Next.js cache: `rm -rf .next`

### Type Errors

If you encounter TypeScript errors:
1. Ensure `@types/node` is installed
2. Run `npm install --save-dev @types/react @types/react-dom`
3. Restart your IDE/editor

### Prisma Client Issues

If Prisma client is not recognizing new models:
1. Run `npx prisma generate`
2. Restart your development server
3. Clear TypeScript cache in your IDE

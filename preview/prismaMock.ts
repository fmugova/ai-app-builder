/**
 * preview/prismaMock.ts
 * Returns the source string for a mock lib/prisma.ts that preserves
 * the standard Prisma export shape expected by generated apps.
 */

export function generatePrismaMock(): string {
  return `// Auto-generated Prisma mock for Fast Preview (WebContainer)
// Real DB calls return empty/stub data so the app renders without crashing.
const noop = () => Promise.resolve(null);
const noopMany = () => Promise.resolve([]);
const counter = () => Promise.resolve(0);

const handler: ProxyHandler<object> = {
  get(_target, prop) {
    if (prop === '$connect' || prop === '$disconnect') return noop;
    if (prop === '$transaction') return (fn: Function) => fn(proxy);
    if (prop === '$queryRaw' || prop === '$executeRaw') return noopMany;
    // Model proxy
    return new Proxy({}, {
      get(_t, method) {
        if (method === 'findMany') return noopMany;
        if (method === 'count') return counter;
        return noop;
      },
    });
  },
};

const proxy = new Proxy({}, handler);

/** Mocked PrismaClient — all model calls return null / [] */
export const prisma = proxy as any;
export default prisma;

/** Compatibility export used by some generated apps */
export const slowQueryCounter = { count: 0 };
`;
}

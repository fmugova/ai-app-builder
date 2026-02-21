/**
 * preview/prismaMock.ts
 * Returns the source string for a mock lib/prisma.ts that exactly matches
 * the real lib/prisma.ts export surface expected by generated apps:
 *   - export class PrismaClient (Proxy-based, all model/method calls stubbed)
 *   - export const prisma
 *   - export const slowQueryCounter  { count, critical, lastSeen }
 *   - export const SLOW_QUERY_THRESHOLD_MS
 *   - export default prisma
 */

export function prismaMockModule(): string {
  return `// Auto-generated Prisma mock for Fast Preview (WebContainer)
// Real DB calls return empty / stub data so the app renders without crashing.
// Matches the export surface of lib/prisma.ts exactly.

export const SLOW_QUERY_THRESHOLD_MS = 500;

export const slowQueryCounter = {
  count: 0,
  critical: 0,
  lastSeen: null as Date | null,
};

// Per-model in-memory stores ─ populated by $transaction-level inserts in tests
const stores: Record<string, Record<string, any>[]> = {};
function getStore(model: string): Record<string, any>[] {
  stores[model] = stores[model] ?? [];
  return stores[model];
}

function makeModel(name: string) {
  return {
    findMany:   (_args?: any) => Promise.resolve([]),
    findFirst:  (_args?: any) => Promise.resolve(null),
    findUnique: (_args?: any) => Promise.resolve(null),
    create:     (args: any)   => {
      const row = { id: Math.random().toString(36).slice(2), ...args?.data };
      getStore(name).push(row);
      return Promise.resolve(row);
    },
    createMany: (_args?: any) => Promise.resolve({ count: 0 }),
    update:     (args: any)   => Promise.resolve({ id: '', ...args?.data }),
    updateMany: (_args?: any) => Promise.resolve({ count: 0 }),
    upsert:     (args: any)   => Promise.resolve({ id: '', ...args?.create }),
    delete:     (_args?: any) => Promise.resolve(null),
    deleteMany: (_args?: any) => Promise.resolve({ count: 0 }),
    count:      (_args?: any) => Promise.resolve(0),
    aggregate:  (_args?: any) => Promise.resolve({}),
    groupBy:    (_args?: any) => Promise.resolve([]),
  };
}

export class PrismaClient {
  private _models: Record<string, ReturnType<typeof makeModel>> = {};

  private _model(name: string) {
    this._models[name] = this._models[name] ?? makeModel(name);
    return this._models[name];
  }

  $connect()    { return Promise.resolve(); }
  $disconnect() { return Promise.resolve(); }
  $queryRaw(_query: any, ..._values: any[]) { return Promise.resolve([]); }
  $executeRaw(_query: any, ..._values: any[]) { return Promise.resolve(0); }
  $transaction(fnOrQueries: any) {
    if (typeof fnOrQueries === 'function') return fnOrQueries(this);
    return Promise.all(fnOrQueries);
  }
  $on(_event: string, _listener: (...args: any[]) => void) { /* noop */ }

  // Model accessors — covers the most common Prisma model names generated apps use
  get user()               { return this._model('user'); }
  get project()            { return this._model('project'); }
  get projectFile()        { return this._model('projectFile'); }
  get page()               { return this._model('page'); }
  get session()            { return this._model('session'); }
  get account()            { return this._model('account'); }
  get subscription()       { return this._model('subscription'); }
  get post()               { return this._model('post'); }
  get comment()            { return this._model('comment'); }
  get product()            { return this._model('product'); }
  get order()              { return this._model('order'); }
  get orderItem()          { return this._model('orderItem'); }
  get category()           { return this._model('category'); }
  get tag()                { return this._model('tag'); }
  get media()              { return this._model('media'); }
  get notification()       { return this._model('notification'); }
  get message()            { return this._model('message'); }
  get conversation()       { return this._model('conversation'); }
  get setting()            { return this._model('setting'); }
  get environmentVariable(){ return this._model('environmentVariable'); }
}

// Proxy to catch any model accessor not listed above
const clientProxy = new Proxy(new PrismaClient(), {
  get(target, prop) {
    const val = Reflect.get(target, prop);
    if (val !== undefined) return val;
    // Unknown model — return a fresh stub
    if (typeof prop === 'string' && !prop.startsWith('_') && !prop.startsWith('$')) {
      return makeModel(prop);
    }
    return val;
  },
});

export const prisma = clientProxy as unknown as PrismaClient;
export default prisma;
`;
}

/** @deprecated Use prismaMockModule() — kept for backwards compat */
export function generatePrismaMock(): string {
  return prismaMockModule();
}

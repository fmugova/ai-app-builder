// lib/api-test-cases.ts
// Common API test cases for validating generated endpoints

export interface ApiTestCase {
  id: string
  name: string
  description: string
  method: string
  path: string
  requiresAuth: boolean
  usesDatabase: boolean
  databaseTable?: string
  expectedFeatures: string[]
  testScenarios: {
    scenario: string
    expectedBehavior: string
  }[]
}

/**
 * 10 Common API Use Cases for Testing Generation
 */
export const API_TEST_CASES: ApiTestCase[] = [
  {
    id: 'user-registration',
    name: 'User Registration',
    description: 'Create a new user account with email, password, and name. Validate inputs, hash password, and save to database.',
    method: 'POST',
    path: '/api/auth/register',
    requiresAuth: false,
    usesDatabase: true,
    databaseTable: 'User',
    expectedFeatures: [
      'Email validation',
      'Password hashing (bcrypt)',
      'Duplicate email check',
      'Zod schema validation',
      'Error handling for database errors',
      'Success response with user data (without password)',
      'HTTP 201 on success',
      'HTTP 400 for validation errors',
      'HTTP 409 for duplicate email'
    ],
    testScenarios: [
      {
        scenario: 'Valid registration data',
        expectedBehavior: 'Creates user and returns 201 with user object'
      },
      {
        scenario: 'Invalid email format',
        expectedBehavior: 'Returns 400 with validation error'
      },
      {
        scenario: 'Duplicate email',
        expectedBehavior: 'Returns 409 conflict error'
      },
      {
        scenario: 'Weak password',
        expectedBehavior: 'Returns 400 with password requirements'
      }
    ]
  },

  {
    id: 'get-user-profile',
    name: 'Get User Profile',
    description: 'Fetch authenticated user profile data from database',
    method: 'GET',
    path: '/api/user/profile',
    requiresAuth: true,
    usesDatabase: true,
    databaseTable: 'User',
    expectedFeatures: [
      'Session validation',
      'Database query for user data',
      'Exclude sensitive fields (password)',
      'HTTP 401 for unauthenticated',
      'HTTP 404 if user not found',
      'HTTP 200 with user data'
    ],
    testScenarios: [
      {
        scenario: 'Authenticated user',
        expectedBehavior: 'Returns 200 with user profile'
      },
      {
        scenario: 'No session',
        expectedBehavior: 'Returns 401 unauthorized'
      },
      {
        scenario: 'User deleted',
        expectedBehavior: 'Returns 404 not found'
      }
    ]
  },

  {
    id: 'create-blog-post',
    name: 'Create Blog Post',
    description: 'Create a new blog post with title, content, and tags. Requires authentication and saves to database.',
    method: 'POST',
    path: '/api/posts',
    requiresAuth: true,
    usesDatabase: true,
    databaseTable: 'Post',
    expectedFeatures: [
      'Authentication check',
      'Input validation (title, content required)',
      'Slug generation from title',
      'Author association with current user',
      'Tags handling',
      'HTTP 201 on success',
      'HTTP 401 for unauthenticated',
      'HTTP 400 for invalid data'
    ],
    testScenarios: [
      {
        scenario: 'Authenticated user with valid data',
        expectedBehavior: 'Creates post and returns 201'
      },
      {
        scenario: 'Missing required fields',
        expectedBehavior: 'Returns 400 validation error'
      },
      {
        scenario: 'Unauthenticated request',
        expectedBehavior: 'Returns 401 unauthorized'
      }
    ]
  },

  {
    id: 'list-with-pagination',
    name: 'List Items with Pagination',
    description: 'Get paginated list of items with filtering and sorting options',
    method: 'GET',
    path: '/api/items',
    requiresAuth: false,
    usesDatabase: true,
    databaseTable: 'Item',
    expectedFeatures: [
      'Pagination (page, limit query params)',
      'Filtering by status or category',
      'Sorting (createdAt desc by default)',
      'Total count in response',
      'Validation of query parameters',
      'HTTP 200 with data array',
      'HTTP 400 for invalid params'
    ],
    testScenarios: [
      {
        scenario: 'Valid pagination params',
        expectedBehavior: 'Returns paginated results'
      },
      {
        scenario: 'Invalid page number',
        expectedBehavior: 'Returns 400 or defaults to page 1'
      },
      {
        scenario: 'Filtering by status',
        expectedBehavior: 'Returns only matching items'
      }
    ]
  },

  {
    id: 'update-resource',
    name: 'Update Resource',
    description: 'Update an existing resource by ID. Requires authentication and ownership check.',
    method: 'PUT',
    path: '/api/resources/:id',
    requiresAuth: true,
    usesDatabase: true,
    databaseTable: 'Resource',
    expectedFeatures: [
      'Authentication check',
      'Resource existence check',
      'Ownership verification',
      'Partial update support',
      'Input validation',
      'HTTP 200 on success',
      'HTTP 401 for unauthenticated',
      'HTTP 403 for unauthorized (not owner)',
      'HTTP 404 if resource not found'
    ],
    testScenarios: [
      {
        scenario: 'Owner updates own resource',
        expectedBehavior: 'Updates and returns 200'
      },
      {
        scenario: 'User tries to update others resource',
        expectedBehavior: 'Returns 403 forbidden'
      },
      {
        scenario: 'Resource does not exist',
        expectedBehavior: 'Returns 404 not found'
      }
    ]
  },

  {
    id: 'delete-resource',
    name: 'Delete Resource',
    description: 'Delete a resource by ID with authentication and permission checks',
    method: 'DELETE',
    path: '/api/resources/:id',
    requiresAuth: true,
    usesDatabase: true,
    databaseTable: 'Resource',
    expectedFeatures: [
      'Authentication check',
      'Authorization check (ownership or admin)',
      'Resource existence check',
      'Soft delete or hard delete',
      'HTTP 204 on success',
      'HTTP 401 for unauthenticated',
      'HTTP 403 for unauthorized',
      'HTTP 404 if not found'
    ],
    testScenarios: [
      {
        scenario: 'Owner deletes resource',
        expectedBehavior: 'Deletes and returns 204'
      },
      {
        scenario: 'Non-owner attempts delete',
        expectedBehavior: 'Returns 403 forbidden'
      },
      {
        scenario: 'Resource already deleted',
        expectedBehavior: 'Returns 404 not found'
      }
    ]
  },

  {
    id: 'search-endpoint',
    name: 'Search Endpoint',
    description: 'Search across multiple fields with query parameter',
    method: 'GET',
    path: '/api/search',
    requiresAuth: false,
    usesDatabase: true,
    databaseTable: 'Post',
    expectedFeatures: [
      'Query parameter validation',
      'Full-text search or LIKE search',
      'Search across multiple fields (title, content, tags)',
      'Pagination support',
      'Result limiting',
      'HTTP 200 with results',
      'HTTP 400 for empty or invalid query'
    ],
    testScenarios: [
      {
        scenario: 'Valid search query',
        expectedBehavior: 'Returns matching results'
      },
      {
        scenario: 'No results found',
        expectedBehavior: 'Returns 200 with empty array'
      },
      {
        scenario: 'Missing query parameter',
        expectedBehavior: 'Returns 400 bad request'
      }
    ]
  },

  {
    id: 'upload-file',
    name: 'File Upload',
    description: 'Handle file upload with validation and storage',
    method: 'POST',
    path: '/api/upload',
    requiresAuth: true,
    usesDatabase: true,
    databaseTable: 'File',
    expectedFeatures: [
      'File type validation',
      'File size limits',
      'Unique filename generation',
      'Storage location handling',
      'Database record creation',
      'HTTP 201 on success',
      'HTTP 400 for invalid file',
      'HTTP 413 for file too large'
    ],
    testScenarios: [
      {
        scenario: 'Valid file upload',
        expectedBehavior: 'Saves file and returns 201 with file URL'
      },
      {
        scenario: 'Invalid file type',
        expectedBehavior: 'Returns 400 with error message'
      },
      {
        scenario: 'File exceeds size limit',
        expectedBehavior: 'Returns 413 payload too large'
      }
    ]
  },

  {
    id: 'webhook-handler',
    name: 'Webhook Handler',
    description: 'Process incoming webhook with signature verification',
    method: 'POST',
    path: '/api/webhooks/stripe',
    requiresAuth: false,
    usesDatabase: true,
    databaseTable: 'Payment',
    expectedFeatures: [
      'Signature verification',
      'Event type handling',
      'Idempotency check',
      'Database transaction',
      'Error logging',
      'HTTP 200 acknowledgment',
      'HTTP 400 for invalid signature',
      'HTTP 500 for processing errors'
    ],
    testScenarios: [
      {
        scenario: 'Valid webhook with correct signature',
        expectedBehavior: 'Processes event and returns 200'
      },
      {
        scenario: 'Invalid signature',
        expectedBehavior: 'Returns 400 unauthorized'
      },
      {
        scenario: 'Duplicate webhook (idempotency)',
        expectedBehavior: 'Returns 200 without processing'
      }
    ]
  },

  {
    id: 'aggregation-stats',
    name: 'Aggregation & Stats',
    description: 'Calculate and return statistics from database',
    method: 'GET',
    path: '/api/stats/dashboard',
    requiresAuth: true,
    usesDatabase: true,
    databaseTable: 'Order',
    expectedFeatures: [
      'Authentication check',
      'Aggregation queries (COUNT, SUM, AVG)',
      'Date range filtering',
      'Grouping by period',
      'Caching for performance',
      'HTTP 200 with stats object',
      'HTTP 401 for unauthenticated'
    ],
    testScenarios: [
      {
        scenario: 'Valid date range',
        expectedBehavior: 'Returns aggregated statistics'
      },
      {
        scenario: 'Invalid date format',
        expectedBehavior: 'Returns 400 validation error'
      },
      {
        scenario: 'Unauthenticated request',
        expectedBehavior: 'Returns 401 unauthorized'
      }
    ]
  }
]

/**
 * Get test case by ID
 */
export function getTestCase(id: string): ApiTestCase | undefined {
  return API_TEST_CASES.find(tc => tc.id === id)
}

/**
 * Get test cases by category
 */
export function getTestCasesByFeature(feature: 'auth' | 'database' | 'public'): ApiTestCase[] {
  switch (feature) {
    case 'auth':
      return API_TEST_CASES.filter(tc => tc.requiresAuth)
    case 'database':
      return API_TEST_CASES.filter(tc => tc.usesDatabase)
    case 'public':
      return API_TEST_CASES.filter(tc => !tc.requiresAuth)
    default:
      return []
  }
}

/**
 * Validate that generated code meets test case requirements
 */
export function validateAgainstTestCase(code: string, testCase: ApiTestCase): {
  passed: boolean
  missingFeatures: string[]
  suggestions: string[]
} {
  const missingFeatures: string[] = []
  const suggestions: string[] = []

  // Check each expected feature
  for (const feature of testCase.expectedFeatures) {
    const featureKey = feature.toLowerCase()
    
    // Email validation
    if (featureKey.includes('email validation') && !code.includes('email')) {
      missingFeatures.push('Email validation missing')
    }
    
    // Password hashing
    if (featureKey.includes('password hashing') && !code.includes('bcrypt') && !code.includes('hash')) {
      missingFeatures.push('Password hashing not implemented')
    }
    
    // Zod validation
    if (featureKey.includes('zod') && !code.includes('z.')) {
      missingFeatures.push('Zod schema validation missing')
    }
    
    // Authentication
    if (testCase.requiresAuth && !code.includes('getServerSession')) {
      missingFeatures.push('Authentication check missing')
    }
    
    // Database operations
    if (testCase.usesDatabase && !code.includes('prisma')) {
      missingFeatures.push('Database operations missing')
    }

    // Status codes
    const statusMatches = feature.match(/HTTP (\d+)/)
    if (statusMatches) {
      const status = statusMatches[1]
      if (!code.includes(`status: ${status}`)) {
        missingFeatures.push(`HTTP ${status} status code missing`)
      }
    }
  }

  // Additional suggestions based on method
  if (testCase.method === 'GET' && !code.includes('cache')) {
    suggestions.push('Consider adding caching for GET endpoints')
  }

  if ((testCase.method === 'POST' || testCase.method === 'PUT') && !code.includes('rate')) {
    suggestions.push('Consider adding rate limiting')
  }

  return {
    passed: missingFeatures.length === 0,
    missingFeatures,
    suggestions
  }
}

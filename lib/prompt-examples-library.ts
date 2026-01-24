/**
 * BUILDFLOW PROMPT EXAMPLES LIBRARY
 * 
 * Curated collection of prompts optimized for BuildFlow's capabilities
 * Organized by category and complexity level
 */

export const PROMPT_EXAMPLES = {
  // ═══════════════════════════════════════════════════════════════════
  // BEGINNER LEVEL - Simple, focused applications
  // ═══════════════════════════════════════════════════════════════════
  beginner: {
    portfolio: {
      title: 'Personal Portfolio',
      category: 'Personal',
      tags: ['portfolio', 'personal', 'simple'],
      prompt: `Create a modern portfolio website with:
- Hero section with name and tagline
- About me section with bio
- Skills section with technology badges
- Project gallery (3-4 showcase items)
- Contact form with email input
- Smooth scroll animations
Design: Clean and minimalist with a professional look`,
      estimatedTime: '2 minutes',
      difficulty: 'Beginner'
    },
    
    landingPage: {
      title: 'Product Landing Page',
      category: 'Marketing',
      tags: ['landing', 'saas', 'marketing'],
      prompt: `Build a SaaS product landing page featuring:
- Bold hero section with CTA button
- Feature showcase (3-4 key features with icons)
- Pricing table (3 tiers)
- FAQ accordion
- Newsletter signup form
Design: Modern with gradient backgrounds and smooth animations`,
      estimatedTime: '2 minutes',
      difficulty: 'Beginner'
    },
    
    restaurant: {
      title: 'Restaurant Website',
      category: 'Business',
      tags: ['restaurant', 'menu', 'business'],
      prompt: `Create a restaurant website with:
- Hero with restaurant name and location
- Menu sections (Appetizers, Mains, Desserts, Drinks)
- Gallery of food photos
- Opening hours and location map
- Reservation form
Design: Warm, inviting colors with appetizing food imagery`,
      estimatedTime: '2 minutes',
      difficulty: 'Beginner'
    },
    
    blogTemplate: {
      title: 'Personal Blog',
      category: 'Content',
      tags: ['blog', 'content', 'writing'],
      prompt: `Build a personal blog template with:
- Header with blog title and navigation
- Featured post section
- Blog post grid (6-8 sample posts)
- Sidebar with categories and tags
- Search bar
Design: Clean typography, comfortable reading experience`,
      estimatedTime: '2 minutes',
      difficulty: 'Beginner'
    },
  },
  
  // ═══════════════════════════════════════════════════════════════════
  // INTERMEDIATE LEVEL - Interactive with state management
  // ═══════════════════════════════════════════════════════════════════
  intermediate: {
    todoApp: {
      title: 'Todo List Manager',
      category: 'Productivity',
      tags: ['todo', 'task', 'productivity'],
      prompt: `Create a todo list application with:
- Add new tasks with input form
- Mark tasks as complete/incomplete
- Delete tasks
- Filter by all/active/completed
- Task counter
- Local storage to persist tasks
Design: Clean and minimalist with smooth checkbox animations`,
      estimatedTime: '3 minutes',
      difficulty: 'Intermediate'
    },
    
    calculator: {
      title: 'Advanced Calculator',
      category: 'Tools',
      tags: ['calculator', 'math', 'utility'],
      prompt: `Build a calculator app with:
- Number buttons (0-9) and operators (+, -, ×, ÷)
- Clear and backspace functions
- Decimal point support
- Calculation history (last 5 operations)
- Keyboard support
- Memory functions (M+, M-, MR, MC)
Design: Modern with a dark theme and neon accents`,
      estimatedTime: '3 minutes',
      difficulty: 'Intermediate'
    },
    
    weatherDashboard: {
      title: 'Weather Dashboard',
      category: 'Tools',
      tags: ['weather', 'api', 'dashboard'],
      prompt: `Create a weather dashboard with:
- City search input
- Current weather display (temperature, conditions, humidity, wind)
- 5-day forecast
- Weather icons for different conditions
- Toggle between Celsius/Fahrenheit
- Save favorite cities (local storage)
Design: Clean with weather-appropriate color schemes`,
      estimatedTime: '3 minutes',
      difficulty: 'Intermediate'
    },
    
    quizApp: {
      title: 'Interactive Quiz',
      category: 'Education',
      tags: ['quiz', 'trivia', 'education'],
      prompt: `Build a quiz application with:
- Multiple choice questions (5-10 questions)
- Progress indicator
- Score tracking
- Timer (optional 30 seconds per question)
- Results page with score percentage
- Retry option
Design: Colorful and engaging with smooth transitions`,
      estimatedTime: '3 minutes',
      difficulty: 'Intermediate'
    },
  },
  
  // ═══════════════════════════════════════════════════════════════════
  // ADVANCED LEVEL - Full-stack with Supabase
  // ═══════════════════════════════════════════════════════════════════
  advanced: {
    ecommerceCoffee: {
      title: 'Coffee Shop E-commerce',
      category: 'E-commerce',
      tags: ['ecommerce', 'shop', 'database', 'auth'],
      prompt: `App Name: Roast & Revel

Purpose: Premium coffee e-commerce platform with inventory management

Key Features:
1. Product catalog with categories (Beans, Brews, Equipment) stored in Supabase
2. Shopping cart with add/remove/update quantity (local storage)
3. User authentication (Supabase Auth) with order history
4. Admin panel to add/edit/delete products and manage inventory
5. Product search and filtering by category, price range
6. Product detail pages with images and descriptions

Tech Stack: Supabase for database, authentication, and storage
Authentication: Required for checkout and admin access
Design: Dark mode with rustic aesthetic, warm brown/cream colors, high-quality product imagery

Data Model:
- products table: id, name, description, price, category, stock_count, image_url, created_at
- orders table: id, user_id, items (JSON), total, status, created_at
- order_items table: id, order_id, product_id, quantity, price_at_purchase
- Users managed through Supabase Auth

User Journey: Browse products → Add to cart → Sign in → Checkout → View order history`,
      estimatedTime: '5 minutes',
      difficulty: 'Advanced'
    },
    
    fitnessBooking: {
      title: 'Gym Class Booking System',
      category: 'Fitness',
      tags: ['booking', 'fitness', 'calendar', 'auth'],
      prompt: `App Name: Iron Pulse Fitness

Purpose: Class booking and lead generation platform for fitness studio

Key Features:
1. Live class schedule with real-time availability from Supabase
2. Interactive booking calendar showing upcoming classes
3. User registration with fitness goals tracking (Supabase Auth)
4. Class filtering by type (Yoga, HIIT, Boxing, Cycling)
5. Booking history for logged-in users
6. Admin dashboard to add/cancel classes and view bookings
7. Lead capture form for non-members with automated follow-up flag

Tech Stack: Supabase with real-time subscriptions for class updates
Authentication: Optional for browsing, required for booking
Design: High-energy with bold orange/red colors, dynamic animations, modern fitness aesthetic

Data Model:
- classes table: id, name, instructor, type, datetime, duration, capacity, booked_count
- bookings table: id, user_id, class_id, status, created_at
- leads table: id, name, email, phone, fitness_goal, created_at
- instructors table: id, name, bio, photo_url, specialties

User Journey: Browse schedule → Select class → Sign in/Sign up → Confirm booking → Receive confirmation`,
      estimatedTime: '5 minutes',
      difficulty: 'Advanced'
    },
    
    recipeSharing: {
      title: 'Recipe Sharing Community',
      category: 'Social',
      tags: ['recipes', 'social', 'community', 'auth'],
      prompt: `App Name: Flavor Vault

Purpose: Community-driven recipe sharing platform with collections

Key Features:
1. Browse recipes with search and filter (cuisine, difficulty, time, dietary)
2. User-submitted recipes with image upload (Supabase Storage)
3. Like/save recipes to personal cookbook
4. Comment system with real-time updates
5. User profiles showing their recipes and collections
6. Recipe ratings and reviews
7. Ingredient checklist that users can check off

Tech Stack: Supabase for database, storage, and real-time comments
Authentication: Required to submit, save, comment, and like
Design: Clean food-magazine inspired with card layouts, high-quality food photography, warm colors

Data Model:
- recipes table: id, user_id, title, description, ingredients (JSON), instructions, prep_time, cook_time, difficulty, cuisine, image_url, created_at
- likes table: id, user_id, recipe_id, created_at
- comments table: id, recipe_id, user_id, content, created_at
- saved_recipes table: id, user_id, recipe_id, created_at
- ratings table: id, user_id, recipe_id, rating (1-5), created_at

User Journey: Browse recipes → Find interesting recipe → View details → Save to cookbook → Rate/comment → Submit own recipe`,
      estimatedTime: '5 minutes',
      difficulty: 'Advanced'
    },
    
    projectTracker: {
      title: 'Project Management Dashboard',
      category: 'Productivity',
      tags: ['project', 'kanban', 'team', 'auth'],
      prompt: `App Name: TaskFlow Pro

Purpose: Project management with kanban boards and team collaboration

Key Features:
1. Multiple projects with kanban boards (To Do, In Progress, Done)
2. Drag-and-drop task cards between columns
3. Task details: title, description, assignee, due date, priority
4. Team member management and assignment
5. Project timeline/calendar view
6. Activity feed showing recent changes
7. Task filtering and search

Tech Stack: Supabase for real-time task updates and team collaboration
Authentication: Required - users can only access their projects
Design: Modern and professional with clean layouts, blue/purple color scheme

Data Model:
- projects table: id, owner_id, name, description, created_at
- tasks table: id, project_id, title, description, status, priority, assignee_id, due_date, created_at, updated_at
- team_members table: id, project_id, user_id, role
- comments table: id, task_id, user_id, content, created_at
- activity_log table: id, project_id, user_id, action, description, created_at

User Journey: Create project → Add team members → Create tasks → Move tasks through stages → Mark complete`,
      estimatedTime: '5 minutes',
      difficulty: 'Advanced'
    },
    
    eventManagement: {
      title: 'Event Registration Platform',
      category: 'Events',
      tags: ['events', 'booking', 'calendar', 'auth'],
      prompt: `App Name: EventHub

Purpose: Event creation and attendee registration platform

Key Features:
1. Browse upcoming events with search and category filters
2. Event detail pages with full information and photo gallery
3. Ticket purchase/registration with different ticket types
4. User dashboard showing registered events and tickets
5. Event creator dashboard to manage events and view attendees
6. QR code generation for event check-in
7. Waitlist functionality for sold-out events

Tech Stack: Supabase for events, registrations, and real-time availability
Authentication: Required for registration and event creation
Design: Modern and vibrant with colorful event cards, engaging imagery

Data Model:
- events table: id, creator_id, title, description, date, time, location, category, capacity, price, image_url, created_at
- registrations table: id, event_id, user_id, ticket_type, quantity, status, qr_code, created_at
- tickets table: id, event_id, type, price, quantity_available
- waitlist table: id, event_id, user_id, created_at

User Journey: Browse events → View details → Register/buy ticket → Receive confirmation → Check-in with QR code`,
      estimatedTime: '5 minutes',
      difficulty: 'Advanced'
    },
  },
  
  // ═══════════════════════════════════════════════════════════════════
  // SPECIALIZED - Niche applications
  // ═══════════════════════════════════════════════════════════════════
  specialized: {
    invoiceGenerator: {
      title: 'Invoice Generator',
      category: 'Business',
      tags: ['invoice', 'billing', 'pdf', 'business'],
      prompt: `Create an invoice generator with:
- Client information input form
- Line items with description, quantity, rate
- Automatic total calculation with tax
- Invoice preview with professional template
- Save invoices to Supabase
- Export as PDF functionality
- Invoice numbering system
- Payment status tracking
Design: Professional and clean with blue corporate colors`,
      estimatedTime: '4 minutes',
      difficulty: 'Advanced'
    },
    
    habitTracker: {
      title: 'Habit Tracker',
      category: 'Health',
      tags: ['habits', 'tracking', 'wellness'],
      prompt: `Build a habit tracking app with:
- Create custom habits with frequency goals
- Daily check-in with visual calendar
- Streak tracking and statistics
- Charts showing progress over time
- Habit categories and tags
- Reminder notifications flag
- Store data in Supabase
Design: Motivating and colorful with progress visualization`,
      estimatedTime: '4 minutes',
      difficulty: 'Advanced'
    },
    
    urlShortener: {
      title: 'URL Shortener',
      category: 'Tools',
      tags: ['url', 'utility', 'analytics'],
      prompt: `Create a URL shortener service with:
- Input long URL and generate short code
- Custom short code option
- Click tracking and analytics
- QR code generation for each link
- Link management dashboard
- Store links in Supabase
- User authentication for link history
Design: Simple and functional with modern tech aesthetic`,
      estimatedTime: '4 minutes',
      difficulty: 'Advanced'
    },
    
    petAdoption: {
      title: 'Pet Adoption Platform',
      category: 'Non-Profit',
      tags: ['pets', 'adoption', 'animals'],
      prompt: `App Name: Paws & Home

Purpose: Connect pet shelters with potential adopters

Key Features:
1. Browse available pets with filters (type, age, size, location)
2. Pet profile pages with photos, description, personality traits
3. Adoption application form
4. User accounts to save favorite pets
5. Shelter dashboard to add/update pet listings
6. Success stories gallery

Tech Stack: Supabase for pet database and applications
Authentication: Required for applications and shelter accounts
Design: Warm and friendly with pet photography, pastel colors

Data Model:
- pets table: id, shelter_id, name, type, breed, age, size, description, photos, status
- applications table: id, user_id, pet_id, status, created_at
- shelters table: id, name, location, contact_info`,
      estimatedTime: '4 minutes',
      difficulty: 'Advanced'
    },
  },
  
  // ═══════════════════════════════════════════════════════════════════
  // P.F.D.A. FRAMEWORK TEMPLATES
  // ═══════════════════════════════════════════════════════════════════
  pfdaTemplates: {
    blank: {
      title: 'Blank P.F.D.A. Template',
      template: `App Name: [Your App Name]

Purpose: [One sentence description of what your app does and who it's for]

Key Features:
1. [First major feature with specific functionality]
2. [Second feature with data integration details]
3. [Third feature with user interaction details]

Tech Stack: Supabase for [specify what: database/auth/storage]
Authentication: [Yes/No - describe what needs protection]
Design: [Aesthetic description with color scheme]

Data Model: [List tables and key fields]
- [table_name]: [key fields]

User Journey: [Step 1] → [Step 2] → [Step 3] → [Result]`
    },
    
    saasApp: {
      title: 'SaaS Application Template',
      template: `App Name: [SaaS Product Name]

Purpose: A [type] platform that helps [target audience] [solve specific problem]

Key Features:
1. Dashboard with key metrics and analytics
2. [Core feature] with real-time updates from Supabase
3. User workspace management and collaboration
4. Subscription management with different tiers
5. Export functionality (CSV/PDF)

Tech Stack: Supabase for database, authentication, and real-time updates
Authentication: Required - users have personal workspaces
Design: Modern SaaS aesthetic with blue/purple gradients, clean layouts

Data Model:
- users table: id, email, subscription_tier, created_at
- workspaces table: id, owner_id, name, settings
- [your_main_data]: id, workspace_id, [key fields]

User Journey: Sign up → Onboarding → Create workspace → [Use main feature] → Upgrade`,
    },
    
    marketplace: {
      title: 'Marketplace Template',
      template: `App Name: [Marketplace Name]

Purpose: Connect [sellers] with [buyers] for [what they're trading]

Key Features:
1. Listing creation with photos and details (Supabase Storage)
2. Search and filter by category, price, location
3. Messaging system between buyers and sellers
4. User profiles with ratings and reviews
5. Saved listings and favorites
6. Payment integration placeholder

Tech Stack: Supabase for listings, messaging, and user management
Authentication: Required to list, message, and review
Design: Clean marketplace aesthetic with card-based layouts

Data Model:
- listings table: id, seller_id, title, description, price, category, images, status
- messages table: id, listing_id, sender_id, receiver_id, content, created_at
- reviews table: id, reviewer_id, reviewed_user_id, rating, comment

User Journey: Browse → Find item → Message seller → Arrange transaction → Leave review`,
    },
  }
};

/**
 * Get prompts by category
 */
export function getPromptsByCategory(category: keyof typeof PROMPT_EXAMPLES) {
  return PROMPT_EXAMPLES[category];
}

/**
 * Search prompts by tags or title
 */
type Prompt = {
  title: string;
  category?: string;
  tags?: string[];
  prompt?: string;
  estimatedTime?: string;
  difficulty?: string;
  template?: string;
  key?: string;
  // Add other fields as needed
};

export function searchPrompts(query: string) {
  const results: Prompt[] = [];
  const lowerQuery = query.toLowerCase();
  
  Object.entries(PROMPT_EXAMPLES).forEach(([category, prompts]) => {
    Object.entries(prompts).forEach(([key, prompt]: [string, Prompt]) => {
      const matchesTitle = prompt.title?.toLowerCase().includes(lowerQuery);
      const matchesTags = prompt.tags?.some((tag: string) => tag.includes(lowerQuery));
      const matchesCategory = category.toLowerCase().includes(lowerQuery);
      
      if (matchesTitle || matchesTags || matchesCategory) {
        results.push({ ...prompt, key, category });
      }
    });
  });
  
  return results;
}

/**
 * Get all prompts as flat array
 */
export function getAllPrompts() {
  const allPrompts: Prompt[] = [];
  
  Object.entries(PROMPT_EXAMPLES).forEach(([category, prompts]) => {
    Object.entries(prompts).forEach(([key, prompt]) => {
      allPrompts.push({ ...prompt, key, category });
    });
  });
  
  return allPrompts;
}
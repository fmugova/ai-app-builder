# Teacher's Digital Planner & Data Analysis System

A comprehensive productivity and student data analysis platform designed specifically for UK secondary school teachers teaching GCSE and A-Level subjects.

## 🎯 Overview

This integrated platform combines scheduling, lesson planning, student data analysis, and AI-powered insights to help teachers:
- Track student progress and identify intervention needs
- Generate lesson plans with AI assistance
- Analyze GCSE/A-Level assessment data with sophisticated KPIs
- Manage communications with parents and students
- Plan and track interventions
- Organize tasks and timetables

## 🚀 Key Features

### 📊 Data Analysis & KPIs
- **Comprehensive Analytics Dashboard**
  - Progress tracking (On Target, Borderline, Below Target)
  - Grade distribution visualizations
  - Subject performance comparison
  - Equity metrics (Pupil Premium, SEN, EAL gap analysis)

- **CSV Data Upload**
  - Bulk import GCSE/A-Level assessment results
  - Automatic student creation
  - Support for topic-level breakdowns

- **AI-Powered Insights**
  - Claude API integration for data analysis
  - Identifies strengths and weaknesses
  - Generates intervention recommendations
  - Predicts likely outcomes

### 📚 Lesson Planning
- **AI Lesson Plan Generator**
  - Aligned to exam specifications
  - Differentiation strategies included
  - Activity suggestions with timings
  - Resource recommendations

- **Lesson Plan Library**
  - Save and organize plans by subject/topic
  - Search and filter functionality
  - Version history

### 👥 Student Management
- **Student Profiles**
  - Track SEN, EAL, and Pupil Premium status
  - Assessment history
  - Communication logs
  - Intervention participation

- **Class Groups**
  - Organize by year group and subject
  - Bulk operations
  - Performance filtering

### 🎯 Intervention Planning
- **AI Intervention Strategist**
  - Generate week-by-week intervention plans
  - Resource suggestions (Corbett Maths, BBC Bitesize, etc.)
  - Success criteria and exit metrics

- **Intervention Tracking**
  - Pre/post assessment comparison
  - Attendance monitoring
  - Effectiveness scoring

### ✉️ Communication Hub
- **AI Email Drafting**
  - Professional parent/student emails
  - Adjustable tone (formal, friendly, concerned)
  - Meeting request templates

- **Communication Log**
  - Track all parent/student contacts
  - Follow-up reminders
  - Category filtering

### 📅 Timetable & Calendar
- **Teaching Schedule**
  - Weekly timetable view
  - Room and class information
  - Integration with lesson planning

### ✅ Task Management
- **Priority Matrix**
  - Urgent/Important categorization
  - Deadline tracking
  - Recurring task automation

## 🛠️ Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **AI**: Anthropic Claude API (Sonnet 3.5)
- **Visualizations**: Recharts
- **Data Processing**: PapaParse, date-fns

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Anthropic API key ([Get one here](https://console.anthropic.com/))

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ai-app-builder
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/teacher_planner?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"

# Anthropic API
ANTHROPIC_API_KEY="your-api-key-here"

# Stripe (Optional - for subscription features)
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
```

### 4. Set Up the Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# (Optional) Seed with sample data
npx prisma db seed
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

### 6. Access the Teacher Dashboard

Navigate to `/teacher` to access the Teacher's Digital Planner dashboard.

## 📖 User Guide

### Getting Started

1. **Sign Up / Sign In**
   - Create an account or sign in at `/auth/signin`
   - First-time users will be redirected to the dashboard

2. **Set Up Your Profile**
   - Add your school name
   - List subjects taught
   - Specify year groups

### Uploading Student Data

1. Go to **Upload Data** (`/teacher/upload`)
2. Download the CSV template
3. Fill in your student assessment data
4. Upload the CSV file
5. Review the preview and confirm upload

**CSV Format:**
```csv
studentName,subject,yearGroup,assessmentType,date,score,grade,targetGrade,senStatus,ealStatus,pupilPremium
John Smith,Mathematics,11,Mock 1,2024-01-15,85,7,8,false,false,true
```

### Viewing Analytics

1. Navigate to **Data Analysis** (`/teacher/analytics`)
2. Select a subject and year group
3. View KPI cards and visualizations
4. Click **AI Analysis** for detailed insights
5. Review at-risk students list

### Creating Lesson Plans

1. Go to **Lesson Planning** (`/teacher/lesson-plans/new`)
2. Enter lesson details:
   - Subject and topic
   - Year group
   - Duration and prior knowledge
   - Exam board
3. Click **Generate with AI**
4. Review and edit the generated plan
5. Save to your library

### Drafting Parent Emails

1. Navigate to **Communications** (`/teacher/communications`)
2. Click **Draft New Email**
3. Enter:
   - Student name
   - Purpose (concern, achievement, meeting request)
   - Context/details
   - Desired tone
4. Click **Generate Email**
5. Review, edit, and copy to your email client

### Planning Interventions

1. Go to **Interventions** (`/teacher/interventions`)
2. Click **Create Intervention Plan**
3. Specify:
   - Subject and focus area
   - Year group and current/target grades
   - Number of students and duration
4. Click **Generate AI Plan**
5. Review weekly breakdown and resources
6. Save and assign students

## 🎓 API Endpoints

### Students
- `GET /api/students` - List all students
- `POST /api/students` - Create a student
- `GET /api/students/[id]` - Get student details
- `PUT /api/students/[id]` - Update student
- `DELETE /api/students/[id]` - Delete student

### Assessments
- `GET /api/assessments` - List assessments
- `POST /api/assessments` - Create assessment
- `POST /api/assessments/upload` - Bulk upload from CSV

### Analytics
- `GET /api/teacher/analytics` - Get KPIs and statistics

### AI Features
- `POST /api/teacher/ai/lesson-plan` - Generate lesson plan
- `POST /api/teacher/ai/analyze-data` - Analyze student data
- `POST /api/teacher/ai/draft-email` - Draft email
- `POST /api/teacher/ai/intervention-plan` - Create intervention plan

### Timetable
- `GET /api/teacher/timetable` - Get timetable entries
- `POST /api/teacher/timetable` - Create timetable entry

### Tasks
- `GET /api/teacher/tasks` - List tasks
- `POST /api/teacher/tasks` - Create task

### Lesson Plans
- `GET /api/teacher/lesson-plans` - List lesson plans
- `POST /api/teacher/lesson-plans` - Create lesson plan

## 🔐 Security & Privacy

- **GDPR Compliant**: All student data is encrypted and securely stored
- **Authentication**: Protected routes require user authentication
- **Data Ownership**: Teachers only access their own students and data
- **API Security**: All endpoints validate user session and ownership
- **Anonymization**: Option to export anonymized data for sharing

## 💰 Claude API Usage Optimization

The system is designed to maximize value from your Claude API credits:

- **Cached Prompts**: Common templates are reused
- **Batch Processing**: Similar requests are grouped
- **Strategic Use**: AI only for high-value tasks (insights, generation)
- **Token Efficiency**: Optimized prompts minimize token usage

**Estimated Usage:**
- Lesson Plan: ~2,000 tokens
- Data Analysis: ~3,000 tokens
- Email Draft: ~500 tokens
- Intervention Plan: ~2,500 tokens

With $224 credit, expect:
- 4,500+ lesson plans, OR
- 3,000+ data analyses, OR
- Mixed usage for 3-6 months of regular use

## 📊 Database Schema

### Key Models

- **Student**: Student profiles with demographics
- **Assessment**: Assessment records with grades and scores
- **TimetableEntry**: Teaching schedule
- **LessonPlan**: Lesson plans with objectives and activities
- **Intervention**: Intervention programs and tracking
- **Communication**: Parent/student communication logs
- **Task**: Teacher task management

See `prisma/schema.prisma` for complete schema.

## 🧪 Testing

Sample data for testing:

1. **Create Test Students**
   - Navigate to Students page
   - Add 5-10 students with varying year groups

2. **Upload Test Data**
   - Use the provided CSV template
   - Upload mock assessment results

3. **Test AI Features**
   - Generate a lesson plan
   - Run data analysis
   - Draft a sample email

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project to Vercel
3. Configure environment variables
4. Deploy

### Database Hosting

- **Vercel Postgres**: Integrated PostgreSQL
- **Railway**: Free PostgreSQL with auto-scaling
- **Supabase**: PostgreSQL with additional features

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Test database connection
npx prisma db push

# Reset database
npx prisma migrate reset
```

### Prisma Client Errors
```bash
# Regenerate Prisma Client
npx prisma generate
```

### Environment Variables Not Loading
- Restart development server after changing `.env`
- Ensure `.env` is in root directory
- Check for typos in variable names

## 📝 Future Enhancements

- [ ] Integration with school MIS (SIMS, Arbor, Bromcom)
- [ ] Collaborative department planning
- [ ] Student/parent portal access
- [ ] Seating plan generator
- [ ] Behavior tracking integration
- [ ] Automated report card comments
- [ ] CPD tracker and evidence portfolio
- [ ] Mobile app (iOS/Android)

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Anthropic**: Claude AI API
- **Educational Resources**: Corbett Maths, BBC Bitesize, Physics & Maths Tutor
- **UK Teachers**: For feedback and requirements

## 📧 Support

For issues, questions, or feature requests:
- GitHub Issues: [Link to repository issues]
- Email: support@teacherplanner.com
- Documentation: [Link to full docs]

---

**Built with ❤️ for UK teachers**

*Empowering educators with AI-driven insights and productivity tools*

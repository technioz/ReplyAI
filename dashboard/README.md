# ReplyAI Dashboard 🚀

A modern Next.js dashboard for managing ReplyAI Chrome extension users, subscriptions, and API keys.

## ✨ **Features**

- **User Authentication**: Sign up, login, password reset
- **API Key Management**: Generate, regenerate, and manage API keys
- **Subscription Tiers**: Free, Pro, Business plans
- **Usage Analytics**: Track API usage and limits
- **Dashboard**: User statistics and management
- **Payment Integration**: Stripe for subscriptions (coming soon)

## 🏗️ **Architecture**

```
Dashboard (Next.js + Supabase)
├── Frontend: Next.js 14 with App Router
├── Backend: Supabase (Auth, Database, Edge Functions)
├── Styling: Tailwind CSS + Framer Motion
├── Database: PostgreSQL via Supabase
└── Authentication: Supabase Auth
```

## 🚀 **Quick Start**

### **1. Install Dependencies**
```bash
cd dashboard
npm install
```

### **2. Set up Environment Variables**
```bash
cp env.example .env.local
# Fill in your Supabase and Stripe credentials
```

### **3. Run Development Server**
```bash
npm run dev
```

### **4. Open [http://localhost:3000](http://localhost:3000)**

## 🔧 **Environment Variables**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📁 **Project Structure**

```
dashboard/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── dashboard/       # Dashboard page
│   │   ├── login/           # Login page
│   │   ├── signup/          # Signup page
│   │   ├── globals.css      # Global styles
│   │   └── layout.tsx       # Root layout
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # Basic UI components
│   │   ├── sections/        # Page sections
│   │   └── providers/       # Context providers
│   ├── lib/                 # Utilities and configurations
│   └── types/               # TypeScript type definitions
├── public/                  # Static assets
├── package.json             # Dependencies
├── next.config.js           # Next.js configuration
├── tailwind.config.js       # Tailwind CSS configuration
└── env.example              # Environment variables template
```

## 🎨 **Design System**

### **Colors**
- **Primary**: Blue (#1d9bf0) - Main brand color
- **Secondary**: Gray (#536471) - Text and borders
- **Accent**: Green (#00ba7c) - Success and highlights
- **Danger**: Pink (#f91880) - Errors and warnings

### **Components**
- **Button**: Multiple variants (default, outline, ghost, etc.)
- **Input**: Form inputs with validation and icons
- **Card**: Content containers with shadows and hover effects
- **Typography**: Inter font family with consistent sizing

## 🔐 **Authentication Flow**

1. User signs up/logs in via form
2. JWT token stored in localStorage
3. Protected routes check authentication
4. Dashboard shows user-specific data

## 📱 **Responsive Design**

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Flexible grid layouts
- Touch-friendly interactions

## 🚀 **Deployment**

### **Vercel (Recommended)**
1. Connect GitHub repository to Vercel
2. Set environment variables
3. Deploy automatically on push to main branch

### **Manual Deployment**
```bash
npm run build
npm start
```

## 🔧 **Development**

### **Available Scripts**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript check
```

### **Code Quality**
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Tailwind CSS for styling

## 📊 **Database Schema**

### **Users Table**
```sql
CREATE TABLE users (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free',
  api_calls_used INTEGER DEFAULT 0,
  api_calls_limit INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **API Keys Table**
```sql
CREATE TABLE api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🌟 **Next Steps**

- [ ] Integrate with Supabase backend
- [ ] Add Stripe payment processing
- [ ] Implement real-time usage tracking
- [ ] Add admin dashboard for user management
- [ ] Create API documentation
- [ ] Add unit and integration tests
- [ ] Implement email notifications
- [ ] Add dark mode support

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 **License**

MIT License - see LICENSE file for details

## 🆘 **Support**

- **Documentation**: [docs.replyai.tech](https://docs.replyai.tech)
- **Email**: support@replyai.tech
- **Issues**: [GitHub Issues](https://github.com/technioz/ReplyAI/issues)

---

**Built with ❤️ by the ReplyAI Team**

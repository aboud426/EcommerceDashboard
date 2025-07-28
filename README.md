# Dashboard Application

A modern, responsive admin dashboard built with React and TypeScript. This application provides a comprehensive interface for managing users, products, orders, payments, and other administrative tasks.

## Features

- **User Management**: Complete user administration interface
- **Product Management**: Manage product catalog and categories
- **Order Tracking**: Monitor and manage customer orders
- **Payment Processing**: Handle payment transactions and records
- **Media Management**: Organize and manage media types
- **Authentication**: Secure login system with protected routes
- **Responsive Design**: Mobile-friendly interface using Tailwind CSS
- **Modern UI Components**: Built with shadcn-ui component library

## Technology Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and building
- **Styling**: Tailwind CSS for utility-first styling
- **UI Components**: shadcn-ui for consistent design system
- **State Management**: React Context for authentication
- **Routing**: React Router for navigation
- **Development**: ESLint for code quality

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <your-repository-url>
cd Dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn-ui components
│   ├── AdminLayout.tsx # Main layout component
│   └── ...
├── contexts/           # React context providers
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── pages/              # Application pages/routes
└── main.tsx           # Application entry point
```

## Available Scripts

- `npm run dev` - Start development server

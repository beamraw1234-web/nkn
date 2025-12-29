# Modern Login System

A secure and modern login system built with Next.js, Tailwind CSS, Prisma, and NextAuth.js.

## Features

- **Authentication**: Secure login with NextAuth.js.
- **Role-Based Access Control**: Separate User and Admin roles.
- **Admin Dashboard**: Manage users (View, Suspend, Ban, Delete).
- **System Logging**:
  - Comprehensive logging of User and Admin actions.
  - Separate views for User Logs and Admin Logs.
  - Logs include Action, Details, IP Address, and Timestamp.
  - Thai language log messages.
- **Security**:
  - Protected routes via Middleware.
  - Session management.
  - Client-side protection (F12/Right-click disabled).
  - Password hashing with bcrypt.
- **UI/UX**:
  - Modern design with Tailwind CSS.
  - Animations with Framer Motion.
  - Thai language support with Kanit font.
  - Responsive design.
  - Toast notifications.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Setup Database**:
    ```bash
    npx prisma migrate dev --name init
    ```

3.  **Seed Database** (Create Admin User):
    ```bash
    npx tsx prisma/seed.ts
    ```
    *Default Admin Credentials:*
    - Username: `admin`
    - Password: `admin123`

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

5.  **Open Browser**:
    Visit [http://localhost:ตั้งค่าพื้นหลัง](http://localhost:3000)

## Project Structure

- `app/`: Next.js App Router pages and API routes.
- `components/`: Reusable UI components.
- `prisma/`: Database schema and seed script.
- `types/`: TypeScript type definitions.
- `middleware.ts`: Route protection logic.

## Technologies

- Next.js 15
- Tailwind CSS
- Prisma (SQLite)
- NextAuth.js
- Framer Motion
- React Hot Toast
- Lucide React

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Create T3 App

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Development Setup

### 1. Database Setup
```bash
# Set up the database schema
npm run db:push

# Open Prisma Studio to view data (optional)
npm run db:studio
```

### 2. Authentication Setup
1. Sign in to the application through your browser to create a user account
2. This creates your user record in the database

### 3. Seed Mock Data (Recommended for Development)
```bash
# Populate the database with sample JD/Resume data
npm run db:seed
```

This will create realistic mock data including:
- **Job Description**: Full Stack Developer position with requirements and responsibilities
- **Resume**: Sample software engineer resume with experience and skills

**Benefits of using mock data:**
- ✅ Skip manual data entry during development
- ✅ Consistent test data across environments  
- ✅ Immediate functionality testing
- ✅ Perfect for demos and presentations

### 4. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` and you'll have a fully functional interview practice app with pre-populated data!

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.

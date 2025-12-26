import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { createRouteHandler } from 'trpc-next-server';
import { appRouter } from '@/app/api/trpc/[trpc]';

export const dynamic = 'force-dynamic';

// Create a schema for validating the input data
const SettingsSchema = z.object({
  githubUsername: z.string().min(1, 'GitHub username is required'),
  vercelToken: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await req.json();

  // Validate the input data against the schema
  const result = SettingsSchema.safeParse(body);

  if (!result.success) {
    return new Response(JSON.stringify(result.error.issues), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { githubUsername, vercelToken } = result.data;

  try {
    // Here you would typically save the settings to a database
    // For this example, we'll just return them in the response

    return new Response(
      JSON.stringify({
        githubUsername,
        vercelToken,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response('Error saving settings', { status: 500 });
  }
}

// Create a handler for the TRPC router
export const { GET, POST } = createRouteHandler({
  router: appRouter,
  createContext: ({ req, res }) => ({ req, res }),
});
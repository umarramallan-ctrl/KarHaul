import { clerkMiddleware, getAuth } from "@clerk/express";
import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import { randomUUID } from "crypto";

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;

      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

export const clerkAuth = clerkMiddleware();

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const { userId } = getAuth(req);
  if (!userId) {
    next();
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      id: randomUUID(),
      authId: userId,
    })
    .onConflictDoUpdate({
      target: usersTable.authId,
      set: {
        updatedAt: new Date(),
      },
    })
    .returning();

  req.user = {
    id: user.id,
    firstName: user.firstName ?? undefined,
    lastName: user.lastName ?? undefined,
    profileImage: user.profileImageUrl ?? undefined,
  };
  next();
}

import { Router, type IRouter, type Request, type Response } from "express";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/auth/user", (req: Request, res: Response) => {
  const isAuthenticated = req.isAuthenticated();
  res.json(
    GetCurrentAuthUserResponse.parse({
      isAuthenticated,
      user: isAuthenticated ? req.user : undefined,
    }),
  );
});

export default router;

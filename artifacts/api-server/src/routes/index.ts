import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import shipmentsRouter from "./shipments";
import bidsRouter from "./bids";
import bookingsRouter from "./bookings";
import messagesRouter from "./messages";
import reviewsRouter from "./reviews";
import adminRouter from "./admin";
import priceEstimateRouter from "./price-estimate";
import driverRoutesRouter from "./driver-routes";
import savedDriversRouter from "./saved-drivers";
import conditionPhotosRouter from "./condition-photos";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(shipmentsRouter);
router.use(bidsRouter);
router.use(bookingsRouter);
router.use(messagesRouter);
router.use(reviewsRouter);
router.use(adminRouter);
router.use(priceEstimateRouter);
router.use(driverRoutesRouter);
router.use(savedDriversRouter);
router.use(conditionPhotosRouter);

export default router;

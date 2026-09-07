import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import testRoutes from './testRoutes.js';
import userRoutes from './userRoutes.js';
import regionRoutes from './regionRoutes.js';
import agentRoutes from './agentRoutes.js';
import loanRoutes from './loanRoutes.js';
import workloadRoutes from './workloadRoutes.js';
import collectionAttemptRoutes from './collectionAttemptRoutes.js';
import promiseToPayRoutes from './promiseToPayRoutes.js';
import settlementRoutes from './settlementRoutes.js';
import legalRoutes from './legalRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';

const apiRouter = Router();

// Mount Routes
apiRouter.use('/health', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/regions', regionRoutes);
apiRouter.use('/agents', agentRoutes);
apiRouter.use('/loans', loanRoutes);
apiRouter.use('/workload', workloadRoutes);
apiRouter.use('/collection-attempts', collectionAttemptRoutes);
apiRouter.use('/promises-to-pay', promiseToPayRoutes);
apiRouter.use('/settlements', settlementRoutes);
apiRouter.use('/legal', legalRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/test', testRoutes);

export default apiRouter;

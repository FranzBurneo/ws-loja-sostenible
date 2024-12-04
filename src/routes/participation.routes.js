import { Router } from 'express';
import * as participationCtrl from '../controllers/participation.controller';
import {authJwt} from "../middlewares";

const router = Router()

router.post('/', [authJwt.verifyToken], participationCtrl.createParticipation)
router.delete('/:postId', [authJwt.verifyToken], participationCtrl.deleteParticipation)

export default router;
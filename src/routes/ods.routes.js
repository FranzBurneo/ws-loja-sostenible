import { Router } from 'express'
import * as odsCtrl from '../controllers/ods.controller'
import {authJwt} from "../middlewares"

const router = Router()

router.get('/', odsCtrl.getAllOds)
router.post('/', [authJwt.verifyToken, authJwt.isAdmin], odsCtrl.addOds)
router.put('/:id', [authJwt.verifyToken, authJwt.isAdmin], odsCtrl.updateOdsById)
router.delete('/:id', [authJwt.verifyToken, authJwt.isAdmin], odsCtrl.deleteOdsById)

export default router;
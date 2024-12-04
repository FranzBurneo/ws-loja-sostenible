import { Router } from 'express'
import * as formsCtrl from '../controllers/forms.controller'
import {authJwt} from "../middlewares"

const router = Router()

router.get('/', formsCtrl.getForms)
router.get('/:formId', formsCtrl.getFormById)
router.post('/', [authJwt.verifyToken, authJwt.isModerator], formsCtrl.createForm)
router.put('/:formId', [authJwt.verifyToken, authJwt.isModerator], formsCtrl.updateFormById)
router.delete('/:formId', [authJwt.verifyToken, authJwt.isModerator], formsCtrl.deleteFormById)

export default router;
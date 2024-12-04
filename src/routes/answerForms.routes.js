import { Router } from 'express'
import * as answeredFormsCtrl from '../controllers/answerForms.controller'
import {authJwt} from "../middlewares"

const router = Router()

router.get('/', answeredFormsCtrl.getForms)
// router.get('/:formId', [authJwt.verifyToken, authJwt.isModerator], answeredFormsCtrl.getResponsesFormById)
router.get('/:formId', answeredFormsCtrl.getResponsesFormById)
router.post('/', answeredFormsCtrl.createResponseForm)
router.put('/:formId', [authJwt.verifyToken, authJwt.isModerator], answeredFormsCtrl.updateFormById)
router.delete('/:formId', [authJwt.verifyToken, authJwt.isModerator], answeredFormsCtrl.deleteFormById)

export default router;
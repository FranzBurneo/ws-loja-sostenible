import { Router } from "express";
import * as authCtrl from '../controllers/auth.controller'
import { verifySignup } from "../middlewares";
import {authJwt} from "../middlewares"
const router = Router()

router.post('/signin', authCtrl.signIn)
router.post('/google', authCtrl.singInWithGoogle)
router.post('/signup', [verifySignup.checkDuplicateUsernameOrEmail, authCtrl.signUp])
router.get('/verifyToken', authJwt.verifyToken2)

export default router;
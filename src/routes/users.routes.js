import { Router } from "express";
import * as usrCtrl from '../controllers/users.controller'
import {authJwt} from "../middlewares"
const router = Router()

router.get('/', [authJwt.verifyToken, authJwt.isAdmin, usrCtrl.getUsers])
router.get('/byToken', [authJwt.verifyToken, usrCtrl.getUserByUserToken])
router.get('/:userId', [authJwt.verifyToken, authJwt.isAdmin, usrCtrl.getUserById])
router.post('/', [authJwt.verifyToken, authJwt.isAdmin, usrCtrl.createUser])
router.put('/byToken', [authJwt.verifyToken, usrCtrl.updateUserByUserToken])
router.put('/:userId', [authJwt.verifyToken, authJwt.isAdmin, usrCtrl.updateUserById])
router.delete('/:userId', [authJwt.verifyToken, authJwt.isAdmin, usrCtrl.deleteUserById])
// router.post('/signup', [verifySignup.checkDuplicateUsernameOrEmail, authCtrl.signUp])

export default router;
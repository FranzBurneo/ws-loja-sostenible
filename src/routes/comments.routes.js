import { Router } from 'express'
import * as commentsCtrl from '../controllers/comments.controller'
import {authJwt} from "../middlewares"

const router = Router()

router.get('/', commentsCtrl.getComments)
router.get('/:postId', commentsCtrl.getCommentByPostId)
router.post('/', [authJwt.verifyToken], commentsCtrl.createComment)
router.post('/:commentId/reply', [authJwt.verifyToken], commentsCtrl.createCommentReply)
router.put('/:commentId', [authJwt.verifyToken], commentsCtrl.updateCommentById)
router.delete('/:commentId', [authJwt.verifyToken], commentsCtrl.deleteCommentById)

export default router;
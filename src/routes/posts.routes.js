import { Router } from 'express'
import * as postsCtrl from '../controllers/posts.controller'
import {authJwt} from "../middlewares"

const router = Router()

router.get('/', postsCtrl.getPosts)
router.get('/ownPosts', [authJwt.verifyToken, authJwt.isModerator], postsCtrl.getPosts)
router.get('/search', postsCtrl.searchPostByParams)
router.get('/:postId', postsCtrl.getPostById)
router.post('/', [authJwt.verifyToken, authJwt.isModerator], postsCtrl.createPost)
router.put('/:postId', [authJwt.verifyToken, authJwt.isModerator], postsCtrl.updatePostById)
router.delete('/:postId', [authJwt.verifyToken, authJwt.isModerator], postsCtrl.deletePostById)

export default router;
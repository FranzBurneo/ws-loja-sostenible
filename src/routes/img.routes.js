import { Router } from 'express'
import * as imgCtrl from '../controllers/img.controller'

const router = Router()

router.post('/', imgCtrl.getImgByname)

export default router;
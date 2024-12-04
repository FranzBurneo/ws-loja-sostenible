import { Router } from 'express'
import * as organizationsCtrl from '../controllers/organizations.controller'
import {authJwt} from "../middlewares"

const router = Router()

router.get('/', organizationsCtrl.getOrganizations)
router.post('/', [authJwt.verifyToken, authJwt.isAdmin], organizationsCtrl.createOrganization)
router.put('/:organizationId', [authJwt.verifyToken, authJwt.isAdmin], organizationsCtrl.updateOrganizationById)
router.delete('/:organizationId', [authJwt.verifyToken, authJwt.isAdmin], organizationsCtrl.deleteOrganizationById)

export default router;
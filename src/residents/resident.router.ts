import { Router } from 'express';
import * as ResidentController from './resident.controller';
import { allow, AllowedRole } from '../middlewares/allow.middleware';
import { uploadCsv } from '../utils/file.util';

const router = Router();
router.get('/file/template', allow(AllowedRole.ADMIN), ResidentController.downloadResidentTemplate);
router.get('/file', allow(AllowedRole.ADMIN), ResidentController.downloadResidentCsv);

router.get('/', allow(AllowedRole.ADMIN), ResidentController.residentList);
router.post('/', allow(AllowedRole.ADMIN), ResidentController.createResident);
router.post('/from-user/:userId', allow(AllowedRole.ADMIN), ResidentController.createResidentFromUser);
router.post('/from-file', allow(AllowedRole.ADMIN), uploadCsv.single('file'), ResidentController.uploadResidentsFromFile);

router.get('/:id', allow(AllowedRole.ADMIN), ResidentController.residentDetail);
router.patch('/:id', allow(AllowedRole.ADMIN), ResidentController.updateResident);
router.delete('/:id', allow(AllowedRole.ADMIN), ResidentController.deleteResident);

export default router;
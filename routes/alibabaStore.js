const express = require('express');
const router = express.Router();
const storeController = require('../controller/storeController');
const Auth = require('../middleware/auth');

router.post('/freight-templates', Auth.authAdminAndStaff, storeController.getAlibabaFreightTemplates);

module.exports = router;

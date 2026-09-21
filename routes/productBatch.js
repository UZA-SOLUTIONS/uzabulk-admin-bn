const express = require('express');
const router = express.Router();
const productBatchController = require('../controller/productBatch');
const Auth = require('../middleware/auth');

// router.post('/create-batch', Auth.authAdmin, productBatchController.addProductBatch);
router.post('/create-batch', productBatchController.addProductBatch);

router.post('/batch-list', productBatchController.getBatchList);

router.get('/batch-details/:id', productBatchController.getBatchDetails);

router.post('/reprocess', productBatchController.reprocessOfferIds);

module.exports = router;
const express = require('express');
const router = express.Router();
const Auth = require('../middleware/auth');
const partnerOrdersController = require('../controller/partnerOrdersController');

// Read-only partner orders API (machine auth via ORDERS_API_KEY header `apikey`)
router.post('/orders', Auth.authPartnerOrders, partnerOrdersController.listOrders);
router.get('/order/:_id', Auth.authPartnerOrders, partnerOrdersController.getOrderById);

module.exports = router;

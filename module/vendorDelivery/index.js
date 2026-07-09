const express = require('express');
const router = express.Router();
const Auth = require('./middleware/auth');
const orderController = require('./controller/orderControllerV2');
const noteController = require('./controller/notes');

router.post('/acceptrequest', Auth.authVendor, orderController.acceptRequestByRestaurant);

router.post('/rejectrequest', Auth.authVendor, orderController.rejectRequest);
router.post('/cancelRequest', Auth.authVendor, orderController.cancelRequest);


router.post('/inprocess', Auth.authVendor, orderController.inProcessOrderByRestaurant);

router.post('/markready', Auth.authVendor, orderController.markOrderReadyByRestaurant);

router.post('/completeorder', Auth.authVendor, orderController.completeOrderByVendor);

router.put('/status/toggle/:id', Auth.authVendor, orderController.statusToggle);


//Notes apis

router.post('/notes/add/:id', Auth.authVendor, noteController.addNotes);
router.put('/notes/add/:id/:noteId', Auth.authVendor, noteController.updateNote);
router.get('/notes/add/:id', Auth.authVendor, noteController.getNotes);
router.delete('/notes/add/:id/:noteId', Auth.authVendor, noteController.deleteNote);


module.exports = router;
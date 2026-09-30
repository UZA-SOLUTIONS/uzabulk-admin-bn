const express = require("express");
const router = express.Router();
const uploadsController = require("../controller/uploadsController");
const Auth = require("../middleware/auth");

router.post("/images", Auth.authAdminAndStaffAndVendor, uploadsController.uploadImages);
router.get("/*", uploadsController.streamFile);

module.exports = router;

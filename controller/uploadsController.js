const multer = require("multer");
const helper = require("../helper/helper");
const gridFsUpload = require("../lib/gridFsUpload");

const imageUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: gridFsUpload.UPLOAD_MAX_FILE_BYTES,
        files: gridFsUpload.UPLOAD_MAX_FILES,
    },
    fileFilter: (req, file, cb) => {
        if (gridFsUpload.IMAGE_MIME_TYPES.includes(file.mimetype)) {
            return cb(null, true);
        }
        return cb(new Error("Invalid image type"));
    },
}).array("files", gridFsUpload.UPLOAD_MAX_FILES);

const uploadImages = (req, res) => {
    imageUpload(req, res, async (err) => {
        try {
            if (err) {
                return res.json(helper.showAWSImageUploadErrorResponse("IMAGE_UPLOAD_ERROR", err.message));
            }
            if (!req.files || !req.files.length) {
                return res.json(helper.showValidationErrorResponse("IMAGE_IS_REQUIRED"));
            }

            const folder = String(req.query.folder || req.body.folder || "products").trim() || "products";
            const items = await gridFsUpload.uploadImages(req.files, folder);
            return res.json(helper.showSuccessResponse("IMAGE_UPLOAD_SUCCESS", { items }));
        } catch (error) {
            console.error("GridFS upload error", error);
            return res.json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
        }
    });
};

const streamFile = async (req, res) => {
    try {
        const publicId = decodeURIComponent(
            String(req.params[0] || req.path || "").replace(/^\//, "")
        );
        if (!publicId) {
            return res.status(404).json(helper.showValidationErrorResponse("NO_DATA_FOUND"));
        }

        const bucket = gridFsUpload.getUploadsBucket();
        const file = await gridFsUpload.gridFsFindByFilename(bucket, publicId);
        if (!file) {
            return res.status(404).json(helper.showValidationErrorResponse("NO_DATA_FOUND"));
        }

        const contentType = file.metadata?.contentType || file.contentType || "application/octet-stream";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        if (file.length) {
            res.setHeader("Content-Length", file.length);
        }

        const downloadStream = bucket.openDownloadStream(file._id);
        downloadStream.on("error", () => {
            if (!res.headersSent) {
                res.status(404).end();
            }
        });
        downloadStream.pipe(res);
    } catch (error) {
        console.error("GridFS stream error", error);
        if (!res.headersSent) {
            res.status(500).json(helper.showInternalServerErrorResponse("INTERNAL_SERVER_ERROR"));
        }
    }
};

module.exports = {
    uploadImages,
    streamFile,
};

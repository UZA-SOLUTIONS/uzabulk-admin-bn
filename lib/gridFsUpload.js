const { randomUUID } = require("crypto");
const { Readable } = require("stream");
const mongoose = require("mongoose");

const GRIDFS_BUCKET_NAME = process.env.GRIDFS_BUCKET_NAME || "uploads";
const UPLOAD_URL_PREFIX = "/authenticationservice/api/v1/uploads";

const ALLOWED_FOLDERS = new Set(["products", "general"]);

const IMAGE_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/pjpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
];

const MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/pjpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/heic": ".heic",
    "image/heif": ".heif",
};

const normalizePublicId = (publicId = "") =>
    String(publicId).replace(/\\/g, "/").replace(/^\/+/, "");

const getPublicBaseUrl = () => {
    const port = process.env.PORT || 3090;
    const configured = (process.env.PUBLIC_UPLOAD_BASE_URL || "").trim();
    const base = configured || `http://localhost:${port}${UPLOAD_URL_PREFIX}`;
    return base.replace(/\/$/, "");
};

const getUploadsBucket = () => {
    const db = mongoose.connection.db;
    if (!db) {
        throw new Error("MongoDB is not connected");
    }
    return new mongoose.mongo.GridFSBucket(db, { bucketName: GRIDFS_BUCKET_NAME });
};

const gridFsDeleteByFilename = async (bucket, filename) => {
    const key = normalizePublicId(filename);
    const matches = await bucket.find({ filename: key }).toArray();
    await Promise.all(matches.map(file => bucket.delete(file._id)));
};

const gridFsUploadBuffer = async (bucket, filename, buffer, metadata = {}) => {
    const key = normalizePublicId(filename);
    await gridFsDeleteByFilename(bucket, key);

    return new Promise((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(key, { metadata });
        Readable.from(buffer)
            .pipe(uploadStream)
            .on("error", reject)
            .on("finish", () => {
                resolve({ bytes: buffer.length, file: uploadStream.id });
            });
    });
};

const gridFsFindByFilename = async (bucket, filename) => {
    const key = normalizePublicId(filename);
    const matches = await bucket.find({ filename: key }).limit(1).toArray();
    return matches[0] || null;
};

const toPublicUrl = (publicId) => `${getPublicBaseUrl()}/${normalizePublicId(publicId)}`;

const extensionForFile = (file) => {
    const fromMime = MIME_TO_EXT[file.mimetype];
    if (fromMime) return fromMime;
    const original = String(file.originalname || "");
    const match = original.match(/\.[a-z0-9]+$/i);
    return match ? match[0].toLowerCase() : ".jpg";
};

const uploadImage = async (file, folder = "products") => {
    if (!file || !file.buffer || !file.buffer.length) {
        throw new Error("Empty file upload");
    }
    const safeFolder = ALLOWED_FOLDERS.has(folder) ? folder : "products";
    const publicId = `${safeFolder}/${randomUUID()}${extensionForFile(file)}`;
    const bucket = getUploadsBucket();
    const { bytes } = await gridFsUploadBuffer(bucket, publicId, file.buffer, {
        contentType: file.mimetype,
        folder: safeFolder,
        originalName: file.originalname,
    });

    return {
        url: toPublicUrl(publicId),
        publicId,
        bytes,
        format: extensionForFile(file).replace(/^\./, ""),
    };
};

const uploadImages = async (files = [], folder = "products") => {
    if (!files.length) return [];
    return Promise.all(files.map(file => uploadImage(file, folder)));
};

module.exports = {
    IMAGE_MIME_TYPES,
    ALLOWED_FOLDERS,
    UPLOAD_MAX_FILE_BYTES: 15 * 1024 * 1024,
    UPLOAD_MAX_FILES: 20,
    getPublicBaseUrl,
    getUploadsBucket,
    normalizePublicId,
    gridFsFindByFilename,
    gridFsDeleteByFilename,
    uploadImage,
    uploadImages,
    toPublicUrl,
};

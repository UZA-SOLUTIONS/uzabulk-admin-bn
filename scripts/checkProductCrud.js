#!/usr/bin/env node
"use strict";

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
let failed = 0;

const assert = (condition, message) => {
    if (!condition) {
        failed += 1;
        console.error(`FAIL: ${message}`);
        return;
    }
    console.log(`ok: ${message}`);
};

const filesToSyntaxCheck = [
    "lib/gridFsUpload.js",
    "controller/uploadsController.js",
    "routes/uploads.js",
    "helper/catalogDefaults.js",
    "middleware/validation/product.js",
    "controller/productController.js",
    "models/productsTable.js",
    "routes/index.js",
    "routes/product.js",
];

const runValidation = async (fn, body, extraReq = {}) => {
    const responses = [];
    const req = { body, isVendor: false, ...extraReq };
    const res = {
        json(payload) {
            responses.push(payload);
            return payload;
        },
    };
    let nextCalled = false;
    await fn(req, res, () => {
        nextCalled = true;
    });
    return { req, responses, nextCalled };
};

const main = async () => {
    console.log("== syntax ==");
    for (const rel of filesToSyntaxCheck) {
        const abs = path.join(root, rel);
        try {
            execFileSync(process.execPath, ["--check", abs], { stdio: "pipe" });
            console.log(`ok: node --check ${rel}`);
        } catch (error) {
            failed += 1;
            console.error(`FAIL: node --check ${rel}`);
            console.error(String(error.stderr || error.message));
        }
    }

    if (typeof global.__ !== "function") {
        global.__ = (message) => message;
    }

    const catalog = require("../helper/catalogDefaults");
    const gridFs = require("../lib/gridFsUpload");

    console.log("\n== catalog defaults ==");
    const created = catalog.applyCatalogDefaults({ name: "Widget" });
    assert(created.type === "simple", "default type is simple");
    assert(created.status === "active", "default status is active");
    assert(created.stock_status === "instock", "default stock_status is instock");
    assert(created.price === 0, "default price is 0");
    assert(Array.isArray(created.images) && created.images.length === 0, "default images is []");
    assert(Array.isArray(created.categories) && created.categories.length === 0, "default categories is []");
    assert(created.vendor === catalog.VENDOR_ID, "admin vendor default is catalog vendor");
    assert(created.storeType === catalog.STORE_TYPE_ID, "admin storeType default is catalog store");
    assert(created.adminSold === true, "adminSold defaults true");
    assert(created.baseCurrency === "CNY", "baseCurrency defaults CNY");
    assert(created.region === "CH", "region defaults CH");

    const vendorBody = catalog.applyCatalogDefaults({ name: "Vendor item" }, { isVendor: true });
    assert(!vendorBody.vendor, "vendor role does not fill catalog vendor");

    const images = catalog.keepImageUrls({
        featured_image: { url: "https://cdn.example/a.jpg" },
        images: ["https://cdn.example/a.jpg", { link: "https://cdn.example/b.jpg" }, ""],
    });
    assert(images.featured_image === "https://cdn.example/a.jpg", "featured_image stays a URL string");
    assert(images.images[1] === "https://cdn.example/b.jpg", "gallery URLs stay strings");

    const firstGallery = catalog.keepImageUrls({
        images: ["https://cdn.example/only.jpg"],
    });
    assert(firstGallery.featured_image === "https://cdn.example/only.jpg", "first gallery image becomes featured");

    console.log("\n== GridFS URL helpers (no Mongo) ==");
    process.env.PUBLIC_UPLOAD_BASE_URL = "http://localhost:3090/authenticationservice/api/v1/uploads";
    const publicId = "products/abc.jpg";
    const storedUrl = gridFs.toPublicUrl(publicId);
    assert(
        storedUrl === "http://localhost:3090/authenticationservice/api/v1/uploads/products/abc.jpg",
        "stored URL matches GET /authenticationservice/api/v1/uploads/{publicId}"
    );
    assert(gridFs.normalizePublicId("/products/abc.jpg") === "products/abc.jpg", "serve path strips leading slash");
    assert(gridFs.IMAGE_MIME_TYPES.includes("image/png"), "png is allowed");
    assert(gridFs.UPLOAD_MAX_FILES === 20, "max 20 files");
    assert(gridFs.UPLOAD_MAX_FILE_BYTES === 15 * 1024 * 1024, "max 15MB");
    try {
        gridFs.getUploadsBucket();
        failed += 1;
        console.error("FAIL: getUploadsBucket should throw without Mongo");
    } catch (error) {
        assert(String(error.message).includes("not connected"), "GridFS bucket refuses to run without Mongo");
    }

    console.log("\n== grocery create/update validation (no DB) ==");
    const Module = require("module");
    const origRequire = Module.prototype.require;
    Module.prototype.require = function mockedRequire(id) {
        if (id === "../../helper/helper") {
            return {
                showValidationErrorResponse: (message) => ({ status: "failure", message }),
                validatePriceTiers: () => ({ valid: true, message: "" }),
            };
        }
        return origRequire.apply(this, arguments);
    };
    const Validation = require("../middleware/validation/product");
    Module.prototype.require = origRequire;

    const nameless = await runValidation(Validation.createProductByGroceryVendor, {});
    assert(!nameless.nextCalled, "create without name does not continue");
    assert(
        nameless.responses[0] && nameless.responses[0].status === "failure",
        "create without name returns failure"
    );

    const createdOk = await runValidation(Validation.createProductByGroceryVendor, {
        name: "Manual catalog product",
    });
    assert(createdOk.nextCalled, "create with name only continues");
    assert(createdOk.req.body.type === "simple", "create fills type");
    assert(createdOk.req.body.status === "active", "create fills status");
    assert(Array.isArray(createdOk.req.body.categories), "create categories is an array");
    assert(Array.isArray(createdOk.req.body.images), "create images is an array");
    assert(createdOk.req.body.price === 0, "create price defaults to 0");
    assert(
        typeof createdOk.req.body.featured_image === "undefined" ||
            typeof createdOk.req.body.featured_image === "string",
        "create featured_image is a URL string or omitted"
    );

    const withUrl = await runValidation(Validation.createProductByGroceryVendor, {
        name: "With image",
        featured_image: "http://localhost:3090/authenticationservice/api/v1/uploads/products/uuid.jpg",
        images: ["http://localhost:3090/authenticationservice/api/v1/uploads/products/uuid.jpg"],
        categories: undefined,
    });
    assert(withUrl.nextCalled, "create with image URL and missing categories continues");
    assert(
        withUrl.req.body.featured_image.startsWith("http://localhost:3090/authenticationservice/api/v1/uploads/"),
        "create keeps GridFS URL"
    );

    const updated = await runValidation(Validation.updateProductByGroceryVendor, {
        _id: "64b000000000000000000001",
        name: "Updated name",
        price: 12,
    });
    assert(updated.nextCalled, "update with name continues");
    assert(updated.req.body.status === "active", "update fills status when omitted");

    const variableBlocked = await runValidation(Validation.createProductByGroceryVendor, {
        name: "Variable empty",
        type: "variable",
        attributes: [],
        variations: [],
    });
    assert(!variableBlocked.nextCalled, "variable create without attributes/variations fails");

    const indexJs = fs.readFileSync(path.join(root, "routes/index.js"), "utf8");
    assert(indexJs.includes("/authenticationservice/api/v1/uploads"), "uploads API is mounted");
    assert(indexJs.includes("app.use('/uploads'"), "short /uploads path is mounted");

    const productRoutes = fs.readFileSync(path.join(root, "routes/product.js"), "utf8");
    assert(productRoutes.includes("/add"), "product add route exists");
    assert(productRoutes.includes("/update"), "product update route exists");
    assert(productRoutes.includes("/archive"), "product archive route exists");

    const controller = fs.readFileSync(path.join(root, "controller/productController.js"), "utf8");
    assert(controller.includes("keepImageUrls"), "create/update keep image URLs");
    assert(controller.includes("data.status = \"archived\""), "archive soft-deletes");

    if (failed) {
        console.error(`\n${failed} check(s) failed`);
        process.exit(1);
    }
    console.log("\nproduct CRUD checks passed");
};

main().catch((error) => {
    console.error("FAIL: product CRUD check threw", error);
    process.exit(1);
});

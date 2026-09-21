const { getProductDetail } = require("./alibaba");
const productBatchTable = require("../models/productBatch");
const productTable = require("../models/productsTable");
const attributeTable = require("../models/attributeTable");
const categoryTable = require("../models/categoryTable");
const attributeTermTable = require("../models/attributeTermsTable");
const productVariantTable = require("../models/productVariationTable");
const _ = require("lodash");
const { updateProductIndex } = require("../lib/elasticSearch");

const STORE_TYPE_ID = "660e3c271095513081ed2223";
const VENDOR_ID = "6625f5426b433d206e538ec2";

const updateProductDetails = async (product, productDetails) => {
    try {
        let productObject = {};

        if (productDetails && productDetails.status == "published") {

            const { topCategoryId = "", secondCategoryId, thirdCategoryId, status, productSkuInfos, subjectTrans, offerId, description, productSaleInfo, productImage, tradeScore, soldOut, productAttribute, mainVideo, detailVideo, sellerOpenId, productShippingInfo } = productDetails;
            const price_tiers = transformPriceRange(productSaleInfo?.priceRangeList || [])

            const [categories, variations] = await Promise.all([
                categoryTable.getExternalCategory([topCategoryId, secondCategoryId, thirdCategoryId]),
                transformAndInsertProductSKUs(VENDOR_ID, productSkuInfos)
            ]);

            productObject = {
                status: status === "published" ? "active" : "inactive",
                categories: categories.map(i => i._id),
                topCategoryId: categories[0]?._id,
                secondCategoryId: categories[1]?._id,
                thirdCategoryId: categories[2]?._id,
                attributes: variations.attributes,
                variations: variations.variations,
                externalProduct: product?._id,
                offerId: offerId,
                storeType: STORE_TYPE_ID,
                vendor: VENDOR_ID,
                name: subjectTrans || productDetails.subject || "",
                type: productSkuInfos?.length ? "variable" : "simple",
                isFeatured: "no",
                short_description: "",
                description: description || "",
                sku: "",
                price: price_tiers[0]?.price,
                compare_price: 0,
                manage_stock: Boolean(productSaleInfo.amountOnSale),
                bestSeller: "yes",
                stock_quantity: productSaleInfo.amountOnSale,
                pricingType: productSaleInfo?.unitInfo?.transUnit,
                stock_status: "instock",
                featured_image: productImage?.images[0],
                images: productImage?.images,
                average_rating: isNaN(tradeScore) ? 0 : parseInt(tradeScore),
                rating_count: 0,
                sold_count: soldOut,
                shippingCharge: 0,
                price_tiers,
                featureAttribute: productAttribute,
                productVideos: {
                    main: mainVideo,
                    detail: detailVideo
                },
                adminSold: true,
                external: true,
                sellerOpenId,
                productShippingInfo,
                last_updated: new Date()
            };
        } else productObject = { last_updated: new Date() };

        let response;
        if (product) response = await productTable.findOneAndUpdate({ _id: product._id }, productObject, { new: true });
        else if (!productObject.name) return null;
        else response = (await productTable.insertMany([productObject]))[0];

        if (response?._id) updateProductIndex(response._id);

        return response;

    } catch (error) { console.error(`Error processing batch`, error); };
};

const transformAndInsertProductSKUs = async (vendor, productSkuInfos) => {
    if (!productSkuInfos) {
        return { variations: [], attributes: [] };
    }

    const variationAttributes = {};
    const variationIds = [];
    const attributes = {};

    const skuPromises = productSkuInfos.map(async (skuInfo) => {
        const productVariationAttributes = [];

        const attrPromises = skuInfo.skuAttributes.map(async (attr) => {
            let attribute = attributes[attr.attributeId] ||
                await attributeTable.findOneAndUpdate(
                    { externalAttrId: attr.attributeId, name: attr.attributeNameTrans, vendor },
                    { externalAttrId: attr.attributeId, storeType: STORE_TYPE_ID, vendor, name: attr.attributeNameTrans, status: "active" },
                    { new: true, upsert: true }
                );

            attributes[attr.attributeId] = attribute;

            const term = await attributeTermTable.findOneAndUpdate(
                { attribute: attribute._id, name: attr.valueTrans },
                { vendor, image: attr.skuImageUrl, attribute: attribute._id, name: attr.valueTrans, status: "active" },
                { new: true, upsert: true }
            );

            if (!variationAttributes[attribute._id]) {
                variationAttributes[attribute._id] = { _id: attribute._id, name: attr.attributeNameTrans, terms: [] };
            }

            if (!variationAttributes[attribute._id].terms.find(termItem => termItem._id.equals(term._id))) {
                variationAttributes[attribute._id].terms.push({ _id: term._id, name: attr.valueTrans, image: attr.skuImageUrl });
            }

            productVariationAttributes.push({ _id: term._id, name: attr.valueTrans });
        });

        await Promise.all(attrPromises);

        const productVariation = {
            specId: skuInfo.specId,
            skuId: skuInfo.skuId,
            description: skuInfo.description,
            image: skuInfo.image,
            sku: skuInfo.sku,
            price: skuInfo.consignPrice,
            compare_price: skuInfo.consignPrice,
            manage_stock: true,
            stock_quantity: skuInfo.amountOnSale,
            stock_status: skuInfo.amountOnSale ? "instock" : "outofstock",
            attributes: productVariationAttributes
        };

        const newProductVariation = await productVariantTable.findOneAndUpdate(
            { skuId: skuInfo.skuId },
            productVariation,
            { new: true, upsert: true }
        );

        variationIds.push(newProductVariation._id);
    });

    await Promise.all(skuPromises);

    return {
        variations: variationIds,
        attributes: Object.values(variationAttributes)
    };
}

function transformPriceRange(priceRangeList) {
    if (_.isEmpty(priceRangeList)) return [];

    const sortedPriceRangeList = _.sortBy(priceRangeList, 'startQuantity');

    return _.map(sortedPriceRangeList, range => ({
        minQty: range.minQuantity,
        maxQty: range.maxQuantity,
        price: range.price,
        startQuantity: range.startQuantity
    }));
};

const toPlain = (doc) => {
    if (!doc) return null;
    return typeof doc.toObject === "function" ? doc.toObject() : doc;
};

const refreshBatchStatus = async (batchId) => {
    const batch = await productBatchTable.findById(batchId).select("productIds.status").lean();
    if (!batch) return;
    const lines = batch.productIds || [];
    const hasProcessing = lines.some(item => item.status === "processing");
    const hasFailed = lines.some(item => item.status === "failed");
    const status = hasProcessing ? "processing" : (hasFailed ? "failed" : "completed");
    await productBatchTable.updateOne({ _id: batchId }, { status });
};

const importOfferId = async (offerId) => {
    const existing = await productTable.findOne({ offerId }).lean();
    const fromAlibaba = await getProductDetail(offerId);
    const saved = await updateProductDetails(existing, fromAlibaba.product);
    const productDetails = toPlain(saved);
    const savedName = String(productDetails?.name || fromAlibaba.product?.subjectTrans || "").trim();
    const status = !savedName ? "failed" : (existing ? "already exist" : "completed");
    const processedAt = new Date();

    await productBatchTable.updateMany(
        { "productIds.offerId": offerId },
        {
            $set: {
                "productIds.$[line].status": status,
                "productIds.$[line].processedAt": processedAt,
                "productIds.$[line].productDetails": productDetails
            }
        },
        { arrayFilters: [{ "line.offerId": offerId }] }
    );

    const batches = await productBatchTable.find({ "productIds.offerId": offerId }).select("_id").lean();
    await Promise.all(batches.map(batch => refreshBatchStatus(batch._id)));

    return {
        offerId,
        status,
        name: savedName,
        productDetails,
        processedAt,
        alibaba: {
            api: fromAlibaba.api,
            error: fromAlibaba.error,
            raw: fromAlibaba.raw
        }
    };
};

const processOfferIds = async (offerIds = []) => {
    const ids = offerIds.map(id => String(id)).filter(Boolean);
    console.log("Product Batch Processing now...", ids);
    const results = [];
    for (const offerId of ids) {
        results.push(await importOfferId(offerId));
    }
    console.log("Product Batch Processing Completed", results.map(item => ({
        offerId: item.offerId,
        status: item.status,
        name: item.name,
        error: item.alibaba?.error || null
    })));
    return results;
};

const processNextProcessingBatch = async () => {
    const batch = await productBatchTable.findOne({ status: "processing" })
        .sort({ createdAt: 1 })
        .select("_id productIds")
        .lean();
    if (!batch) return null;

    const offerIds = (batch.productIds || [])
        .filter(item => !item.status || item.status === "processing")
        .map(item => item.offerId)
        .filter(Boolean);

    if (!offerIds.length) {
        await refreshBatchStatus(batch._id);
        return [];
    }

    return processOfferIds(offerIds);
};

module.exports = {
    processOfferIds,
    processNextProcessingBatch,
    importOfferId
};

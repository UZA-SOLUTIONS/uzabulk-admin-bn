const { getProductDetail } = require("../../helper/alibaba");
const productBatchTable = require("../../models/productBatch");
const productTable = require("../../models/productsTable");
const attributeTable = require("../../models/attributeTable");
const categoryTable = require("../../models/categoryTable");
const attributeTermTable = require("../../models/attributeTermsTable");
const productVariantTable = require("../../models/productVariationTable");

const _ = require("lodash");
const { updateProductIndex } = require("../../lib/elasticSearch");
const STORE_TYPE_ID = "660e3c271095513081ed2223";

const updateProductDetails = async (product, productDetails) => {
    try {
        let productObject = {};

        if (productDetails && productDetails.status == "published") {

            const { topCategoryId = "", secondCategoryId, thirdCategoryId, status, productSkuInfos, subjectTrans, offerId, description, productSaleInfo, productImage, tradeScore, soldOut, productAttribute, mainVideo, detailVideo, sellerOpenId, productShippingInfo } = productDetails;
            const price_tiers = transformPriceRange(productSaleInfo?.priceRangeList || [])

            const [categories, variations] = await Promise.all([
                categoryTable.getExternalCategory([topCategoryId, secondCategoryId, thirdCategoryId]),
                transformAndInsertProductSKUs("6625f5426b433d206e538ec2", productSkuInfos)
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
                storeType: "660e3c271095513081ed2223",
                vendor: "6625f5426b433d206e538ec2",
                name: subjectTrans || "",
                type: productSkuInfos?.length ? "variable" : "simple",
                isFeatured: "no",
                short_description: "",
                description: description || "",
                sku: "", // Consider adding SKU logic if needed
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

            console.log(productObject, "productObject")
        } else productObject = { deleted_at: new Date(), status: "archived", last_updated: new Date() };

        let response;
        if (product) response = await productTable.findOneAndUpdate({ _id: product._id }, productObject, { new: true });
        else response = (await productTable.insertMany([productObject]))[0];

        updateProductIndex(response._id);

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

module.exports = (agenda) => {

    agenda.define("productBatchProcess", { priority: "high", concurrency: 10 }, async (job, done) => {
        console.log("Product Batch Processing...")
        try {

            const updatedProductIds = [];
            const batch = await productBatchTable.findOne({ status: "processing" })
                .select("_id productIds")
                .lean();
            if (batch) {

                for (let productId of batch.productIds) {

                    let productDetailsFromDB = await productTable.findOne({ offerId: productId.offerId }).lean();
                    let productDetailsFromALiBaba = await getProductDetail(productId.offerId);

                    if (productDetailsFromDB) {

                        productId.status = "already exist"
                    } else {

                        productId.status = "completed"

                    }
                    productId.productDetails = await updateProductDetails(productDetailsFromDB, productDetailsFromALiBaba)
                    updatedProductIds.push(productId);
                };

                const isComplted = updatedProductIds.every(x => x.status != "processing");
                await productBatchTable.updateOne({ _id: batch._id }, { productIds: updatedProductIds, status: isComplted ? "completed" : "processing" })
            };
            console.log("Product Batch Processing Completed")
            done();
        } catch (error) {
            console.log("errror", error)
        }
    });
};
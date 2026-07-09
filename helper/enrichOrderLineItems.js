const mongoose = require('mongoose');
const Product = require('../models/productsTable');
const productVariationTable = require('../models/productVariationTable');

const toItemsArray = line_items => {
    if (!line_items) return [];
    if (Array.isArray(line_items)) return line_items;
    if (typeof line_items === 'object') return Object.values(line_items);
    return [];
};

const resolveProductId = item =>
    item?.product || item?.productId || item?.product_id || item?.itemId || null;

/**
 * Attach catalog snapshot (sku, description, categories, etc.) to each order line item for admin order view.
 */
module.exports.enrichOrderLineItems = async line_items => {
    const items = toItemsArray(line_items);
    if (!items.length) return line_items;

    const productIds = [
        ...new Set(
            items
                .map(resolveProductId)
                .filter(id => id && mongoose.Types.ObjectId.isValid(id))
                .map(id => mongoose.Types.ObjectId(id))
        ),
    ];

    let productsById = {};
    if (productIds.length) {
        const products = await Product.find({ _id: { $in: productIds } })
            .select(
                'name sku short_description description price compare_price categories brand veganType type status'
            )
            .populate({ path: 'categories', select: 'catName' })
            .populate({ path: 'brand', select: 'name' })
            .lean();

        productsById = products.reduce((acc, p) => {
            acc[String(p._id)] = p;
            return acc;
        }, {});
    }

    const variationIds = [
        ...new Set(
            items
                .map(item => item?.variation_id)
                .filter(id => id && mongoose.Types.ObjectId.isValid(id))
                .map(id => mongoose.Types.ObjectId(id))
        ),
    ];

    let variationsById = {};
    if (variationIds.length) {
        const variations = await productVariationTable
            .find({ _id: { $in: variationIds } })
            .select('sku price attributes')
            .lean();

        variationsById = variations.reduce((acc, v) => {
            acc[String(v._id)] = v;
            return acc;
        }, {});
    }

    const enriched = items.map(item => {
        const productId = resolveProductId(item);
        const product = productId ? productsById[String(productId)] : null;
        const variation = item?.variation_id
            ? variationsById[String(item.variation_id)]
            : null;

        const categoryNames = (product?.categories || [])
            .map(c => (typeof c === 'string' ? c : c?.catName))
            .filter(Boolean);

        return {
            ...item,
            productDetails: product
                ? {
                      sku: product.sku || null,
                      short_description: product.short_description || null,
                      description: product.description || null,
                      compare_price: product.compare_price ?? null,
                      catalogPrice: product.price ?? null,
                      categories: categoryNames,
                      brand: product.brand?.name || null,
                      veganType: product.veganType || null,
                      type: product.type || null,
                      status: product.status || null,
                  }
                : null,
            variationDetails: variation
                ? {
                      sku: variation.sku || null,
                      catalogPrice: variation.price ?? null,
                      attributes: variation.attributes || [],
                  }
                : null,
        };
    });

    return Array.isArray(line_items) ? enriched : enriched;
};

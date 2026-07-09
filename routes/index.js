const moduleConfig = require('../config/moduleConfig');

module.exports = function (app) {

    const store = require('./store');
    app.use('/authenticationservice/api/v1/store', store);

    const faq = require('./faq');
    app.use('/authenticationservice/api/v1/faq', faq);

    const promocode = require('./promocode');
    app.use('/authenticationservice/api/v1/promocode', promocode);

    const content = require('./content');
    app.use('/authenticationservice/api/v1/content', content);

    const pages = require('./pages');
    app.use('/authenticationservice/api/v1/pages', pages);

    const vendor = require('./vendor');
    app.use('/authenticationservice/api/v1/vendor', vendor);

    const address = require('./address');
    app.use('/authenticationservice/api/v1/address', address);

    const setting = require('./setting');
    app.use('/authenticationservice/api/v1/setting', setting);

    const promotion = require('./promotion');
    app.use('/authenticationservice/api/v1/promotion', promotion);

    const category = require('./category');
    app.use('/authenticationservice/api/v1/category', category);

    const addon = require('./addon');
    app.use('/authenticationservice/api/v1/addon', addon);

    const cuisine = require('./cuisine');
    app.use('/authenticationservice/api/v1/cuisine', cuisine);

    const businessType = require('./businessType');
    app.use('/authenticationservice/api/v1/businessType', businessType);

    const product = require('./product');
    app.use('/authenticationservice/api/v1/product', product);

    const attribute = require('./attribute');
    app.use('/authenticationservice/api/v1/attribute', attribute);

    const attributeTerm = require('./attributeTerm');
    app.use('/authenticationservice/api/v1/term', attributeTerm);

    const file = require('./file');
    app.use('/authenticationservice/api/v1/file', file);

    const docTemplate = require('./docTemplate');
    app.use('/authenticationservice/api/v1/doctemplate', docTemplate);

    const superAdmin = require('./superAdmin')
    app.use('/authenticationservice/api/v1/super-admin', superAdmin);

    const terminology = require('./terminology');
    app.use('/authenticationservice/api/v1/terminology', terminology);

    const productBatch = require('./productBatch');
    app.use('/authenticationservice/api/v1/product-batch', productBatch);

    moduleConfig.forEach(element => {
        if (element.status && element.route) {
            let path = require('../module/' + element.type);
            app.use('/authenticationservice/api/' + element.apiVersion + '/' + element.routeName, path);
        }
    });

};
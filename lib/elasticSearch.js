const axios = require('axios');
module.exports.updateProductIndex = (id) => {
    axios.get(process.env.ES_SERVICE_URL + "/products/addToES/" + id);
}
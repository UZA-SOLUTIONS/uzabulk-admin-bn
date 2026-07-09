const moduleConfig = [
    {
        "type": "marketing",
        "status": true,
        "apiVersion": "v1",
        "route": true,
        "routeName": "campaign"
    },
    {
        "type": "postmates",
        "status": true,
        "route": false
    },
    {
        "type": "importExport",
        "apiVersion": "v1",
        "status": true,
        "route": true,
        "routeName": "csv"
    },
    {
        "type": "menu",
        "apiVersion": "v1",
        "status": true,
        "route": true,
        "routeName": "menu"
    },
    {
        "type": "orderDelivery",
        "apiVersion": "v2",
        "status": true,
        "route": true,
        "routeName": "order"
    },
    {
        "type": "vendorDelivery",
        "apiVersion": "v2",
        "status": true,
        "route": true,
        "routeName": "vendor"
    },
    {
        "type": "orderDispute",
        "apiVersion": "v1",
        "status": true,
        "route": true,
        "routeName": "dispute"
    }
]
module.exports = moduleConfig;
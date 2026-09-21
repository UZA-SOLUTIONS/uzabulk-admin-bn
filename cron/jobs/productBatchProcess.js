const { processNextProcessingBatch } = require("../../helper/productBatchImport");

module.exports = (agenda) => {

    agenda.define("productBatchProcess", { priority: "high", concurrency: 10 }, async (job, done) => {
        console.log("Product Batch Processing...")
        try {
            await processNextProcessingBatch();
            console.log("Product Batch Processing Completed")
            done();
        } catch (error) {
            console.log("errror", error)
            done(error);
        }
    });
};

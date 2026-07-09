const { pollActiveShipmentOrders } = require('../../helper/alibabaLogisticsPoller');

module.exports = (agenda) => {
    agenda.define(
        'alibabaLogisticsPoll',
        { priority: 'normal', concurrency: 1 },
        async (job, done) => {
            console.log('1688 logistics trace poll started');
            try {
                const summary = await pollActiveShipmentOrders();
                console.log('1688 logistics trace poll finished', summary);
                done();
            } catch (error) {
                console.log('alibabaLogisticsPoll error', error?.message || error);
                done(error);
            }
        }
    );
};

const axios = require('axios');

let nearByDriverSocket = async (users, resdata) => {
    try {
        let socketUrlApi = env.socketUrlApi + '/request/nearby/socket';

        let request = await axios({
            method: 'post',
            url: socketUrlApi,
            data: {
                users: users,
                resdata: resdata
            }
        });
    } catch (error) {
        console.log("nearByDriverSocket err", error);
    }
}

let singleSocket = async (channelId, userType, resdata, listen) => {
    const socketUrlApi = env.socketUrlApi + '/request/single/socket';
    try {
        await axios({
            method: 'post',
            url: socketUrlApi,
            data: {
                channelId: channelId,
                userType: userType,
                resdata: resdata,
                listen: listen ? listen : ''
            },
            timeout: 5000,
        });
    } catch (error) {
        const status = error?.response?.status;
        console.warn(
            "singleSocket:",
            status ? `HTTP ${status}` : error.code || error.message,
            socketUrlApi
        );
    }
}

module.exports = {
    nearByDriverSocket,
    singleSocket
}
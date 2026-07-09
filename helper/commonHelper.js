module.exports.toFixedNumber = (number, toFix = 2) => {
    let parsedNumber = parseFloat(number);
    let multiplier = Math.pow(10, toFix);

    let value = parsedNumber < (1 / multiplier) && parsedNumber > 0
        ? Math.floor(parsedNumber * Math.pow(10, 3)) / Math.pow(10, 3)
        : Math.floor(parsedNumber * multiplier) / multiplier;

    return value;
};

module.exports.toFixedAdminCommission = (amount, commission, toFix = 2) => {
    if (!commission) return module.exports.toFixedNumber(amount, toFix);
    return module.exports.toFixedNumber(amount / (1 + commission / 100), toFix);
};
const sendEmail = require('./emailService');

module.exports = sendEmail;
module.exports.sendEmail = sendEmail;
module.exports.sendBookingConfirmationEmail = sendEmail.sendBookingConfirmationEmail;

const request = require('request')
const path = require('path')
const fs = require('fs');
const mailgun = require('mailgun-js');

module.exports.sendEmail = function (mailgunKey, to, sub, msg, attachmentFile) {
  try {
    let from = env.mailgun.MAILGUN_FROM;
    let api_key = env.mailgun.MAILGUN_API_KEY;
    let domain = env.mailgun.MAILGUN_DOMAIN;

    if (mailgunKey && typeof mailgunKey === 'object') {
      const { MAILGUN_FROM, MAILGUN_API_KEY, MAILGUN_DOMAIN } = mailgunKey;
      const isValid = MAILGUN_FROM && MAILGUN_API_KEY && MAILGUN_DOMAIN;

      if (isValid) {
        from = MAILGUN_FROM;
        api_key = MAILGUN_API_KEY;
        domain = MAILGUN_DOMAIN;
      }
    }

    // Initialize Mailgun with the API key and domain
    const mg = mailgun({ apiKey: api_key, domain: domain });

    // Define the email data
    let data = {
      from: from,
      to: to,
      subject: sub,
      html: `<div class="es-wrapper-color" style="background-color: #f2f4f6;">${msg}</div>`
    };

    // Add attachment if provided
    if (attachmentFile) {
      data.attachment = new mg.Attachment({ data: attachmentFile });
    }

    // Send the email
    mg.messages().send(data, function (error, body) {
      if (error) {
        console.error('Mailgun error:', error);
        return false;
      } else {
        console.log('Mailgun send message success:', body);
        return true;
      }
    });
  } catch (error) {
    console.error("sendEmail error:", error);
  }
};

module.exports.sendSupportEmail = function (mailgunKey, to, sub, msg) {

  let from = env.mailgun.MAILGUN_FROM;
  let api_key = env.mailgun.MAILGUN_API_KEY;
  let domain = env.mailgun.MAILGUN_DOMAIN;

  if (mailgunKey != undefined && mailgunKey != {}) {
    from = mailgunKey.MAILGUN_FROM ? mailgunKey.MAILGUN_FROM : env.mailgun.MAILGUN_FROM;
    api_key = mailgunKey.MAILGUN_API_KEY ? mailgunKey.MAILGUN_API_KEY : env.mailgun.MAILGUN_API_KEY;
    domain = mailgunKey.MAILGUN_DOMAIN ? mailgunKey.MAILGUN_DOMAIN : env.mailgun.MAILGUN_DOMAIN;
  }

  const mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });

  let data = {
    from: from,
    to: to,
    subject: sub,
    html: msg
  };

  mailgun.messages().send(data, function (error, body) {
    if (error) {
      console.log('Mail gun error', error);
      return true;
    } else {
      console.log('Mail gun send mesg success', body);
      return true;
    }
  });

}

module.exports.sendEmailToSuperadmin = function (to, sub, msg) {

  let from = env.mailgun.MAILGUN_FROM;
  let api_key = env.mailgun.MAILGUN_API_KEY;
  let domain = env.mailgun.MAILGUN_DOMAIN;

  const mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });

  let data = {
    from: from,
    to: to,
    subject: sub,
    html: msg
  };

  mailgun.messages().send(data, function (error, body) {
    if (error) {
      console.log('Mail gun error', error);
      return true;
    } else {
      console.log('Mail gun send mesg success', body);
      return true;
    }
  });

}
module.exports.sendEmailWithAttachment = function (mailgunKey, to, sub, msg, file, filename) {
  try {
    let from = env.mailgun.MAILGUN_FROM;
    let api_key = env.mailgun.MAILGUN_API_KEY;
    let domain = env.mailgun.MAILGUN_DOMAIN;

    if (mailgunKey != undefined && mailgunKey != {}) {
      from = mailgunKey.MAILGUN_FROM;
      api_key = mailgunKey.MAILGUN_API_KEY;
      domain = mailgunKey.MAILGUN_DOMAIN;
    }

    const mailgun = require('mailgun-js')({ apiKey: api_key, domain: domain });

    var attch = new mailgun.Attachment({ data: Buffer.from(file), filename: filename, contentType: "text/csv" });

    let data = {
      from: from,
      to: to,
      subject: sub,
      html: `<div cattchlass="es-wrapper-color" style="background-color: #f2f4f6;">${msg}</div>`,
      attachment: attch
    };
    console.log("mailgun data :", data);

    mailgun.messages().send(data, function (error, body) {
      if (error) {
        console.log('Mail gun error', error);
        return true;
      } else {
        console.log('Mail gun send mesg success', body);
        return true;
      }
    });
  } catch (error) {
    console.log("catch error :", error);

  }
}
class ApiObjectFormatter {
  header(obj) {
    if (obj.__type !== "api") {
      return null;
    }
    const method = obj.method.toUpperCase();
    const methodColor = {
      POST: "blue",
      PUT: "darkgoldenrod",
      PATCH: "salmon",
      GET: "green",
      DELETE: "red",
    }[method];
    const status = obj.status;
    const isOkay = status >= 200 && status < 300;
    const color = isOkay ? "green" : "red";
    return [
      "div",
      {},
      [
        "span",
        {
          style: `color: ${methodColor}; font-weight: bold;`,
        },
        `[${obj.method.toUpperCase()}]`,
      ],
      ["span", {}, ` ${obj.url}`],
      ["span", { style: `color: ${color};` }, ` [${obj.status}]`],
      ["span", { style: `color: slategrey;` }, ` (${obj.ms} ms)`],
    ];
  }

  hasBody(obj) {
    return obj.response || obj.payload || obj.message;
  }

  body(obj) {
    const requestRef = ["object", { object: obj.payload }];
    const responseRef = ["object", { object: obj.response }];

    return [
      "div",
      { style: "padding-left: 20px; padding-top: 5px;" },
      obj.message
        ? [
            "div",
            {},
            ["span", { style: "font-weight: bold;" }, "Message: "],
            ["span", {}, obj.message],
          ]
        : null,
      obj.payload
        ? [
            "div",
            {},
            ["span", { style: "font-weight: bold;" }, "Payload: "],
            ["span", {}, requestRef],
          ]
        : null,
      obj.response
        ? [
            "div",
            {},
            ["span", { style: "font-weight: bold;" }, "Response: "],
            ["span", {}, responseRef],
          ]
        : null,
    ].filter(Boolean);
  }
}

window.devtoolsFormatters = window.devtoolsFormatters || [];
window.devtoolsFormatters.push(new ApiObjectFormatter());

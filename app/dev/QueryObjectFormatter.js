class QueryObjectFormatter {
  header(obj) {
    if (obj.__type !== "query") {
      return null;
    }

    const color = levelToColor(obj.level);

    return [
      "div",
      {},
      ["span", { style: `color: ${color}; font-weight: bold;` }, "[QUERY]"],
      ["span", {}, ` ${obj.query}`],
      ["span", { style: `color: slategray;` }, ` (${obj.ms} ms)`],
    ];
  }

  hasBody(obj) {
    return obj.data || (obj.params?.length ?? 0) > 0;
  }

  body(obj) {
    return [
      "div",
      { style: "padding-left: 20px; padding-top: 5px;" },
      obj.params.length > 0
        ? [
            "div",
            {},
            ["span", { style: "font-weight: bold;" }, "Params: "],
            ["span", {}, ["object", { object: shiftIndices(obj.params) }]],
          ]
        : null,
      obj.data
        ? [
            "div",
            {},
            ["span", { style: "font-weight: bold;" }, "Data: "],
            ["span", {}, ["object", { object: obj.data }]],
          ]
        : null,
    ].filter(Boolean);
  }
}

function shiftIndices(arr) {
  const obj = {};
  for (let i = 0; i < arr.length; i++) {
    obj[i + 1] = arr[i];
  }
  return obj;
}

function levelToColor(level) {
  level = String(level);
  const logLevelColors = {
    debug: "#009688", // teal
    info: "#2196F3", // blue
    http: "#628a28", // light green
    warn: "#b78c00", // amber
    error: "#F44336", // red
    verbose: "#777777", // gray
    silly: "#9C27B0", // purple
  };
  if (!level) {
    return logLevelColors.info;
  }

  return logLevelColors[level.toLowerCase()] ?? logLevelColors.info;
}

window.devtoolsFormatters = window.devtoolsFormatters || [];
window.devtoolsFormatters.push(new QueryObjectFormatter());

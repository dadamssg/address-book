class SimpleObjectFormatter {
  header(obj) {
    const { level, message, ...rest } = obj;
    if (!(typeof level === "string" && typeof message === "string")) {
      return null;
    }
    const color = levelToColor(level);

    return [
      "div",
      {},
      [
        "span",
        { style: `color: ${color}; font-weight: bold;` },
        `[${level.toUpperCase()}]`,
      ],
      ["span", { style: "padding-left: 5px; padding-right: 5px;" }, message],
      Object.keys(rest).length > 0 ? ["object", { object: rest }] : null,
    ].filter(Boolean);
  }

  hasBody(obj) {
    return false;
  }
}

function levelToColor(level) {
  const logLevelColors = {
    debug: "#009688", // teal
    info: "#2196F3", // blue
    http: "#628a28", // light green
    warn: "#b78c00", // amber
    error: "#F44336", // red
    verbose: "#777777", // gray
    silly: "#9C27B0", // purple
  };

  return logLevelColors[level.toLowerCase()] ?? logLevelColors.debug;
}

window.devtoolsFormatters = window.devtoolsFormatters || [];
window.devtoolsFormatters.push(new SimpleObjectFormatter());

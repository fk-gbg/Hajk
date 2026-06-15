import { Stroke, Style, Circle, Fill } from "ol/style.js";
export function getSketchStyle() {
  return [
    new Style({
      fill: new Fill({
        color: "rgba(255, 0, 0, 0.1)",
      }),
      stroke: new Stroke({
        color: "rgba(200, 0, 0, 1)",
        width: 2,
      }),
      image: new Circle({
        radius: 6,
        fill: new Fill({
          color: "rgba(0, 0, 0, 0.1)",
        }),
        stroke: new Stroke({
          color: "rgba(255, 255, 255, 0.5)",
          width: 2,
        }),
      }),
    }),
  ];
}

/**Style for highlighted (selected) features */
export function getHighlightStyle() {
  return [
    new Style({
      fill: new Fill({
        color: "rgba(0, 255, 0, 0.1)",
      }),
      stroke: new Stroke({
        color: "rgba(0, 200, 0, 1)",
        width: 2,
      }),
      image: new Circle({
        radius: 6,
        fill: new Fill({
          color: "rgba(0, 0, 0, 0.5)",
        }),
        stroke: new Stroke({
          color: "rgba(255, 255, 255, 0.5)",
          width: 2,
        }),
      }),
    }),
  ];
}

/**Style for hidden features */
export function getHiddenStyle() {
  return [
    new Style({
      stroke: new Stroke({
        color: "rgba(0, 0, 0, 0)",
        width: 0,
      }),
      fill: new Fill({
        color: "rgba(1, 2, 3, 0)",
      }),
      image: new Circle({
        fill: new Fill({
          color: "rgba(0, 0, 0, 0)",
        }),
        stroke: new Stroke({
          color: "rgba(0, 0, 0, 0)",
          width: 0,
        }),
        radius: 0,
      }),
    }),
  ];
}

export function getStyleFromValues(strokeColor, fillColor, strokeWidth) {
  return [
    new Style({
      stroke: new Stroke({
        color: strokeColor ?? "rgba(255, 0, 0, 1)",
        width: strokeWidth ?? 2,
      }),
      fill: new Fill({
        color: fillColor ?? "rgba(200, 0, 0, 0.1)",
      }),
      image: new Circle({
        fill: new Fill({
          color: fillColor ?? "rgba(200, 0, 0, 0.1)",
        }),
        stroke: new Stroke({
          color: strokeColor ?? "rgba(255, 0, 0, 1)",
          width: strokeWidth ?? 2,
        }),
        radius: 6,
      }),
    }),
  ];
}

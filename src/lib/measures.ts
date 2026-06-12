// ─────────────────────────────────────────────────────────────────────────────
// Standard kitchen volume measures → millilitres. Combined with an ingredient's
// density (g/ml), any of these converts to grams:  grams = ml × density.
//
// Two systems are provided because recipes use both. US customary is the default
// (most common online); metric spoons/cups are exact round numbers.
// ─────────────────────────────────────────────────────────────────────────────

export interface VolumeMeasure {
  label: string;
  ml: number;
  system: "us" | "metric" | "common";
}

export const VOLUME_MEASURES: VolumeMeasure[] = [
  // Common small measures (US customary spoons are the everyday default)
  { label: "1 teaspoon (tsp)", ml: 4.92892, system: "us" },
  { label: "1 dessertspoon", ml: 10, system: "common" },
  { label: "1 tablespoon (tbsp)", ml: 14.7868, system: "us" },
  { label: "1 fluid ounce (fl oz)", ml: 29.5735, system: "us" },

  // Cups (US customary = 236.588 ml) and fractions
  { label: "1/8 cup", ml: 29.5735, system: "us" },
  { label: "1/4 cup", ml: 59.1471, system: "us" },
  { label: "1/3 cup", ml: 78.8627, system: "us" },
  { label: "1/2 cup", ml: 118.294, system: "us" },
  { label: "2/3 cup", ml: 157.725, system: "us" },
  { label: "3/4 cup", ml: 177.441, system: "us" },
  { label: "1 cup (US)", ml: 236.588, system: "us" },

  // Larger US measures
  { label: "1 pint (US)", ml: 473.176, system: "us" },
  { label: "1 quart (US)", ml: 946.353, system: "us" },
  { label: "1 gallon (US)", ml: 3785.41, system: "us" },

  // Metric exact
  { label: "1 millilitre (ml)", ml: 1, system: "metric" },
  { label: "1 metric teaspoon", ml: 5, system: "metric" },
  { label: "1 metric tablespoon", ml: 15, system: "metric" },
  { label: "1 metric cup", ml: 250, system: "metric" },
  { label: "1 decilitre (100 ml)", ml: 100, system: "metric" },
  { label: "1 litre (1000 ml)", ml: 1000, system: "metric" },
];

export const SYSTEM_LABEL: Record<VolumeMeasure["system"], string> = {
  us: "US customary",
  metric: "Metric",
  common: "Common",
};

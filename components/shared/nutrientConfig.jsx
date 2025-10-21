export const nutrientConfig = {
  defaultSelected: {
    energy_kcal: true,
    protein_g: true,
    carbohydrate_g: true,
    lipid_g: true,
    fiber_g: true,
    humidity_percents: false,
    ashes_g: false,
    calcium_mg: false,
    magnesium_mg: false,
    manganese_mg: false,
    phosphorus_mg: false,
    iron_mg: false,
    sodium_mg: false,
    potassium_mg: false,
    copper_mg: false,
    zinc_mg: false
  },
  
  expandedCategories: ["Composição Centesimal"],
  
  nutrientCategories: {
    "Composição Centesimal": [
      "humidity_percents",
      "energy_kcal",
      "protein_g",
      "carbohydrate_g",
      "lipid_g",
      "fiber_g",
      "ashes_g"
    ],
    "Minerais": [
      "calcium_mg",
      "magnesium_mg",
      "manganese_mg",
      "phosphorus_mg",
      "iron_mg",
      "sodium_mg",
      "potassium_mg",
      "copper_mg",
      "zinc_mg"
    ]
  },
  
  nutrientNames: {
    humidity_percents: "Umidade",
    energy_kcal: "Valor Energético (kcal)",
    protein_g: "Proteínas",
    carbohydrate_g: "Carboidratos",
    lipid_g: "Gorduras Totais",
    fiber_g: "Fibra Alimentar",
    ashes_g: "Cinzas",
    calcium_mg: "Cálcio",
    magnesium_mg: "Magnésio",
    manganese_mg: "Manganês",
    phosphorus_mg: "Fósforo",
    iron_mg: "Ferro",
    sodium_mg: "Sódio",
    potassium_mg: "Potássio",
    copper_mg: "Cobre",
    zinc_mg: "Zinco"
  },
  
  nutrientUnits: {
    energy_kcal: "kcal",
    protein_g: "g",
    carbohydrate_g: "g",
    lipid_g: "g",
    fiber_g: "g",
    humidity_percents: "%",
    ashes_g: "g",
    calcium_mg: "mg",
    magnesium_mg: "mg",
    manganese_mg: "mg",
    phosphorus_mg: "mg",
    iron_mg: "mg",
    sodium_mg: "mg",
    potassium_mg: "mg",
    copper_mg: "mg",
    zinc_mg: "mg"
  }
};
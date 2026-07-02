export default function handler(req, res) {
  res.status(200).json({
    usda: !!process.env.USDA_API_KEY,
    spoonacular: !!process.env.SPOONACULAR_API_KEY,
    openFoodFacts: true,
  });
}
